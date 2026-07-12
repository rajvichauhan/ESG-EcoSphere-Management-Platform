"""FastAPI router for the department hierarchy and live ESG/carbon rollups (Phase 11)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.encoders import jsonable_encoder

from app.auth import get_current_user, check_department_permission
from app.db import get_db
from app.models.department import (
    DepartmentCreate,
    DepartmentUpdate,
    AssignHeadRequest,
    AddMemberRequest,
    RollupResponse,
    DepartmentTreeNode,
)
from app.services import department as department_service

router = APIRouter(prefix="/departments", tags=["departments"])


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


@router.get("/tree", response_model=list[DepartmentTreeNode])
async def get_department_tree(
    root_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Retrieve the department hierarchy tree for the user's organisation."""
    tree = await department_service.get_tree(db, user["org_id"], root_id)
    return _serialize(tree)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_new_department(
    data: DepartmentCreate,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Create a new root or sub-department in the caller's organisation."""
    doc = await department_service.create_department(db, user, data)
    return _serialize(doc)


@router.get("/{id}/subtree-ids", response_model=list[str])
async def get_department_subtree_ids(
    id: str,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Get the department ID and all descendant department IDs."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid department ID")
    dept_id = ObjectId(id)
    # Validate visibility
    await check_department_permission(user, dept_id)
    ids = await department_service.get_subtree_ids(db, user["org_id"], dept_id)
    return [str(x) for x in ids]


@router.get("/{id}/rollup", response_model=RollupResponse)
async def get_department_rollup(
    id: str,
    year: int,
    month: Optional[int] = Query(None, ge=1, le=12),
    from_year: Optional[int] = Query(None, ge=2000, le=2100),
    from_month: Optional[int] = Query(None, ge=1, le=12),
    to_year: Optional[int] = Query(None, ge=2000, le=2100),
    to_month: Optional[int] = Query(None, ge=1, le=12),
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Compute and retrieve the live rolled-up carbon and ESG metrics for the department subtree."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid department ID")
    dept_id = ObjectId(id)
    # Check permission
    await check_department_permission(user, dept_id)
    rollup = await department_service.get_rollup(
        db,
        user["org_id"],
        id,
        year,
        month,
        from_year,
        from_month,
        to_year,
        to_month,
    )
    return _serialize(rollup)


@router.post("/{id}/assign-head")
async def assign_department_head(
    id: str,
    data: AssignHeadRequest,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Assign a user to head a department and grant them the dept_head role."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid department ID")
    doc = await department_service.assign_head(db, user, id, str(data.user_id))
    return _serialize(doc)


@router.post("/{id}/members")
async def add_department_member(
    id: str,
    data: AddMemberRequest,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Associate an employee directly with a department."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid department ID")
    res = await department_service.add_member(db, user, id, str(data.user_id))
    return _serialize(res)


@router.patch("/{id}")
async def update_existing_department(
    id: str,
    data: DepartmentUpdate,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Modify details of a department or move its position in the tree hierarchy."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid department ID")
    doc = await department_service.update_department(db, user, id, data)
    return _serialize(doc)


@router.delete("/{id}")
async def soft_delete_department(
    id: str,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Soft delete (archive) a department if it contains no children or active members."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid department ID")
    res = await department_service.archive_department(db, user, id)
    return _serialize(res)
