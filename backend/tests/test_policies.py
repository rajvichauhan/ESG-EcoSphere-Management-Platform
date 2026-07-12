"""Unit test suite for policies, policy acknowledgements, and commenting (Governance)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient, ASGITransport
from bson import ObjectId

from app.main import app
from app.db import get_db
from app.auth import create_access_token, hash_password
from app.models.common import utcnow


@pytest.fixture
def policy_test_data(event_loop):
    async def _setup():
        try:
            from app.db import get_db
            db = get_db()
        except RuntimeError:
            import app.db as app_db
            await app_db.connect()
            db = app_db.get_db()
        
        now = utcnow()

        # Clear prior data
        for col in ["policies", "policy_acknowledgements", "policy_comments", "users", "organizations"]:
            await db[col].delete_many({})

        # 1. Tenant Org
        org_id = ObjectId()
        await db.organizations.insert_one({
            "_id": org_id,
            "name": "Test Governance Org",
            "type": "corporate",
            "status": "active",
            "settings": {"esg_weights": {"e": 40, "s": 30, "g": 30}},
            "created_at": now, "updated_at": now,
        })

        # 2. Org Admin User
        admin_id = ObjectId()
        await db.users.insert_one({
            "_id": admin_id,
            "org_id": org_id,
            "email": "admin@gov.com",
            "password_hash": hash_password("pass"),
            "full_name": "Governance Admin",
            "roles": [{"role": "org_admin"}],
            "status": "active",
            "created_at": now, "updated_at": now,
        })

        # 3. Employee User
        emp_id = ObjectId()
        await db.users.insert_one({
            "_id": emp_id,
            "org_id": org_id,
            "email": "emp@gov.com",
            "password_hash": hash_password("pass"),
            "full_name": "Regular Employee",
            "roles": [{"role": "employee"}],
            "status": "active",
            "created_at": now, "updated_at": now,
        })

        # JWT Tokens
        admin_token = create_access_token(str(admin_id), str(org_id))
        emp_token = create_access_token(str(emp_id), str(org_id))

        return {
            "org_id": org_id,
            "admin_id": admin_id,
            "emp_id": emp_id,
            "headers": {
                "admin": {"Authorization": f"Bearer {admin_token}"},
                "emp": {"Authorization": f"Bearer {emp_token}"},
            }
        }

    return event_loop.run_until_complete(_setup())


@pytest.mark.asyncio
async def test_policy_creation_and_listing(policy_test_data):
    headers = policy_test_data["headers"]
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Employee tries to create a policy -> forbidden (403)
        res = await client.post("/api/policies", json={
            "title": "Employee Attempt Policy",
            "category": "Governance",
            "version": "1.0",
            "body_text": "Failed draft",
            "is_public": True
        }, headers=headers["emp"])
        assert res.status_code == 403

        # 2. Admin creates a public policy -> success (201)
        res = await client.post("/api/policies", json={
            "title": "Public ESG Ethics Policy",
            "category": "Governance",
            "version": "1.0",
            "body_text": "EcoSphere core values and circular economy guidelines.",
            "is_public": True
        }, headers=headers["admin"])
        assert res.status_code == 201
        public_policy = res.json()
        assert public_policy["title"] == "Public ESG Ethics Policy"
        assert public_policy["is_public"] is True

        # 3. Admin creates a private policy -> success (201)
        res = await client.post("/api/policies", json={
            "title": "Internal IT Security Rules",
            "category": "Governance",
            "version": "2.4",
            "body_text": "Password protection policies.",
            "is_public": False
        }, headers=headers["admin"])
        assert res.status_code == 201
        private_policy = res.json()
        assert private_policy["is_public"] is False

        # 4. Guest (unauthenticated) lists policies -> sees only public one
        res = await client.get("/api/policies")
        assert res.status_code == 200
        policies = res.json()
        assert len(policies) == 1
        assert policies[0]["title"] == "Public ESG Ethics Policy"

        # 5. Authenticated employee lists policies -> sees both public and private organization policies
        res = await client.get("/api/policies", headers=headers["emp"])
        assert res.status_code == 200
        policies = res.json()
        assert len(policies) == 2


@pytest.mark.asyncio
async def test_policy_acknowledgement(policy_test_data):
    headers = policy_test_data["headers"]
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create policy
        res = await client.post("/api/policies", json={
            "title": "Compliance Manual",
            "category": "Governance",
            "version": "1.0",
            "body_text": "Acknowledge this.",
            "is_public": True
        }, headers=headers["admin"])
        policy_id = res.json()["_id"]

        # 1. Employee acknowledges the policy -> 201
        res = await client.post("/api/policy-acknowledgements", json={
            "policy_id": policy_id
        }, headers=headers["emp"])
        assert res.status_code == 201
        assert res.json()["policy_id"] == policy_id
        assert res.json()["user_id"] == str(policy_test_data["emp_id"])


@pytest.mark.asyncio
async def test_policy_commenting(policy_test_data):
    headers = policy_test_data["headers"]
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create policy
        res = await client.post("/api/policies", json={
            "title": "Mitigation Strategy",
            "category": "Environmental Compliance",
            "version": "1.0",
            "body_text": "Mitigate carbon emissions.",
            "is_public": True
        }, headers=headers["admin"])
        policy_id = res.json()["_id"]

        # 1. Guest/NGO posts comment -> 201
        res = await client.post(f"/api/policies/{policy_id}/comments", json={
            "author_name": "Save The Earth NGO",
            "author_email": "feedback@savetheearth.org",
            "author_role": "NGO Representative",
            "content": "Excellent carbon baseline setting!"
        })
        assert res.status_code == 201
        c = res.json()
        assert c["author_name"] == "Save The Earth NGO"
        assert c["author_role"] == "NGO Representative"
        assert c["content"] == "Excellent carbon baseline setting!"

        # 2. Employee posts comment -> 201 (name/email/role auto-determined)
        res = await client.post(f"/api/policies/{policy_id}/comments", json={
            "author_name": "",
            "author_email": "",
            "author_role": "",
            "content": "Fully agreed and shared with team."
        }, headers=headers["emp"])
        assert res.status_code == 201
        c = res.json()
        assert c["author_name"] == "Regular Employee"
        assert c["author_role"] == "employee"

        # 3. Anyone retrieves comments -> 200 (returns chronological list)
        res = await client.get(f"/api/policies/{policy_id}/comments")
        assert res.status_code == 200
        comments = res.json()
        assert len(comments) == 2
        assert comments[0]["content"] == "Excellent carbon baseline setting!"
        assert comments[1]["content"] == "Fully agreed and shared with team."
