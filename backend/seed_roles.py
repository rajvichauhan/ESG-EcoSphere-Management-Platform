"""One-time seeding script to create users for each role (master_admin, org_admin, sub_admin, dept_head, employee, ngo_member)."""

from __future__ import annotations

import asyncio
from bson import ObjectId

from app import db
from app.auth import hash_password
from app.models.common import utcnow


async def seed_role_users():
    print("Connecting to MongoDB...")
    await db.connect()
    mongo_db = db.get_db()
    
    now = utcnow()
    org_id = ObjectId("6650a2f4762c4a929baaaa01")  # Acme Corp organization

    users_to_seed = [
        {
            "email": "master@ecosphere.local",
            "password": "masterpassword",
            "full_name": "EcoSphere Master Admin",
            "roles": [{"role": "master_admin"}],
            "status": "active"
        },
        {
            "email": "orgadmin@ecosphere.local",
            "password": "adminpassword",
            "full_name": "Corporate Org Admin",
            "roles": [{"role": "org_admin"}],
            "status": "active"
        },
        {
            "email": "subadmin@ecosphere.local",
            "password": "subadminpassword",
            "full_name": "Regional Sub Admin",
            "roles": [{
                "role": "sub_admin",
                "scope": {"kind": "region", "values": ["IN"]}
            }],
            "status": "active"
        },
        {
            "email": "depthead@ecosphere.local",
            "password": "deptheadpassword",
            "full_name": "Department Manager Jenkins",
            "roles": [{"role": "dept_head"}],
            "status": "active"
        },
        {
            "email": "employee@ecosphere.local",
            "password": "employeepassword",
            "full_name": "Jane Employee Doe",
            "roles": [{"role": "employee"}],
            "status": "active"
        },
        {
            "email": "ngo@ecosphere.local",
            "password": "ngopassword",
            "full_name": "NGO Alliance Rep",
            "roles": [{"role": "ngo_member"}],
            "status": "active"
        }
    ]

    for u in users_to_seed:
        existing = await mongo_db.users.find_one({"email": u["email"]})
        if existing:
            # Update password and roles if user already exists
            await mongo_db.users.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "password_hash": hash_password(u["password"]),
                        "roles": u["roles"],
                        "full_name": u["full_name"],
                        "updated_at": now
                    }
                }
            )
            print(f"Updated user: {u['email']} with password: {u['password']} (Roles: {[r['role'] for r in u['roles']]})")
        else:
            # Create new user
            user_doc = {
                "org_id": org_id,
                "email": u["email"],
                "password_hash": hash_password(u["password"]),
                "full_name": u["full_name"],
                "roles": u["roles"],
                "status": u["status"],
                "xp_total": 0,
                "points_balance": 0,
                "created_at": now,
                "updated_at": now
            }
            await mongo_db.users.insert_one(user_doc)
            print(f"Created user: {u['email']} with password: {u['password']} (Roles: {[r['role'] for r in u['roles']]})")

    print("Seeding complete. Closing connection.")
    await db.close()


if __name__ == "__main__":
    asyncio.run(seed_role_users())
