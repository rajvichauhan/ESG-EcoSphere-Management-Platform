"""Service layer for regional city profiles (Phase 12 — Global Reference Data)."""

from __future__ import annotations

import re
from typing import Optional
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.models.common import utcnow


async def list_city_profiles(
    db: AsyncIOMotorDatabase,
    country: Optional[str] = None,
    city: Optional[str] = None,
    year: Optional[int] = None,
) -> list[dict]:
    query = {}
    if country:
        query["country"] = country.upper()
    if city:
        query["city"] = {"$regex": f"^{re.escape(city)}$", "$options": "i"}
    if year:
        query["year"] = year

    return await db.city_profiles.find(query).sort([("year", -1), ("city", 1)]).to_list(1000)


async def create_city_profile(db: AsyncIOMotorDatabase, user: dict, data) -> dict:
    # Check duplicate key: country + city + year
    dup = await db.city_profiles.find_one({
        "country": data.country.upper(),
        "city": data.city,
        "year": data.year,
    })
    if dup:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"City profile for {data.city}, {data.country} in {data.year} already exists",
        )

    now = utcnow()
    doc = {
        "country": data.country.upper(),
        "city": data.city,
        "year": data.year,
        "avg_commute_km_per_day": data.avg_commute_km_per_day,
        "transport_mix": [t.model_dump() for t in data.transport_mix],
        "grid_renewable_pct": data.grid_renewable_pct,
        "grid_factor_kg_per_kwh": data.grid_factor_kg_per_kwh,
        "electricity_tariff_per_kwh": data.electricity_tariff_per_kwh.model_dump() if data.electricity_tariff_per_kwh else None,
        "working_days_per_month": data.working_days_per_month,
        "source": data.source,
        "updated_by": user["_id"],
        "created_at": now,
        "updated_at": now,
    }
    try:
        res = await db.city_profiles.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"City profile for {data.city}, {data.country} in {data.year} already exists",
        )
    doc["_id"] = res.inserted_id
    return doc


async def update_city_profile(db: AsyncIOMotorDatabase, user: dict, profile_id_str: str, data) -> dict:
    profile_id = ObjectId(profile_id_str)
    old = await db.city_profiles.find_one({"_id": profile_id})
    if old is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "City profile not found")

    updates = {}
    if data.avg_commute_km_per_day is not None:
        updates["avg_commute_km_per_day"] = data.avg_commute_km_per_day
    if data.transport_mix is not None:
        updates["transport_mix"] = [t.model_dump() for t in data.transport_mix]
    if data.grid_renewable_pct is not None:
        updates["grid_renewable_pct"] = data.grid_renewable_pct
    if data.working_days_per_month is not None:
        updates["working_days_per_month"] = data.working_days_per_month
    if data.electricity_tariff_per_kwh is not None:
        updates["electricity_tariff_per_kwh"] = data.electricity_tariff_per_kwh.model_dump() if data.electricity_tariff_per_kwh else None
    if data.source is not None:
        updates["source"] = data.source

    # Track value history for grid_factor_kg_per_kwh
    if data.grid_factor_kg_per_kwh is not None:
        new_val = data.grid_factor_kg_per_kwh
        old_val = old.get("grid_factor_kg_per_kwh", 0.0)
        if new_val != old_val:
            updates["grid_factor_kg_per_kwh"] = new_val
            # Write reference value history
            history_doc = {
                "reference_id": profile_id,
                "ref_collection": "city_profiles",
                "old_value": old_val,
                "new_value": new_val,
                "old_source": old.get("source"),
                "new_source": data.source or old.get("source"),
                "changed_by": user["_id"],
                "changed_at": utcnow(),
            }
            await db.reference_value_history.insert_one(history_doc)

    if updates:
        updates["updated_at"] = utcnow()
        updates["updated_by"] = user["_id"]
        await db.city_profiles.update_one({"_id": profile_id}, {"$set": updates})

    return await db.city_profiles.find_one({"_id": profile_id})


async def find_city_profile(
    db: AsyncIOMotorDatabase, country: str, city: str, year: int
) -> tuple[dict | None, bool]:
    """Look up the best matching city profile.

    Returns (profile_doc, exact_year_match).
    Exact match: country + city + year.
    Fallback: country + city + greatest year <= requested year.
    Fallback 2: country + city + earliest available year (sets is_approximation = true).
    """
    profiles = await db.city_profiles.find({
        "country": country.upper(),
        "city": {"$regex": f"^{re.escape(city)}$", "$options": "i"},
    }).sort([("year", -1)]).to_list(100)

    if not profiles:
        return None, False

    # Try exact year
    exact = next((p for p in profiles if p["year"] == year), None)
    if exact:
        return exact, True

    # Try greatest year <= requested year
    fallback_earlier = next((p for p in profiles if p["year"] < year), None)
    if fallback_earlier:
        return fallback_earlier, False

    # Fallback to the earliest available year (the last item in sorting by year desc)
    return profiles[-1], False
