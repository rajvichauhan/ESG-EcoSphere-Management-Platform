"""FastAPI router for running and viewing overhead allocations (Phase 14)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_user
from app.db import get_db
from app.models.allocation import (
    AllocationRunRequest,
    OverheadAllocationDocument,
)
from app.services import allocation as allocation_service

router = APIRouter(prefix="/overhead-allocations", tags=["overhead-allocations"])


from app.utils import serialize_doc as _serialize


@router.get("", response_model=list[OverheadAllocationDocument])
async def list_runs(
    department_id: Optional[str] = None,
    year: Optional[int] = Query(None, ge=2000, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
    status: str = Query("current", pattern="^(current|superseded)$"),
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """List historical allocation runs."""
    dept_id = ObjectId(department_id) if department_id and ObjectId.is_valid(department_id) else None
    runs = await allocation_service.list_allocations(db, user["org_id"], dept_id, year, month, status)
    return _serialize(runs)


@router.post("/run", response_model=OverheadAllocationDocument, status_code=status.HTTP_201_CREATED)
async def trigger_allocation(
    data: AllocationRunRequest,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Run an overhead allocation mapping facility emissions to products by sales revenue ratios."""
    run = await allocation_service.run_allocation(db, user, data)
    return _serialize(run)


@router.get("/{id}", response_model=OverheadAllocationDocument)
async def get_single_run(
    id: str,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Retrieve details of a single allocation run."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid allocation run ID")
    run = await allocation_service.get_allocation(db, user["org_id"], id)
    return _serialize(run)
