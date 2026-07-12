"""Service layer for regional and sector-scoped sub-administrator checks (Phase 15)."""

from __future__ import annotations

from typing import Optional
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.auth import has_role
from app.models.common import utcnow


async def check_reference_scope(
    user: dict, target_row: dict, ref_collection: str
) -> None:
    """Validate that the user is authorized to edit the target reference row.

    Allowed if:
    - User is master_admin.
    - User is sub_admin and has region scope containing target_row.country.
    - User is sub_admin and has sector scope containing target_row.product_category (carbon_reference only).
      If sector sub-admin tries to edit city_profiles, rejects with 403.
    """
    if has_role(user, "master_admin"):
        return

    if not has_role(user, "sub_admin"):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Insufficient privileges: requires master_admin or sub_admin roles.",
        )

    country = target_row.get("country")
    category = target_row.get("product_category")

    allowed = False
    reasons = []

    for role_entry in user.get("roles", []):
        if role_entry.get("role") != "sub_admin":
            continue

        scope = role_entry.get("scope")
        if not scope:
            continue

        kind = scope.get("kind")
        values = scope.get("values") or []

        if kind == "region":
            if country and country in values:
                allowed = True
                break
            else:
                reasons.append(f"region scope including {country}")
        elif kind == "sector":
            if ref_collection == "city_profiles":
                reasons.append("city profiles (which sector sub-admins cannot edit)")
            elif category and category in values:
                allowed = True
                break
            else:
                reasons.append(f"sector scope including {category}")

    if not allowed:
        scope_needed = " or ".join(reasons) if reasons else "an active scope"
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"Editing this record requires a {scope_needed}.",
        )


async def grant_scope(db: AsyncIOMotorDatabase, org_id: ObjectId, user_id_str: str, scope_data) -> dict:
    """Grant a region or sector sub-admin scope to a user in the caller's org."""
    user_id = ObjectId(user_id_str)
    # Org-scoped lookup: a master_admin may only manage users in their own org.
    user = await db.users.find_one({"_id": user_id, "org_id": org_id})
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    kind = scope_data.kind
    values = scope_data.values

    # Region values are ISO country codes — normalise to upper-case so scope
    # checks match the upper-cased `country` stored on reference rows, and
    # reject anything that isn't a 2-letter code.
    if kind == "region":
        normalised = []
        for v in values:
            code = v.strip().upper()
            if len(code) != 2 or not code.isalpha():
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    f"Region scope values must be 2-letter ISO country codes; got '{v}'",
                )
            normalised.append(code)
        values = normalised

    # Check duplicates
    existing_roles = user.get("roles", [])
    duplicate = any(
        r.get("role") == "sub_admin"
        and r.get("scope", {}).get("kind") == kind
        and set(r.get("scope", {}).get("values", [])) == set(values)
        for r in existing_roles
    )
    if duplicate:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This sub-admin scope has already been granted to the user",
        )

    new_role = {
        "role": "sub_admin",
        "scope": {
            "kind": kind,
            "values": values,
        },
    }

    await db.users.update_one(
        {"_id": user_id},
        {
            "$push": {"roles": new_role},
            "$set": {"updated_at": utcnow()},
        },
    )

    return await db.users.find_one({"_id": user_id})


async def revoke_scope(
    db: AsyncIOMotorDatabase, org_id: ObjectId, user_id_str: str, kind: Optional[str] = None, values: Optional[list[str]] = None
) -> dict:
    """Revoke a sub-admin scope from a user in the caller's org."""
    user_id = ObjectId(user_id_str)
    user = await db.users.find_one({"_id": user_id, "org_id": org_id})
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    # Normalise region values so revocation matches how the scope was stored.
    if kind == "region" and values is not None:
        values = [v.strip().upper() for v in values]

    roles = user.get("roles", [])

    if kind is None:
        # Revoke all sub-admins
        new_roles = [r for r in roles if r.get("role") != "sub_admin"]
    else:
        # Filter matching sub-admin
        new_roles = []
        for r in roles:
            if r.get("role") == "sub_admin":
                scope = r.get("scope", {})
                if scope.get("kind") == kind:
                    if values is None or set(scope.get("values", [])) == set(values):
                        continue  # matches filter -> remove it
            new_roles.append(r)

    await db.users.update_one(
        {"_id": user_id},
        {
            "$set": {"roles": new_roles, "updated_at": utcnow()},
        },
    )

    return await db.users.find_one({"_id": user_id})


async def list_sub_admins(db: AsyncIOMotorDatabase, org_id: ObjectId) -> list[dict]:
    """List users carrying a sub-admin role."""
    return await db.users.find({
        "org_id": org_id,
        "roles.role": "sub_admin",
    }, {"password_hash": 0}).sort("full_name", 1).to_list(1000)


def get_user_scope(user: dict) -> dict:
    """Compute effective union scope for a user."""
    if has_role(user, "master_admin"):
        return {"is_master": True, "region": [], "sector": []}

    region_set = set()
    sector_set = set()

    for role_entry in user.get("roles", []):
        if role_entry.get("role") == "sub_admin":
            scope = role_entry.get("scope")
            if scope:
                kind = scope.get("kind")
                vals = scope.get("values") or []
                if kind == "region":
                    region_set.update(vals)
                elif kind == "sector":
                    sector_set.update(vals)

    return {
        "is_master": False,
        "region": list(region_set),
        "sector": list(sector_set),
    }
