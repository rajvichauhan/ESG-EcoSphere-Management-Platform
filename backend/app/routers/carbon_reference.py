"""FastAPI router for global carbon references and change history (Phase 13)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_user, require_roles
from app.db import get_db
from app.models.carbon_reference import (
    CarbonReferenceCreate,
    CarbonReferenceUpdate,
    CarbonReferenceDocument,
    ReferenceHistoryEntry,
)
from app.services import carbon_reference as carbon_reference_service

router = APIRouter(prefix="/carbon-reference", tags=["carbon-reference"])


from app.utils import serialize_doc as _serialize


@router.get("", response_model=list[CarbonReferenceDocument])
async def list_references(
    country: Optional[str] = Query(None, min_length=2, max_length=2),
    category: Optional[str] = None,
    product_name: Optional[str] = None,
    year: Optional[int] = Query(None, ge=2000, le=2100),
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """List global carbon reference intensity rows with optional query filters."""
    refs = await carbon_reference_service.list_carbon_references(db, country, category, product_name, year)
    return _serialize(refs)


@router.post("", response_model=CarbonReferenceDocument, status_code=status.HTTP_201_CREATED)
async def create_reference(
    data: CarbonReferenceCreate,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Create a new global carbon reference factor. Master Admin or scoped sub-admin."""
    from app.services.sub_admin import check_reference_scope
    
    target_row = {
        "country": data.country.upper(),
        "product_category": data.product_category,
    }
    await check_reference_scope(user, target_row, "carbon_reference")
    
    ref = await carbon_reference_service.create_carbon_reference(db, user, data)
    return _serialize(ref)


@router.patch("/{id}", response_model=CarbonReferenceDocument)
async def update_reference(
    id: str,
    data: CarbonReferenceUpdate,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Update a global carbon reference factor. Master Admin or scoped sub-admin."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid reference ID")
        
    from app.services.sub_admin import check_reference_scope
    ref_id = ObjectId(id)
    old = await db.carbon_reference.find_one({"_id": ref_id})
    if old is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Carbon reference row not found")
        
    await check_reference_scope(user, old, "carbon_reference")
    
    ref = await carbon_reference_service.update_carbon_reference(db, user, id, data)
    return _serialize(ref)


@router.get("/{id}/history", response_model=list[ReferenceHistoryEntry])
async def get_history(
    id: str,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Retrieve historical value adjustments for a carbon reference row."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid reference ID")
    history = await carbon_reference_service.get_reference_history(db, id)
    return _serialize(history)
