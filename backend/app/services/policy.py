"""Service layer for policies, acknowledgements, and policy comments."""

from __future__ import annotations

from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.auth import require_manage_permission
from app.models.common import utcnow


async def list_policies(db: AsyncIOMotorDatabase, org_id: ObjectId | None = None) -> list[dict]:
    """List policies. If org_id is provided, includes org-specific and public ones.
    Otherwise, returns only public policies.
    """
    if org_id:
        query = {"$or": [{"org_id": org_id}, {"is_public": True}]}
    else:
        query = {"is_public": True}

    return await db.policies.find(query).sort("published_at", -1).to_list(1000)


async def get_policy(db: AsyncIOMotorDatabase, policy_id_str: str) -> dict:
    """Retrieve a single policy document."""
    if not ObjectId.is_valid(policy_id_str):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid policy ID format")
    policy = await db.policies.find_one({"_id": ObjectId(policy_id_str)})
    if not policy:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Policy not found")
    return policy


async def create_policy(db: AsyncIOMotorDatabase, user: dict, data) -> dict:
    """Create a new policy (restricted to org_admin/master_admin)."""
    org_id = user["org_id"]
    await require_manage_permission(user, None)  # Org-level permission check

    now = utcnow()
    doc = {
        "org_id": org_id,
        "title": data.title,
        "group": data.group or data.category,
        "category": data.category or data.group,
        "version": data.version,
        "body_text": data.body_text,
        "file_id": data.file_id,
        "document_url": data.document_url,
        "published_at": now,
        "status": data.status,
        "is_public": data.is_public,
        "created_at": now,
        "updated_at": now,
    }

    res = await db.policies.insert_one(doc)
    doc["_id"] = res.inserted_id
    return doc


async def acknowledge_policy(db: AsyncIOMotorDatabase, user: dict, policy_id_str: str) -> dict:
    """Log an employee policy acknowledgement."""
    policy = await get_policy(db, policy_id_str)
    
    now = utcnow()
    ack_doc = {
        "policy_id": policy["_id"],
        "user_id": user["_id"],
        "acknowledged_at": now,
    }

    await db.policy_acknowledgements.update_one(
        {"policy_id": policy["_id"], "user_id": user["_id"]},
        {"$set": ack_doc},
        upsert=True
    )
    return ack_doc


async def list_comments(db: AsyncIOMotorDatabase, policy_id_str: str) -> list[dict]:
    """Retrieve all comments on a policy."""
    if not ObjectId.is_valid(policy_id_str):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid policy ID format")
    return await db.policy_comments.find({"policy_id": ObjectId(policy_id_str)}).sort("created_at", 1).to_list(1000)


async def create_comment(db: AsyncIOMotorDatabase, policy_id_str: str, user: dict | None, data) -> dict:
    """Add a comment to a policy (either by authenticated user or guest/NGO)."""
    policy = await get_policy(db, policy_id_str)

    now = utcnow()
    org_id = policy.get("org_id")

    if user:
        roles_list = [r.role if hasattr(r, "role") else r.get("role") for r in user.get("roles", [])]
        role = roles_list[0] if roles_list else "employee"
        author_name = user.get("full_name") or data.author_name or "Authenticated User"
        author_email = user.get("email") or data.author_email or ""
        author_role = role
    else:
        author_name = data.author_name or "Anonymous"
        author_email = data.author_email or "anonymous@ecosphere.local"
        author_role = data.author_role or "guest"

    doc = {
        "policy_id": policy["_id"],
        "org_id": org_id,
        "author_name": author_name,
        "author_email": author_email,
        "author_role": author_role,
        "content": data.content,
        "created_at": now,
        "updated_at": now,
    }

    res = await db.policy_comments.insert_one(doc)
    doc["_id"] = res.inserted_id
    return doc
