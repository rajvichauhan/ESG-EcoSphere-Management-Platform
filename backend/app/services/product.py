"""Service layer for corporate product registries and production tracking (Phase 13)."""

from __future__ import annotations

from typing import Optional
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.auth import require_manage_permission
from app.models.common import utcnow
from app.services.carbon_reference import lookup_carbon_reference


async def list_products(
    db: AsyncIOMotorDatabase, org_id: ObjectId, status: Optional[str] = None, category: Optional[str] = None
) -> list[dict]:
    query = {"org_id": org_id}
    if status:
        query["status"] = status
    if category:
        query["category"] = category

    return await db.products.find(query).sort("name", 1).to_list(1000)


async def get_product(db: AsyncIOMotorDatabase, org_id: ObjectId, product_id_str: str) -> dict:
    product_id = ObjectId(product_id_str)
    prod = await db.products.find_one({"_id": product_id, "org_id": org_id})
    if prod is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return prod


async def create_product(db: AsyncIOMotorDatabase, user: dict, data) -> dict:
    org_id = user["org_id"]
    dept_id = ObjectId(str(data.department_id)) if data.department_id else None

    await require_manage_permission(user, dept_id)

    now = utcnow()
    doc = {
        "org_id": org_id,
        "department_id": dept_id,
        "name": data.name,
        "category": data.category,
        "description": data.description,
        "production_country": data.production_country.upper(),
        "production_city": data.production_city,
        "unit_price": data.unit_price.model_dump(),
        "carbon": None,
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }

    res = await db.products.insert_one(doc)
    doc["_id"] = res.inserted_id
    return doc


async def update_product(db: AsyncIOMotorDatabase, user: dict, product_id_str: str, data) -> dict:
    org_id = user["org_id"]
    product_id = ObjectId(product_id_str)
    prod = await get_product(db, org_id, product_id_str)

    await require_manage_permission(user, prod.get("department_id"))

    updates = {}
    if data.name is not None:
        updates["name"] = data.name
    if data.category is not None:
        updates["category"] = data.category
    if data.description is not None:
        updates["description"] = data.description
    if data.production_country is not None:
        updates["production_country"] = data.production_country.upper()
    if data.production_city is not None:
        updates["production_city"] = data.production_city
    if data.unit_price is not None:
        updates["unit_price"] = data.unit_price.model_dump()
    if data.status is not None:
        updates["status"] = data.status

    if data.department_id is not None:
        new_dept = ObjectId(str(data.department_id))
        await require_manage_permission(user, new_dept)
        updates["department_id"] = new_dept

    if updates:
        updates["updated_at"] = utcnow()
        await db.products.update_one({"_id": product_id}, {"$set": updates})

    return await get_product(db, org_id, product_id_str)


async def discontinue_product(db: AsyncIOMotorDatabase, user: dict, product_id_str: str) -> dict:
    org_id = user["org_id"]
    product_id = ObjectId(product_id_str)
    prod = await get_product(db, org_id, product_id_str)

    await require_manage_permission(user, prod.get("department_id"))

    await db.products.update_one(
        {"_id": product_id},
        {"$set": {"status": "discontinued", "updated_at": utcnow()}},
    )
    return {"message": "Product discontinued", "product_id": product_id_str}


async def calculate_carbon(db: AsyncIOMotorDatabase, user: dict, product_id_str: str, year: Optional[int] = None) -> dict:
    """Trigger the tiered lookup against global reference data to compute per-unit carbon footprint."""
    org_id = user["org_id"]
    product_id = ObjectId(product_id_str)
    prod = await get_product(db, org_id, product_id_str)

    await require_manage_permission(user, prod.get("department_id"))

    target_year = year if year is not None else utcnow().year

    lookup = await lookup_carbon_reference(
        db,
        prod["production_country"],
        prod["production_city"],
        prod["category"],
        prod["name"],
        target_year,
    )

    if lookup is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"No carbon reference data for category '{prod['category']}'",
        )

    row = lookup["row"]
    now = utcnow()
    carbon_data = {
        "per_unit_kg": row["carbon_value"],
        "reference_id": row["_id"],
        "match_tier": lookup["match_tier"],
        "is_approximation": lookup["is_approximation"],
        "unit": row["unit"],
        "calculated_at": now,
        "source_link_id": None,  # Reset link adoption since this is a fresh manual calc
    }

    await db.products.update_one(
        {"_id": product_id},
        {"$set": {"carbon": carbon_data, "updated_at": now}},
    )

    return {
        "product_id": product_id_str,
        "carbon": carbon_data,
        "matched_reference": row,
    }


async def record_production(db: AsyncIOMotorDatabase, user: dict, product_id_str: str, data) -> dict:
    """Record production quantity for a period and insert/replace ledger row.

    Precondition: product.carbon must be set.
    """
    org_id = user["org_id"]
    product_id = ObjectId(product_id_str)
    prod = await get_product(db, org_id, product_id_str)

    await require_manage_permission(user, prod.get("department_id"))

    carbon = prod.get("carbon")
    if carbon is None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Calculate product carbon first",
        )

    period = data.period
    qty = data.quantity_units
    total_carbon_kg = carbon["per_unit_kg"] * qty
    now = utcnow()

    # Determine source_type and source_ref based on link adoption
    source_type = "product"
    source_ref = {"collection": "products", "id": product_id}
    if carbon.get("source_link_id"):
        source_type = "linked_partner"
        source_ref = {"collection": "product_links", "id": ObjectId(str(carbon["source_link_id"]))}

    # Delete any existing ledger row for THIS product + period, keyed on the
    # stable product_id marker (not source_ref). This is critical: after a
    # product adopts a partner link its source_ref flips from products→product_links,
    # so keying the delete on source_ref would leave the old "product" row behind
    # and double-count. The legacy source_ref clause cleans rows written before
    # the product_id marker existed.
    await db.carbon_transactions.delete_many({
        "org_id": org_id,
        "period.year": period.year,
        "period.month": period.month,
        "$or": [
            {"product_id": product_id},
            {"source_ref.collection": "products", "source_ref.id": product_id},
        ],
    })

    tx = {
        "org_id": org_id,
        "department_id": prod.get("department_id"),
        "product_id": product_id,  # stable idempotency key across source_type changes
        "period": period.model_dump(),
        "amount_kg": total_carbon_kg,
        "source_type": source_type,
        "source_ref": source_ref,
        "calculation": {
            "factor_id": carbon["reference_id"],  # None if partner link adopted
            "factor_value": carbon["per_unit_kg"],
            "inputs": {
                "quantity_units": qty,
                "per_unit_kg": carbon["per_unit_kg"],
            },
            "is_approximation": carbon["is_approximation"],
            "match_tier": carbon.get("match_tier", 0),
        },
        "note": f"Recorded production of {qty} units for product '{prod['name']}'",
        "created_by": user["_id"],
        "created_at": now,
        "updated_at": now,
    }

    res = await db.carbon_transactions.insert_one(tx)
    tx["_id"] = res.inserted_id
    return tx
