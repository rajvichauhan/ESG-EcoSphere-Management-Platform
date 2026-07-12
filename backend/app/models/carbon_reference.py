"""Pydantic models for global carbon references and edit history (Phase 13)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

from app.models.common import MongoBaseDocument, PyObjectId


class CarbonReferenceCreate(BaseModel):
    country: str = Field(..., min_length=2, max_length=2, description="ISO 2-character country code")
    city: Optional[str] = None
    product_category: str = Field(..., min_length=1)
    product_name: Optional[str] = None
    description: Optional[str] = None
    year: int = Field(..., ge=2000, le=2100)
    carbon_value: float = Field(..., ge=0.0)
    unit: str = Field(..., pattern="^(per_unit|per_kg|per_kwh)$")
    source: Optional[str] = None


class CarbonReferenceUpdate(BaseModel):
    carbon_value: Optional[float] = Field(None, ge=0.0)
    description: Optional[str] = None
    source: Optional[str] = None
    unit: Optional[str] = Field(None, pattern="^(per_unit|per_kg|per_kwh)$")


class CarbonReferenceDocument(MongoBaseDocument):
    country: str
    city: Optional[str] = None
    product_category: str
    product_name: Optional[str] = None
    description: Optional[str] = None
    year: int
    carbon_value: float
    unit: str
    source: Optional[str] = None
    updated_by: PyObjectId

    model_config = {"arbitrary_types_allowed": True}


class ReferenceHistoryEntry(MongoBaseDocument):
    reference_id: PyObjectId
    ref_collection: str = Field(..., pattern="^(carbon_reference|city_profiles)$")
    old_value: float
    new_value: float
    old_source: Optional[str] = None
    new_source: Optional[str] = None
    changed_by: PyObjectId
    changed_at: datetime

    model_config = {"arbitrary_types_allowed": True}
