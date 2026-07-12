import asyncio
import app.db as db

async def main():
    await db.connect()
    mongo_db = db.get_db()
    
    # Print all departments
    print("DEPARTMENTS:")
    async for d in mongo_db.departments.find({}):
        print(f"ID: {d['_id']}, Name: {d.get('name')}, Parent: {d.get('parent_id')}, Org: {d.get('org_id')}")
        
    # Print user collections
    print("\nUSERS:")
    async for u in mongo_db.users.find({}):
        print(f"ID: {u['_id']}, Name: {u.get('full_name')}, Email: {u.get('email')}, Org: {u.get('org_id')}")

    await db.close()

if __name__ == "__main__":
    asyncio.run(main())
