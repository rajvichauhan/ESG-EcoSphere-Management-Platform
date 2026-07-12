"""Idempotent data migration to backfill the ancestors materialized path for all departments.

Walks the parent_id chain of each department document to root and updates
its ancestors array. Safe to run repeatedly.
"""

from __future__ import annotations

import asyncio
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import get_settings


async def backfill_ancestors(db) -> int:
    """Rebuild the ancestors array for all department documents.

    Returns the number of documents updated.
    """
    departments = await db.departments.find({}).to_list(length=10000)
    dept_map = {d["_id"]: d for d in departments}

    def get_ancestors_chain(dept_id: ObjectId) -> list[ObjectId]:
        chain = []
        curr = dept_map.get(dept_id)
        while curr:
            pid = curr.get("parent_id")
            if pid and pid in dept_map:
                chain.insert(0, pid)
                curr = dept_map[pid]
            else:
                break
        return chain

    updated_count = 0
    for dept in departments:
        dept_id = dept["_id"]
        correct_ancestors = get_ancestors_chain(dept_id)
        current_ancestors = dept.get("ancestors", [])

        # Check if backfill is actually needed
        if correct_ancestors != current_ancestors:
            await db.departments.update_one(
                {"_id": dept_id},
                {"$set": {"ancestors": correct_ancestors}},
            )
            updated_count += 1

    return updated_count


async def main():
    settings = get_settings()
    print(f"Connecting to MongoDB at {settings.mongodb_uri}...")
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db]
    print("Backfilling department ancestors...")
    count = await backfill_ancestors(db)
    print(f"Migration completed. Updated {count} departments.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
