"""Sanity check script to verify MongoDB Atlas and Backblaze B2 connection health (Component 2)."""

from __future__ import annotations

import asyncio
import sys
from bson import ObjectId

from app.db import connect, get_db, close as close_db
from app.config import get_settings
from app.storage.factory import get_storage
from app.storage.b2 import B2Storage


async def test_mongodb() -> None:
    print("\n=== Testing MongoDB Connection ===")
    await connect()
    db = get_db()
    test_col = db["sanity_check"]

    test_id = ObjectId()
    test_doc = {
        "_id": test_id,
        "name": "Sanity Test Connection",
        "status": "passed",
        "timestamp": "2026-07-12T16:17:00Z",
    }

    print(f"1. Inserting doc to MongoDB Atlas: {test_doc}")
    await test_col.insert_one(test_doc)

    print("2. Querying doc back from MongoDB Atlas...")
    fetched = await test_col.find_one({"_id": test_id})
    print(f"   Fetched: {fetched}")

    if not fetched or fetched.get("status") != "passed":
        raise AssertionError("MongoDB sanity test failed: Data mismatch or not found.")

    print("3. Clean up - deleting test doc...")
    await test_col.delete_one({"_id": test_id})
    print("   MongoDB Atlas verification PASSED successfully.")


async def test_b2_storage() -> None:
    print("\n=== Testing Backblaze B2 Storage ===")
    settings = get_settings()
    print(f"FILE_STORAGE_BACKEND is configured as: '{settings.file_storage_backend}'")

    if settings.file_storage_backend.lower() != "b2":
        print("WARNING: FILE_STORAGE_BACKEND is not set to 'b2' in .env. Changing settings dynamically for this test...")
        settings.file_storage_backend = "b2"

    storage = get_storage()
    if not isinstance(storage, B2Storage):
        raise AssertionError(f"Expected B2Storage instance, got: {type(storage)}")

    test_key = "sanity/test_file.txt"
    test_data = b"EcoSphere ESG Storage Connection sanity test verified."
    content_type = "text/plain"

    print(f"1. Uploading test file to B2 bucket '{settings.b2_bucket}' under key '{test_key}'...")
    uploaded_key = await storage.save(test_key, test_data, content_type)
    print(f"   Uploaded key: {uploaded_key}")

    print("2. Checking if file exists on B2...")
    exists = await storage.exists(test_key)
    print(f"   Exists response: {exists}")
    if not exists:
        raise AssertionError("B2 sanity test failed: File does not exist after saving.")

    print("3. Loading file contents from B2...")
    loaded_data = await storage.load(test_key)
    print(f"   Loaded data: {loaded_data}")
    if loaded_data != test_data:
        raise AssertionError(f"B2 sanity test failed: Data mismatch.\nExpected: {test_data}\nGot: {loaded_data}")

    print("4. Clean up - deleting test file from B2...")
    await storage.delete(test_key)

    exists_after_delete = await storage.exists(test_key)
    print(f"   Exists after deletion: {exists_after_delete}")
    if exists_after_delete:
        raise AssertionError("B2 sanity test failed: File still exists after deletion.")

    print("   Backblaze B2 verification PASSED successfully.")


async def main():
    try:
        await test_mongodb()
        await test_b2_storage()
        print("\nAll sanity checks completed successfully! Connectors are fully functional.")
    except Exception as e:
        print(f"\nERROR: Sanity checks failed! Reason: {e}")
        sys.exit(1)
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(main())
