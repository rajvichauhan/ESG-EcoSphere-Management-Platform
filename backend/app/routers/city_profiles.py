"""FastAPI router for global city profiles reference data (Phase 12)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_user, require_roles
from app.db import get_db
from app.models.city_profile import (
    CityProfileCreate,
    CityProfileUpdate,
    CityProfileResponse,
)
from app.services import city_profile as city_profile_service

router = APIRouter(prefix="/city-profiles", tags=["city-profiles"])


from app.utils import serialize_doc as _serialize


@router.get("", response_model=list[CityProfileResponse])
async def list_profiles(
    country: Optional[str] = Query(None, min_length=2, max_length=2),
    city: Optional[str] = None,
    year: Optional[int] = Query(None, ge=2000, le=2100),
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """List all global city profiles, with optional country, city, or year filters."""
    profiles = await city_profile_service.list_city_profiles(db, country, city, year)
    return _serialize(profiles)


@router.post("", response_model=CityProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    data: CityProfileCreate,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Create a new global city profile. Master Admin or region sub-admin."""
    from app.services.sub_admin import check_reference_scope
    
    # Pre-validate scope for target create
    target_row = {"country": data.country.upper()}
    await check_reference_scope(user, target_row, "city_profiles")
    
    profile = await city_profile_service.create_city_profile(db, user, data)
    return _serialize(profile)


@router.patch("/{id}", response_model=CityProfileResponse)
async def update_profile(
    id: str,
    data: CityProfileUpdate,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Update a global city profile. Master Admin or region sub-admin."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid city profile ID")
    
    from app.services.sub_admin import check_reference_scope
    profile_id = ObjectId(id)
    old = await db.city_profiles.find_one({"_id": profile_id})
    if old is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "City profile not found")
        
    await check_reference_scope(user, old, "city_profiles")
    
    profile = await city_profile_service.update_city_profile(db, user, id, data)
    return _serialize(profile)
