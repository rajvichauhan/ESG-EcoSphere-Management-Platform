"""Department service layer (Phase 11 — Corporate Hierarchy & Rollups).

All business logic for department CRUD, tree operations, subtree moves,
head/member assignment, and live rollup aggregation lives here.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.auth import check_department_permission, has_role
from app.models.common import utcnow


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _oid(val: Any) -> ObjectId:
    """Coerce a string or ObjectId to ObjectId."""
    if isinstance(val, ObjectId):
        return val
    return ObjectId(str(val))


async def _load_dept(db: AsyncIOMotorDatabase, org_id: ObjectId, dept_id: ObjectId) -> dict:
    doc = await db.departments.find_one({"_id": dept_id, "org_id": org_id})
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Department not found")
    return doc


async def _ensure_user_in_org(db: AsyncIOMotorDatabase, org_id: ObjectId, user_id: ObjectId) -> dict:
    user = await db.users.find_one({"_id": user_id, "org_id": org_id})
    if user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "User not found in this organisation")
    return user


async def _add_role_if_absent(db: AsyncIOMotorDatabase, user_id: ObjectId, role_name: str) -> None:
    """Add a role entry to the user's roles array if not already present."""
    await db.users.update_one(
        {"_id": user_id, "roles.role": {"$ne": role_name}},
        {"$push": {"roles": {"role": role_name}}, "$set": {"updated_at": utcnow()}},
    )


# ---------------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------------

async def create_department(db: AsyncIOMotorDatabase, user: dict, data) -> dict:
    """Create a root or sub-department.

    Permission: master_admin/org_admin always.  For sub-departments, a dept_head
    may create under their own node or its descendants (self-service).
    """
    org_id = user["org_id"]
    parent_id = _oid(data.parent_id) if data.parent_id else None

    # Permission check
    if parent_id is None:
        # Root department — admin only
        if not has_role(user, "master_admin", "org_admin"):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only admins can create root departments")
    else:
        # Sub-department — admin OR self-service under own subtree
        if not has_role(user, "master_admin", "org_admin"):
            user_dept = user.get("department_id")
            if not user_dept:
                raise HTTPException(status.HTTP_403_FORBIDDEN, "No department assignment")
            parent = await _load_dept(db, org_id, parent_id)
            # User's dept must be the parent or appear in the parent's ancestors
            if user_dept != parent_id and user_dept not in (parent.get("ancestors") or []):
                raise HTTPException(status.HTTP_403_FORBIDDEN, "You may only create sub-departments under your own subtree")

    # Compute ancestors
    ancestors: list[ObjectId] = []
    if parent_id:
        parent = await _load_dept(db, org_id, parent_id)
        ancestors = list(parent.get("ancestors") or []) + [parent_id]

    # Sibling name uniqueness
    dup = await db.departments.find_one({
        "org_id": org_id, "parent_id": parent_id, "name": data.name,
    })
    if dup:
        raise HTTPException(status.HTTP_409_CONFLICT, f"A sibling department named '{data.name}' already exists")

    now = utcnow()
    head_user_id = _oid(data.head_user_id) if data.head_user_id else None

    # Validate and set up head
    if head_user_id:
        await _ensure_user_in_org(db, org_id, head_user_id)
        await _add_role_if_absent(db, head_user_id, "dept_head")

    doc = {
        "org_id": org_id,
        "name": data.name,
        "code": data.code,
        "parent_id": parent_id,
        "ancestors": ancestors,
        "head_user_id": head_user_id,
        "employee_count": data.employee_count,
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }
    result = await db.departments.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


# ---------------------------------------------------------------------------
# UPDATE / MOVE
# ---------------------------------------------------------------------------

async def update_department(db: AsyncIOMotorDatabase, user: dict, dept_id_str: str, data) -> dict:
    """Edit a department or move it to a new parent.

    Move logic rewrites ``ancestors`` for the moved node and every descendant.
    """
    org_id = user["org_id"]
    dept_id = _oid(dept_id_str)
    dept = await _load_dept(db, org_id, dept_id)

    # Permission
    await check_department_permission(user, dept_id)

    updates: dict[str, Any] = {}
    now = utcnow()

    # --- Move ---
    new_parent_id_raw = data.parent_id
    if new_parent_id_raw is not None:
        new_parent_id = _oid(new_parent_id_raw)

        if new_parent_id == dept_id:
            raise HTTPException(status.HTTP_409_CONFLICT, "Cannot move department under itself")

        # Cycle detection: new parent must not be a descendant
        descendant_ids = await get_subtree_ids(db, org_id, dept_id)
        if new_parent_id in descendant_ids:
            raise HTTPException(status.HTTP_409_CONFLICT, "Cycle detected: new parent is a descendant")

        new_parent = await _load_dept(db, org_id, new_parent_id)
        new_ancestors = list(new_parent.get("ancestors") or []) + [new_parent_id]

        old_prefix = list(dept.get("ancestors") or []) + [dept_id]
        new_prefix = new_ancestors + [dept_id]

        updates["parent_id"] = new_parent_id
        updates["ancestors"] = new_ancestors

        # Rewrite all descendants
        desc_cursor = db.departments.find(
            {"org_id": org_id, "ancestors": dept_id, "_id": {"$ne": dept_id}},
        )
        async for desc in desc_cursor:
            old_anc = desc.get("ancestors") or []
            # Replace the old_prefix portion at the start
            prefix_len = len(old_prefix)
            rewritten = new_prefix + old_anc[prefix_len:]
            await db.departments.update_one(
                {"_id": desc["_id"]},
                {"$set": {"ancestors": rewritten, "updated_at": now}},
            )

    # --- Name / code / employee_count / status ---
    if data.name is not None:
        parent_id_for_check = updates.get("parent_id", dept.get("parent_id"))
        dup = await db.departments.find_one({
            "org_id": org_id, "parent_id": parent_id_for_check,
            "name": data.name, "_id": {"$ne": dept_id},
        })
        if dup:
            raise HTTPException(status.HTTP_409_CONFLICT, f"A sibling named '{data.name}' already exists")
        updates["name"] = data.name

    if data.code is not None:
        updates["code"] = data.code
    if data.employee_count is not None:
        updates["employee_count"] = data.employee_count
    if data.status is not None:
        updates["status"] = data.status

    # --- Head change ---
    if data.head_user_id is not None:
        head_id = _oid(data.head_user_id)
        await _ensure_user_in_org(db, org_id, head_id)
        await _add_role_if_absent(db, head_id, "dept_head")
        updates["head_user_id"] = head_id

    if updates:
        updates["updated_at"] = now
        await db.departments.update_one({"_id": dept_id}, {"$set": updates})

    return await _load_dept(db, org_id, dept_id)


# ---------------------------------------------------------------------------
# ASSIGN HEAD / ADD MEMBER
# ---------------------------------------------------------------------------

async def assign_head(db: AsyncIOMotorDatabase, user: dict, dept_id_str: str, target_user_id_str: str) -> dict:
    org_id = user["org_id"]
    dept_id = _oid(dept_id_str)
    target_uid = _oid(target_user_id_str)

    await _load_dept(db, org_id, dept_id)

    # Permission: admin or dept_head of an ancestor
    if not has_role(user, "master_admin", "org_admin"):
        dept_doc = await _load_dept(db, org_id, dept_id)
        user_dept = user.get("department_id")
        if not user_dept or (user_dept != dept_id and user_dept not in (dept_doc.get("ancestors") or [])):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")

    target = await _ensure_user_in_org(db, org_id, target_uid)

    now = utcnow()
    await db.departments.update_one(
        {"_id": dept_id}, {"$set": {"head_user_id": target_uid, "updated_at": now}},
    )
    # Set user's department_id if unset
    if not target.get("department_id"):
        await db.users.update_one(
            {"_id": target_uid}, {"$set": {"department_id": dept_id, "updated_at": now}},
        )
    await _add_role_if_absent(db, target_uid, "dept_head")
    return await _load_dept(db, org_id, dept_id)


async def add_member(db: AsyncIOMotorDatabase, user: dict, dept_id_str: str, target_user_id_str: str) -> dict:
    org_id = user["org_id"]
    dept_id = _oid(dept_id_str)
    target_uid = _oid(target_user_id_str)

    await _load_dept(db, org_id, dept_id)

    # Permission: admin or self-service (user's dept is this dept or an ancestor)
    if not has_role(user, "master_admin", "org_admin"):
        await check_department_permission(user, dept_id)

    target = await _ensure_user_in_org(db, org_id, target_uid)

    now = utcnow()
    await db.users.update_one(
        {"_id": target_uid}, {"$set": {"department_id": dept_id, "updated_at": now}},
    )
    # Add employee role if user has no roles
    if not target.get("roles"):
        await _add_role_if_absent(db, target_uid, "employee")

    return {"message": "Member added", "user_id": str(target_uid), "department_id": str(dept_id)}


# ---------------------------------------------------------------------------
# TREE
# ---------------------------------------------------------------------------

async def get_tree(db: AsyncIOMotorDatabase, org_id: ObjectId, root_id: str | None = None) -> list[dict]:
    """Build an in-memory nested tree from the flat department list."""
    query: dict[str, Any] = {"org_id": org_id}
    if root_id:
        rid = _oid(root_id)
        query["$or"] = [{"_id": rid}, {"ancestors": rid}]

    docs = await db.departments.find(query).to_list(length=5000)

    # Collect head user ids
    head_ids = [d["head_user_id"] for d in docs if d.get("head_user_id")]
    head_map: dict[ObjectId, dict] = {}
    if head_ids:
        async for u in db.users.find({"_id": {"$in": head_ids}}, {"full_name": 1, "email": 1}):
            head_map[u["_id"]] = {"_id": u["_id"], "full_name": u["full_name"], "email": u["email"]}

    # Build lookup and tree
    by_id: dict[ObjectId, dict] = {}
    for d in docs:
        node = {
            "_id": d["_id"],
            "name": d["name"],
            "code": d["code"],
            "head": head_map.get(d.get("head_user_id")),
            "employee_count": d.get("employee_count", 0),
            "status": d.get("status", "active"),
            "children": [],
        }
        by_id[d["_id"]] = node

    roots: list[dict] = []
    for d in docs:
        node = by_id[d["_id"]]
        pid = d.get("parent_id")
        if pid and pid in by_id:
            by_id[pid]["children"].append(node)
        else:
            roots.append(node)

    return roots


# ---------------------------------------------------------------------------
# SUBTREE IDS
# ---------------------------------------------------------------------------

async def get_subtree_ids(db: AsyncIOMotorDatabase, org_id: ObjectId, dept_id: ObjectId) -> list[ObjectId]:
    """Return [dept_id] + all descendant department ids."""
    cursor = db.departments.find(
        {"org_id": org_id, "$or": [{"_id": dept_id}, {"ancestors": dept_id}]},
        {"_id": 1},
    )
    return [doc["_id"] async for doc in cursor]


# ---------------------------------------------------------------------------
# ROLLUP
# ---------------------------------------------------------------------------

async def _aggregate_carbon(
    db: AsyncIOMotorDatabase, dept_ids: list[ObjectId], period_filter: dict,
) -> dict:
    """Sum carbon_transactions for a set of department ids and period."""
    match = {"department_id": {"$in": dept_ids}, **period_filter}
    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": None,
            "total": {"$sum": "$amount_kg"},
            "emissions": {"$sum": {"$cond": [{"$gt": ["$amount_kg", 0]}, "$amount_kg", 0]}},
            "offsets": {"$sum": {"$cond": [{"$lt": ["$amount_kg", 0]}, "$amount_kg", 0]}},
        }},
    ]
    results = await db.carbon_transactions.aggregate(pipeline).to_list(1)
    if results:
        r = results[0]
        return {"total_carbon_kg": r["total"], "emissions_kg": r["emissions"], "offsets_kg": r["offsets"]}
    return {"total_carbon_kg": 0.0, "emissions_kg": 0.0, "offsets_kg": 0.0}


def _build_period_filter(year: int, month=None, from_year=None, from_month=None, to_year=None, to_month=None) -> dict:
    """Build a MongoDB filter for the period sub-document."""
    if from_year is not None and to_year is not None:
        conditions = []
        # from condition
        conditions.append({"$or": [
            {"period.year": {"$gt": from_year}},
            {"period.year": from_year, "period.month": {"$gte": from_month or 1}},
        ]})
        # to condition
        conditions.append({"$or": [
            {"period.year": {"$lt": to_year}},
            {"period.year": to_year, "period.month": {"$lte": to_month or 12}},
        ]})
        return {"$and": conditions}
    if month:
        return {"period.year": year, "period.month": month}
    return {"period.year": year}


async def get_rollup(
    db: AsyncIOMotorDatabase,
    org_id: ObjectId,
    dept_id_str: str,
    year: int,
    month: int | None = None,
    from_year: int | None = None,
    from_month: int | None = None,
    to_year: int | None = None,
    to_month: int | None = None,
) -> dict:
    """Compute live rollup for a department subtree."""
    dept_id = _oid(dept_id_str)
    await _load_dept(db, org_id, dept_id)
    subtree_ids = await get_subtree_ids(db, org_id, dept_id)
    pf = _build_period_filter(year, month, from_year, from_month, to_year, to_month)

    # Aggregate totals
    carbon = await _aggregate_carbon(db, subtree_ids, pf)

    # ESG scores — latest scores for subtree nodes
    esg = {"e": 0.0, "s": 0.0, "g": 0.0, "total": 0.0}
    score_pipeline = [
        {"$match": {"org_id": org_id, "department_id": {"$in": subtree_ids}}},
        {"$sort": {"period.year": -1, "period.month": -1}},
        {"$group": {
            "_id": "$department_id",
            "e": {"$first": "$e_score"},
            "s": {"$first": "$s_score"},
            "g": {"$first": "$g_score"},
            "total": {"$first": "$total_score"},
        }},
        {"$group": {
            "_id": None,
            "e": {"$avg": "$e"},
            "s": {"$avg": "$s"},
            "g": {"$avg": "$g"},
            "total": {"$avg": "$total"},
        }},
    ]
    score_results = await db.department_scores.aggregate(score_pipeline).to_list(1)
    if score_results:
        s = score_results[0]
        esg = {"e": round(s.get("e", 0) or 0, 1), "s": round(s.get("s", 0) or 0, 1),
               "g": round(s.get("g", 0) or 0, 1), "total": round(s.get("total", 0) or 0, 1)}

    # Compliance issues
    ci_count = await db.compliance_issues.count_documents({
        "org_id": org_id, "department_id": {"$in": subtree_ids},
        "status": {"$in": ["open", "in_progress"]},
    })

    # XP
    xp_pipeline = [
        {"$match": {"org_id": org_id, "department_id": {"$in": subtree_ids}}},
        {"$group": {"_id": None, "total": {"$sum": "$xp_delta"}}},
    ]
    xp_results = await db.xp_ledger.aggregate(xp_pipeline).to_list(1)
    xp_total = xp_results[0]["total"] if xp_results else 0

    # by_child breakdown
    direct_children = await db.departments.find(
        {"org_id": org_id, "parent_id": dept_id, "status": "active"},
    ).to_list(500)

    by_child: list[dict] = []
    for child in direct_children:
        child_subtree = await get_subtree_ids(db, org_id, child["_id"])
        child_carbon = await _aggregate_carbon(db, child_subtree, pf)
        # Child XP
        cxp = await db.xp_ledger.aggregate([
            {"$match": {"org_id": org_id, "department_id": {"$in": child_subtree}}},
            {"$group": {"_id": None, "total": {"$sum": "$xp_delta"}}},
        ]).to_list(1)
        by_child.append({
            "department_id": child["_id"],
            "name": child["name"],
            "total_carbon_kg": child_carbon["total_carbon_kg"],
            "emissions_kg": child_carbon["emissions_kg"],
            "offsets_kg": child_carbon["offsets_kg"],
            "xp_total": cxp[0]["total"] if cxp else 0,
        })

    # Build period info
    if from_year is not None:
        period_info = {
            "from": {"year": from_year, "month": from_month or 1},
            "to": {"year": to_year or year, "month": to_month or 12},
        }
    elif month:
        period_info = {"year": year, "month": month}
    else:
        period_info = {"year": year}

    return {
        "department_id": dept_id,
        "period": period_info,
        **carbon,
        "esg": esg,
        "xp_total": xp_total,
        "open_compliance_issues": ci_count,
        "by_child": by_child,
    }


# ---------------------------------------------------------------------------
# ARCHIVE
# ---------------------------------------------------------------------------

async def archive_department(db: AsyncIOMotorDatabase, user: dict, dept_id_str: str) -> dict:
    org_id = user["org_id"]
    dept_id = _oid(dept_id_str)
    await _load_dept(db, org_id, dept_id)

    if not has_role(user, "master_admin", "org_admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only admins can archive departments")

    # Check no active children
    active_child = await db.departments.find_one({
        "org_id": org_id, "parent_id": dept_id, "status": "active",
    })
    if active_child:
        raise HTTPException(status.HTTP_409_CONFLICT, "Archive or reassign child departments first")

    # Check no assigned users
    assigned = await db.users.find_one({"org_id": org_id, "department_id": dept_id})
    if assigned:
        raise HTTPException(status.HTTP_409_CONFLICT, "Reassign users from this department first")

    await db.departments.update_one(
        {"_id": dept_id}, {"$set": {"status": "archived", "updated_at": utcnow()}},
    )
    return {"message": "Department archived", "department_id": str(dept_id)}
