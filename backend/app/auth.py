"""Authentication and authorisation helpers.

Provides:
- JWT access-token creation and verification.
- ``get_current_user``  — FastAPI dependency that decodes the bearer token
  and returns the ``users`` document dict.
- ``require_roles``     — dependency factory that gates on role membership.
- ``get_org_id``        — extracts the caller's org_id for query scoping.
- ``check_department_permission`` — self-service subtree permission check.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings
from app.db import get_db

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

import bcrypt


def hash_password(plain: str) -> str:
    pw_bytes = plain.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    pw_bytes = plain.encode("utf-8")
    hash_bytes = hashed.encode("utf-8")
    try:
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

_ALGORITHM = "HS256"

_bearer_scheme = HTTPBearer(auto_error=True)


def create_access_token(user_id: str, org_id: str, extra: dict[str, Any] | None = None) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "org": str(org_id),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_ttl_minutes),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.jwt_secret, algorithm=_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
        ) from exc


# ---------------------------------------------------------------------------
# get_current_user dependency
# ---------------------------------------------------------------------------

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> dict[str, Any]:
    """Decode the bearer token, look up the user in MongoDB, and return the
    full ``users`` document as a plain dict.  Raises 401 on any failure.
    """
    payload = decode_access_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id or not ObjectId.is_valid(user_id):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token missing subject")

    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    if user.get("status") != "active":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is not active")
    return user


# ---------------------------------------------------------------------------
# Role helpers
# ---------------------------------------------------------------------------

def _user_role_names(user: dict) -> set[str]:
    """Extract the set of role name strings from a user document."""
    return {r["role"] for r in user.get("roles", [])}


def require_roles(*allowed: str):
    """FastAPI dependency factory: returns a dependency that raises 403 unless
    the user holds at least one of the listed roles.

    Usage::

        @router.post("/...", dependencies=[Depends(require_roles("org_admin", "master_admin"))])
        async def handler(user=Depends(get_current_user)): ...
    """
    async def _check(user: dict = Depends(get_current_user)) -> dict:
        if not _user_role_names(user) & set(allowed):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Requires one of: {', '.join(allowed)}",
            )
        return user
    return _check


# ---------------------------------------------------------------------------
# Org-scoping
# ---------------------------------------------------------------------------

def get_org_id(user: dict) -> ObjectId:
    """Return the caller's ``org_id`` as an ObjectId.  Every tenant-owned
    query must include this filter.
    """
    return user["org_id"]


def org_filter(user: dict) -> dict:
    """Shorthand: ``{ "org_id": <caller's org> }``."""
    return {"org_id": user["org_id"]}


# ---------------------------------------------------------------------------
# Department / subtree permission helpers
# ---------------------------------------------------------------------------

async def get_subtree_ids(org_id: ObjectId, department_id: ObjectId) -> list[ObjectId]:
    """Return [department_id] + all descendant ids via the ancestors array."""
    db = get_db()
    cursor = db.departments.find(
        {"org_id": org_id, "$or": [{"_id": department_id}, {"ancestors": department_id}]},
        {"_id": 1},
    )
    return [doc["_id"] async for doc in cursor]


def has_role(user: dict, *roles: str) -> bool:
    """Check whether a user holds any of the given role names."""
    return bool(_user_role_names(user) & set(roles))


async def check_department_permission(
    user: dict,
    target_dept_id: ObjectId,
    *,
    allow_self: bool = True,
) -> None:
    """Raise 403 unless the user is master/org_admin or their department is
    the target or an ancestor of the target (self-service subtree rule).

    Position-only check — used for *read* access (rollups, subtree listing)
    where any user inside the subtree may view. For *write* access that the
    spec restricts to admins/dept-heads, use ``require_manage_permission``.

    When ``allow_self`` is True, the user's own department qualifies.
    """
    if has_role(user, "master_admin", "org_admin"):
        return  # unrestricted

    user_dept = user.get("department_id")
    if not user_dept:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No department assignment")

    if allow_self and user_dept == target_dept_id:
        return  # acting on own department

    # Check if user_dept is an ancestor of target_dept
    db = get_db()
    target = await db.departments.find_one(
        {"_id": target_dept_id, "org_id": user["org_id"]},
        {"ancestors": 1},
    )
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Department not found")

    if user_dept in (target.get("ancestors") or []):
        return  # user is in an ancestor department

    raise HTTPException(
        status.HTTP_403_FORBIDDEN,
        "You may only manage your own department subtree",
    )


async def require_manage_permission(
    user: dict,
    target_dept_id: ObjectId | None,
) -> None:
    """Authorize a *write* against a department-scoped (or org-level) resource.

    Rules (per spec — every Phase 12–14 write endpoint is "org_admin, or
    dept_head of the resource's department/ancestor"):

    - ``master_admin`` / ``org_admin`` may act anywhere in their org.
    - When ``target_dept_id`` is None (an org-level resource), only admins
      qualify — a dept_head has no org-wide authority.
    - Otherwise the caller must hold ``dept_head`` AND their own department
      must be the target or one of its ancestors (own-subtree rule).
    - Everyone else (plain employees, etc.) is denied.
    """
    if has_role(user, "master_admin", "org_admin"):
        return

    if target_dept_id is None:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Organization-level changes require an org_admin or master_admin role",
        )

    if not has_role(user, "dept_head"):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Requires an org_admin, master_admin, or dept_head role",
        )

    user_dept = user.get("department_id")
    if not user_dept:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No department assignment")

    if user_dept == target_dept_id:
        return

    db = get_db()
    target = await db.departments.find_one(
        {"_id": target_dept_id, "org_id": user["org_id"]},
        {"ancestors": 1},
    )
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Department not found")

    if user_dept in (target.get("ancestors") or []):
        return

    raise HTTPException(
        status.HTTP_403_FORBIDDEN,
        "You may only manage resources within your own department subtree",
    )
