"""FastAPI router for facilities management and readings computations (Phase 12)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_user
from app.db import get_db
from app.models.facility import (
    FacilityCreate,
    FacilityUpdate,
    FacilityDocument,
    FacilityReadingCreate,
    FacilityReadingDocument,
)
from app.services import facility as facility_service

router = APIRouter(prefix="/facilities", tags=["facilities"])


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


@router.get("", response_model=list[FacilityDocument])
async def list_org_facilities(
    department_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """List facilities in the caller's organisation, optionally filtered by department subtree."""
    dept_id = ObjectId(department_id) if department_id and ObjectId.is_valid(department_id) else None
    facs = await facility_service.list_facilities(db, user["org_id"], dept_id)
    return _serialize(facs)


@router.post("", response_model=FacilityDocument, status_code=status.HTTP_201_CREATED)
async def create_new_facility(
    data: FacilityCreate,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Register a new corporate facility/office."""
    fac = await facility_service.create_facility(db, user, data)
    return _serialize(fac)


@router.get("/{id}", response_model=FacilityDocument)
async def get_single_facility(
    id: str,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Retrieve details of a single facility."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid facility ID")
    fac = await facility_service.get_facility(db, user["org_id"], id)
    return _serialize(fac)


@router.patch("/{id}", response_model=FacilityDocument)
async def update_existing_facility(
    id: str,
    data: FacilityUpdate,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Modify details of a facility."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid facility ID")
    fac = await facility_service.update_facility(db, user, id, data)
    return _serialize(fac)


@router.delete("/{id}")
async def close_existing_facility(
    id: str,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Soft close a facility."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid facility ID")
    res = await facility_service.close_facility(db, user, id)
    return _serialize(res)


@router.post("/{id}/readings", response_model=FacilityReadingDocument)
async def log_facility_reading(
    id: str,
    data: FacilityReadingCreate,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Submit a monthly electricity/commute log for a facility.

    Runs calculations and updates the carbon ledger.
    """
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid facility ID")
    reading = await facility_service.log_reading(db, user, id, data)
    return _serialize(reading)


@router.get("/{id}/readings", response_model=list[FacilityReadingDocument])
async def list_facility_readings(
    id: str,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """List historical logs and computed carbon outputs for a facility."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid facility ID")
    readings = await facility_service.list_readings(db, user["org_id"], id)
    return _serialize(readings)
