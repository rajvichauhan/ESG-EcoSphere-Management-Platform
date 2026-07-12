"""Pydantic models for corporate product registries and production tracking (Phase 13)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

from app.models.common import MoneyField, OrgScopedDocument, PeriodField, PyObjectId


class ProductCarbon(BaseModel):
    per_unit_kg: float = Field(..., ge=0.0)
    reference_id: Optional[PyObjectId] = None
    match_tier: int = Field(..., ge=0, le=4)
    is_approximation: bool
    unit: str
    calculated_at: datetime
    source_link_id: Optional[PyObjectId] = None

    model_config = {"arbitrary_types_allowed": True}


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1)
    description: Optional[str] = None
    production_country: str = Field(..., min_length=2, max_length=2)
    production_city: str = Field(..., min_length=1)
    unit_price: MoneyField
    department_id: Optional[PyObjectId] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = None
    production_country: Optional[str] = Field(None, min_length=2, max_length=2)
    production_city: Optional[str] = Field(None, min_length=1)
    unit_price: Optional[MoneyField] = None
    department_id: Optional[PyObjectId] = None
    status: Optional[str] = Field(None, pattern="^(active|discontinued)$")


class ProductDocument(OrgScopedDocument):
    name: str
    category: str
    description: Optional[str] = None
    production_country: str
    production_city: str
    unit_price: MoneyField
    carbon: Optional[ProductCarbon] = None
    status: str = "active"


class CalculateCarbonRequest(BaseModel):
    year: Optional[int] = Field(None, ge=2000, le=2100)


class RecordProductionRequest(BaseModel):
    period: PeriodField
    quantity_units: float = Field(..., gt=0.0)
