"""FastAPI router for sub-admin roles and edit scope queries (Phase 15)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_user, require_roles
from app.db import get_db
from app.models.user import UserResponse, SubAdminScope
from app.services import sub_admin as sub_admin_service

router = APIRouter(prefix="/admin/sub-admins", tags=["sub-admins"])
me_router = APIRouter(prefix="/me", tags=["me"])


def _serialize(doc):
    """Recursively convert ObjectId and datetime objects for clean serialization."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [_serialize(d) for d in doc]
    if isinstance(doc, dict):
        return {k: _serialize(v) for k, v in doc.items()}
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime):
        return doc.isoformat()
    return doc


from pydantic import BaseModel
from app.models.common import PyObjectId

class ScopeGrantRequest(BaseModel):
    user_id: PyObjectId
    scope: SubAdminScope


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def grant_sub_admin_scope(
    data: ScopeGrantRequest,
    user: dict = Depends(require_roles("master_admin")),
    db = Depends(get_db),
):
    """Grant sub-admin region or sector scope to a user. Master Admin only."""
    res = await sub_admin_service.grant_scope(db, str(data.user_id), data.scope)
    return _serialize(res)


@router.delete("/{user_id}", response_model=UserResponse)
async def revoke_sub_admin_scope(
    user_id: str,
    kind: Optional[str] = Query(None, pattern="^(region|sector)$"),
    values: Optional[list[str]] = Query(None),
    user: dict = Depends(require_roles("master_admin")),
    db = Depends(get_db),
):
    """Revoke sub-admin scope from a user. Master Admin only."""
    res = await sub_admin_service.revoke_scope(db, user_id, kind, values)
    return _serialize(res)


@router.get("", response_model=list[UserResponse])
async def list_sub_admin_users(
    user: dict = Depends(require_roles("master_admin")),
    db = Depends(get_db),
):
    """List users carrying a sub-admin role in the organization."""
    users = await sub_admin_service.list_sub_admins(db, user["org_id"])
    return _serialize(users)


@me_router.get("/scope")
async def get_my_edit_scope(
    user: dict = Depends(get_current_user),
):
    """Retrieve the current user's effective edit scopes."""
    scope = sub_admin_service.get_user_scope(user)
    return _serialize(scope)
