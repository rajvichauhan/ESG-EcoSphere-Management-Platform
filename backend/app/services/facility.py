"""Service layer for corporate facilities and physical location activity readings (Phase 12)."""

from __future__ import annotations

from typing import Optional
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.auth import check_department_permission
from app.models.common import utcnow
from app.services.city_profile import find_city_profile


async def list_facilities(
    db: AsyncIOMotorDatabase, org_id: ObjectId, department_id: Optional[ObjectId] = None
) -> list[dict]:
    query = {"org_id": org_id}
    if department_id:
        # Include children too if ancestors query is needed.
        # But list_facilities typically lists by direct or child departments.
        # Let's support department subtree filter.
        subtree_ids = await db.departments.find(
            {"org_id": org_id, "$or": [{"_id": department_id}, {"ancestors": department_id}]},
            {"_id": 1},
        ).to_list(1000)
        query["department_id"] = {"$in": [d["_id"] for d in subtree_ids]}

    return await db.facilities.find(query).sort("name", 1).to_list(1000)


async def get_facility(db: AsyncIOMotorDatabase, org_id: ObjectId, facility_id_str: str) -> dict:
    facility_id = ObjectId(facility_id_str)
    fac = await db.facilities.find_one({"_id": facility_id, "org_id": org_id})
    if fac is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Facility not found")
    return fac


async def create_facility(db: AsyncIOMotorDatabase, user: dict, data) -> dict:
    org_id = user["org_id"]
    dept_id = ObjectId(str(data.department_id)) if data.department_id else None

    if dept_id:
        await check_department_permission(user, dept_id)

    now = utcnow()
    doc = {
        "org_id": org_id,
        "department_id": dept_id,
        "name": data.name,
        "country": data.country.upper(),
        "city": data.city,
        "employee_count": data.employee_count,
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }

    # Sibling name uniqueness
    dup = await db.facilities.find_one({
        "org_id": org_id,
        "department_id": dept_id,
        "name": data.name,
        "status": "active",
    })
    if dup:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Facility named '{data.name}' already exists in this department")

    res = await db.facilities.insert_one(doc)
    doc["_id"] = res.inserted_id

    # Check if city profiles exist for warn parameter
    profile, _ = await find_city_profile(db, data.country, data.city, now.year)
    if profile is None:
        doc["warning"] = "No city profile yet; readings will fail until one is added under Settings → ESG Configuration → City Profiles"

    return doc


async def update_facility(db: AsyncIOMotorDatabase, user: dict, facility_id_str: str, data) -> dict:
    org_id = user["org_id"]
    facility_id = ObjectId(facility_id_str)
    fac = await get_facility(db, org_id, facility_id_str)

    # Permission check on current dept
    if fac.get("department_id"):
        await check_department_permission(user, fac["department_id"])

    updates = {}
    if data.name is not None:
        updates["name"] = data.name
    if data.country is not None:
        updates["country"] = data.country.upper()
    if data.city is not None:
        updates["city"] = data.city
    if data.employee_count is not None:
        updates["employee_count"] = data.employee_count
    if data.status is not None:
        updates["status"] = data.status

    if data.department_id is not None:
        new_dept = ObjectId(str(data.department_id))
        await check_department_permission(user, new_dept)
        updates["department_id"] = new_dept

    if updates:
        updates["updated_at"] = utcnow()
        await db.facilities.update_one({"_id": facility_id}, {"$set": updates})

    return await get_facility(db, org_id, facility_id_str)


async def close_facility(db: AsyncIOMotorDatabase, user: dict, facility_id_str: str) -> dict:
    org_id = user["org_id"]
    facility_id = ObjectId(facility_id_str)
    fac = await get_facility(db, org_id, facility_id_str)

    if fac.get("department_id"):
        await check_department_permission(user, fac["department_id"])

    await db.facilities.update_one(
        {"_id": facility_id},
        {"$set": {"status": "closed", "updated_at": utcnow()}},
    )
    return {"message": "Facility closed", "facility_id": facility_id_str}


async def log_reading(db: AsyncIOMotorDatabase, user: dict, facility_id_str: str, data) -> dict:
    """Run facility commute and electricity calculations and record transactions.

    Idempotent. Replaces existing readings and ledger rows for the period.
    """
    org_id = user["org_id"]
    facility_id = ObjectId(facility_id_str)
    fac = await get_facility(db, org_id, facility_id_str)

    if fac.get("department_id"):
        await check_department_permission(user, fac["department_id"])

    period = data.period
    inputs = data.inputs

    # 1. Lookup City Profile
    profile, exact_year_match = await find_city_profile(db, fac["country"], fac["city"], period.year)
    if profile is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"No city profile for {fac['city']}, {fac['country']}; add one under Settings → ESG Configuration → City Profiles",
        )

    # 2. Determine Employees Used
    employees_used = inputs.employee_count_override if inputs.employee_count_override is not None else fac["employee_count"]

    # 3. Commute Calculation
    # commute_kg = employees × working_days_per_month × avg_commute_km_per_day × Σ(share × factor_kg_per_km)
    transport_factor = sum(
        t["share"] * t["factor_kg_per_km"] for t in profile["transport_mix"]
    )
    commute_kg = (
        employees_used
        * profile["working_days_per_month"]
        * profile["avg_commute_km_per_day"]
        * transport_factor
    )

    # 4. Electricity Calculation
    kwh = 0.0
    if inputs.electricity_kwh is not None:
        kwh = inputs.electricity_kwh
    elif inputs.electricity_bill is not None:
        tariff = profile.get("electricity_tariff_per_kwh")
        if tariff is None:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "City profile has no electricity tariff; enter electricity in kWh directly",
            )
        if inputs.electricity_bill.currency != tariff["currency"]:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"Currency mismatch: bill uses {inputs.electricity_bill.currency}, city profile uses {tariff['currency']}",
            )
        kwh = inputs.electricity_bill.amount / tariff["amount"]
    else:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Provide either electricity_kwh or electricity_bill",
        )

    # electricity_kg = non_renewable_kwh × grid_factor_kg_per_kwh
    non_renewable_kwh = kwh * (1.0 - profile["grid_renewable_pct"])
    electricity_kg = non_renewable_kwh * profile["grid_factor_kg_per_kwh"]

    total_kg = commute_kg + electricity_kg
    is_approximation = not exact_year_match

    # 5. Build Reading Document
    now = utcnow()
    reading_doc = {
        "org_id": org_id,
        "facility_id": facility_id,
        "department_id": fac.get("department_id"),
        "period": period.model_dump(),
        "inputs": inputs.model_dump(),
        "computed": {
            "commute_kg": commute_kg,
            "electricity_kg": electricity_kg,
            "total_kg": total_kg,
            "city_profile_id": profile["_id"],
            "is_approximation": is_approximation,
            "assumptions": {
                "avg_commute_km_per_day": profile["avg_commute_km_per_day"],
                "transport_mix": profile["transport_mix"],
                "grid_renewable_pct": profile["grid_renewable_pct"],
                "grid_factor_kg_per_kwh": profile["grid_factor_kg_per_kwh"],
                "working_days_per_month": profile["working_days_per_month"],
                "employees_used": employees_used,
            },
        },
        "created_by": user["_id"],
        "created_at": now,
        "updated_at": now,
    }

    # Upsert reading
    res = await db.facility_readings.update_one(
        {
            "facility_id": facility_id,
            "period.year": period.year,
            "period.month": period.month,
        },
        {"$set": reading_doc},
        upsert=True,
    )

    # Fetch upserted reading id
    reading = await db.facility_readings.find_one({
        "facility_id": facility_id,
        "period.year": period.year,
        "period.month": period.month,
    })
    reading_id = reading["_id"]

    # 6. Delete and Re-write Carbon Transactions (idempotent)
    await db.carbon_transactions.delete_many({
        "source_ref.collection": "facility_readings",
        "source_ref.id": reading_id,
    })

    tx_commute = {
        "org_id": org_id,
        "department_id": fac.get("department_id"),
        "period": period.model_dump(),
        "amount_kg": commute_kg,
        "source_type": "facility_commute",
        "source_ref": {"collection": "facility_readings", "id": reading_id},
        "calculation": {
            "factor_id": profile["_id"],
            "factor_value": transport_factor,
            "inputs": {
                "employees": employees_used,
                "working_days": profile["working_days_per_month"],
                "commute_km": profile["avg_commute_km_per_day"],
            },
            "is_approximation": is_approximation,
        },
        "note": f"Commute emissions for facility '{fac['name']}'",
        "created_by": user["_id"],
        "created_at": now,
        "updated_at": now,
    }

    tx_electricity = {
        "org_id": org_id,
        "department_id": fac.get("department_id"),
        "period": period.model_dump(),
        "amount_kg": electricity_kg,
        "source_type": "facility_electricity",
        "source_ref": {"collection": "facility_readings", "id": reading_id},
        "calculation": {
            "factor_id": profile["_id"],
            "factor_value": profile["grid_factor_kg_per_kwh"],
            "inputs": {
                "electricity_kwh": kwh,
                "grid_renewable_pct": profile["grid_renewable_pct"],
            },
            "is_approximation": is_approximation,
        },
        "note": f"Electricity emissions for facility '{fac['name']}'",
        "created_by": user["_id"],
        "created_at": now,
        "updated_at": now,
    }

    await db.carbon_transactions.insert_many([tx_commute, tx_electricity])

    return reading


async def list_readings(db: AsyncIOMotorDatabase, org_id: ObjectId, facility_id_str: str) -> list[dict]:
    facility_id = ObjectId(facility_id_str)
    return await db.facility_readings.find({
        "org_id": org_id,
        "facility_id": facility_id,
    }).sort([("period.year", -1), ("period.month", -1)]).to_list(1000)
