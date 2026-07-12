"""Service layer for corporate sales registries and revenue-proportional overhead allocation (Phase 14)."""

from __future__ import annotations

from typing import Optional
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from pymongo.errors import DuplicateKeyError

from app.auth import require_manage_permission, get_subtree_ids
from app.models.common import utcnow
from app.services.product import get_product


# ---------------------------------------------------------------------------
# SALES CRUD
# ---------------------------------------------------------------------------

async def list_sales(
    db: AsyncIOMotorDatabase,
    org_id: ObjectId,
    product_id: Optional[ObjectId] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
) -> list[dict]:
    query = {"org_id": org_id}
    if product_id:
        query["product_id"] = product_id
    if year:
        query["period.year"] = year
    if month:
        query["period.month"] = month

    return await db.product_sales.find(query).sort([("period.year", -1), ("period.month", -1)]).to_list(1000)


async def record_sale(db: AsyncIOMotorDatabase, user: dict, data) -> dict:
    org_id = user["org_id"]
    product_id = ObjectId(str(data.product_id))

    # Validate product exists and belongs to organization
    prod = await get_product(db, org_id, str(product_id))
    dept_id = prod.get("department_id")

    await require_manage_permission(user, dept_id)

    period = data.period
    # Enforce unique period+product constraints
    dup = await db.product_sales.find_one({
        "org_id": org_id,
        "product_id": product_id,
        "period.year": period.year,
        "period.month": period.month,
    })
    if dup:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Sales entry for this product and period already exists; use PATCH to modify",
        )

    revenue_amount = data.units_sold * data.unit_price.amount
    now = utcnow()
    doc = {
        "org_id": org_id,
        "product_id": product_id,
        "department_id": dept_id,
        "period": period.model_dump(),
        "units_sold": data.units_sold,
        "unit_price": data.unit_price.model_dump(),
        "revenue": {
            "amount": revenue_amount,
            "currency": data.unit_price.currency,
        },
        "created_at": now,
        "updated_at": now,
    }

    try:
        res = await db.product_sales.insert_one(doc)
    except DuplicateKeyError:
        # Concurrent insert for the same product+period
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Sales entry for this product and period already exists; use PATCH to modify",
        )
    doc["_id"] = res.inserted_id
    return doc


async def update_sale(db: AsyncIOMotorDatabase, user: dict, sale_id_str: str, data) -> dict:
    org_id = user["org_id"]
    sale_id = ObjectId(sale_id_str)

    sale = await db.product_sales.find_one({"_id": sale_id, "org_id": org_id})
    if not sale:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sales record not found")

    prod = await get_product(db, org_id, str(sale["product_id"]))
    await require_manage_permission(user, prod.get("department_id"))

    updates = {}
    units = sale["units_sold"]
    price_obj = sale["unit_price"]

    if data.units_sold is not None:
        units = data.units_sold
        updates["units_sold"] = units
    if data.unit_price is not None:
        price_obj = data.unit_price.model_dump()
        updates["unit_price"] = price_obj

    if data.units_sold is not None or data.unit_price is not None:
        # Recompute revenue
        updates["revenue"] = {
            "amount": units * price_obj["amount"],
            "currency": price_obj["currency"],
        }

    if updates:
        updates["updated_at"] = utcnow()
        await db.product_sales.update_one({"_id": sale_id}, {"$set": updates})

    return await db.product_sales.find_one({"_id": sale_id})


# ---------------------------------------------------------------------------
# OVERHEAD ALLOCATION RUN
# ---------------------------------------------------------------------------

async def list_allocations(
    db: AsyncIOMotorDatabase,
    org_id: ObjectId,
    department_id: Optional[ObjectId] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    status: str = "current",
) -> list[dict]:
    query = {"org_id": org_id, "status": status}
    if department_id:
        query["department_id"] = department_id
    if year:
        query["period.year"] = year
    if month:
        query["period.month"] = month

    return await db.overhead_allocations.find(query).sort("created_at", -1).to_list(1000)


async def get_allocation(db: AsyncIOMotorDatabase, org_id: ObjectId, alloc_id_str: str) -> dict:
    alloc_id = ObjectId(alloc_id_str)
    alloc = await db.overhead_allocations.find_one({"_id": alloc_id, "org_id": org_id})
    if alloc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Allocation record not found")
    return alloc


async def run_allocation(db: AsyncIOMotorDatabase, user: dict, data) -> dict:
    """Run overhead allocation for a given department subtree and period.

    Finds all facility carbon in scope (emissions total) and distributes it
    proportionally to product sales by revenue.
    """
    org_id = user["org_id"]
    dept_id = ObjectId(str(data.department_id)) if data.department_id else None
    period = data.period

    if dept_id:
        await require_manage_permission(user, dept_id)
        scope_ids = await get_subtree_ids(org_id, dept_id)
    else:
        # Full org scope — org-level action, admins only
        await require_manage_permission(user, None)
        depts = await db.departments.find({"org_id": org_id}).to_list(5000)
        scope_ids = [d["_id"] for d in depts]

    # 1. Sum up total overhead in scope (facility carbon only)
    pipeline = [
        {"$match": {
            "org_id": org_id,
            "department_id": {"$in": scope_ids},
            "period.year": period.year,
            "period.month": period.month,
            "source_type": {"$in": ["facility_commute", "facility_electricity"]},
            "amount_kg": {"$gt": 0.0},
        }},
        {"$group": {"_id": None, "total": {"$sum": "$amount_kg"}}},
    ]
    overhead_res = await db.carbon_transactions.aggregate(pipeline).to_list(1)
    overhead_total_kg = overhead_res[0]["total"] if overhead_res else 0.0

    # 2. Find sales records for in-scope products
    sales = await db.product_sales.find({
        "org_id": org_id,
        "department_id": {"$in": scope_ids},
        "period.year": period.year,
        "period.month": period.month,
    }).to_list(5000)

    # 3. Currency Validation
    currencies = {s["revenue"]["currency"] for s in sales}
    if len(currencies) > 1:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Mixed currencies detected. All sales in scope must use the same currency for allocation.",
        )

    currency = list(currencies)[0] if currencies else "USD"
    revenue_total = sum(s["revenue"]["amount"] for s in sales)

    lines = []
    unallocated_kg = 0.0

    if revenue_total == 0.0 or not sales:
        # Zero revenue edge case
        unallocated_kg = overhead_total_kg
    else:
        for sale in sales:
            rev = sale["revenue"]["amount"]
            share = rev / revenue_total
            allocated = overhead_total_kg * share
            lines.append({
                "product_id": sale["product_id"],
                "revenue": sale["revenue"],
                "revenue_share": share,
                "allocated_kg": allocated,
            })

    # 4. Mark previous run for this scope+period superseded
    await db.overhead_allocations.update_many(
        {
            "org_id": org_id,
            "department_id": dept_id,
            "period.year": period.year,
            "period.month": period.month,
            "status": "current",
        },
        {"$set": {"status": "superseded"}},
    )

    # 5. Insert new allocation run
    now = utcnow()
    doc = {
        "org_id": org_id,
        "department_id": dept_id,
        "period": period.model_dump(),
        "overhead_total_kg": overhead_total_kg,
        "revenue_total": {
            "amount": revenue_total,
            "currency": currency,
        },
        "lines": lines,
        "unallocated_kg": unallocated_kg,
        "status": "current",
        "run_by": user["_id"],
        "created_at": now,
        "updated_at": now,
    }

    res = await db.overhead_allocations.insert_one(doc)
    doc["_id"] = res.inserted_id
    return doc
