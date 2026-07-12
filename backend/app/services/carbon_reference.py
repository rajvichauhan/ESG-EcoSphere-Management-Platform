"""Service layer for global carbon reference factors and history logs (Phase 13)."""

from __future__ import annotations

import re
from typing import Any, Optional
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.models.common import utcnow


async def list_carbon_references(
    db: AsyncIOMotorDatabase,
    country: Optional[str] = None,
    category: Optional[str] = None,
    product_name: Optional[str] = None,
    year: Optional[int] = None,
) -> list[dict]:
    query = {}
    if country:
        query["country"] = country.upper()
    if category:
        query["product_category"] = category
    if product_name:
        query["product_name"] = {"$regex": f"^{re.escape(product_name)}$", "$options": "i"}
    if year:
        query["year"] = year

    return await db.carbon_reference.find(query).sort([("year", -1), ("product_category", 1)]).to_list(1000)


async def create_carbon_reference(db: AsyncIOMotorDatabase, user: dict, data) -> dict:
    dup = await db.carbon_reference.find_one({
        "country": data.country.upper(),
        "city": data.city,
        "product_category": data.product_category,
        "product_name": data.product_name,
        "year": data.year,
    })
    if dup:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Carbon reference row with these parameters already exists",
        )

    now = utcnow()
    doc = {
        "country": data.country.upper(),
        "city": data.city,
        "product_category": data.product_category,
        "product_name": data.product_name,
        "description": data.description,
        "year": data.year,
        "carbon_value": data.carbon_value,
        "unit": data.unit,
        "source": data.source,
        "updated_by": user["_id"],
        "created_at": now,
        "updated_at": now,
    }
    try:
        res = await db.carbon_reference.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Carbon reference row with these parameters already exists",
        )
    doc["_id"] = res.inserted_id
    return doc


async def update_carbon_reference(db: AsyncIOMotorDatabase, user: dict, ref_id_str: str, data) -> dict:
    ref_id = ObjectId(ref_id_str)
    old = await db.carbon_reference.find_one({"_id": ref_id})
    if old is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Carbon reference row not found")

    updates = {}
    if data.description is not None:
        updates["description"] = data.description
    if data.unit is not None:
        updates["unit"] = data.unit

    if data.carbon_value is not None or data.source is not None:
        new_val = data.carbon_value if data.carbon_value is not None else old["carbon_value"]
        new_src = data.source if data.source is not None else old.get("source")

        if new_val != old["carbon_value"] or new_src != old.get("source"):
            updates["carbon_value"] = new_val
            updates["source"] = new_src

            # Write reference history entry
            history_doc = {
                "reference_id": ref_id,
                "ref_collection": "carbon_reference",
                "old_value": old["carbon_value"],
                "new_value": new_val,
                "old_source": old.get("source"),
                "new_source": new_src,
                "changed_by": user["_id"],
                "changed_at": utcnow(),
            }
            await db.reference_value_history.insert_one(history_doc)

    if updates:
        updates["updated_at"] = utcnow()
        updates["updated_by"] = user["_id"]
        await db.carbon_reference.update_one({"_id": ref_id}, {"$set": updates})

    return await db.carbon_reference.find_one({"_id": ref_id})


async def get_reference_history(db: AsyncIOMotorDatabase, ref_id_str: str) -> list[dict]:
    ref_id = ObjectId(ref_id_str)
    return await db.reference_value_history.find({
        "reference_id": ref_id,
    }).sort("changed_at", -1).to_list(100)


async def lookup_carbon_reference(
    db: AsyncIOMotorDatabase, country: str, city: Optional[str], category: str, name: Optional[str], year: int
) -> Optional[dict]:
    """Tiered lookup strategy:

    Tier 1: country + city + product_category + product_name
    Tier 2: country + product_category + product_name (city = null)
    Tier 3: country + product_category (city = null, product_name = null)
    Tier 4: product_category (any country, city=null, product_name=null)

    Within each tier, picks the greatest year <= requested year.
    If none, picks smallest available year and flags is_approximation = true.
    """
    country_upper = country.upper()

    # Define the match queries for the 4 tiers
    tiers_queries = [
        # Tier 1
        {"country": country_upper, "city": city, "product_category": category, "product_name": name},
        # Tier 2
        {"country": country_upper, "city": None, "product_category": category, "product_name": name},
        # Tier 3
        {"country": country_upper, "city": None, "product_category": category, "product_name": None},
        # Tier 4
        {"product_category": category},
    ]

    for idx, query in enumerate(tiers_queries, start=1):
        rows = await db.carbon_reference.find(query).sort([("year", -1)]).to_list(100)
        if not rows:
            continue

        # Find best year matching: greatest year <= requested year
        exact = next((r for r in rows if r["year"] == year), None)
        if exact:
            # For Tier 1 and exact year, it's not an approximation.
            # Tiers 2, 3, 4 are always approximations.
            is_approx = (idx > 1)
            return {"row": exact, "match_tier": idx, "is_approximation": is_approx}

        fallback_earlier = next((r for r in rows if r["year"] < year), None)
        if fallback_earlier:
            is_approx = (idx > 1) or (fallback_earlier["year"] != year)
            return {"row": fallback_earlier, "match_tier": idx, "is_approximation": is_approx}

        # Fallback to earliest available year
        earliest = rows[-1]
        return {"row": earliest, "match_tier": idx, "is_approximation": True}

    return None
