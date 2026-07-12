"""Pydantic models for corporate facilities and physical location activity readings (Phase 12)."""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field

from app.models.common import MoneyField, OrgScopedDocument, PeriodField, PyObjectId
from app.models.city_profile import TransportMixEntry


class FacilityCreate(BaseModel):
    name: str = Field(..., min_length=1)
    country: str = Field(..., min_length=2, max_length=2)
    city: str = Field(..., min_length=1)
    department_id: Optional[PyObjectId] = None
    employee_count: int = Field(..., ge=0)


class FacilityUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    country: Optional[str] = Field(None, min_length=2, max_length=2)
    city: Optional[str] = Field(None, min_length=1)
    department_id: Optional[PyObjectId] = None
    employee_count: Optional[int] = Field(None, ge=0)
    status: Optional[str] = None


class FacilityDocument(OrgScopedDocument):
    name: str
    country: str
    city: str
    department_id: Optional[PyObjectId] = None
    employee_count: int
    status: str = "active"


class ReadingInputs(BaseModel):
    electricity_kwh: Optional[float] = Field(None, ge=0.0)
    electricity_bill: Optional[MoneyField] = None
    employee_count_override: Optional[int] = Field(None, ge=0)


class ReadingAssumptions(BaseModel):
    avg_commute_km_per_day: float
    transport_mix: list[TransportMixEntry]
    grid_renewable_pct: float
    grid_factor_kg_per_kwh: float
    working_days_per_month: int
    employees_used: int


class ReadingComputed(BaseModel):
    commute_kg: float
    electricity_kg: float
    total_kg: float
    city_profile_id: PyObjectId
    is_approximation: bool
    assumptions: ReadingAssumptions

    model_config = {"arbitrary_types_allowed": True}


class FacilityReadingCreate(BaseModel):
    period: PeriodField
    inputs: ReadingInputs


class FacilityReadingDocument(OrgScopedDocument):
    facility_id: PyObjectId
    department_id: Optional[PyObjectId] = None
    period: PeriodField
    inputs: ReadingInputs
    computed: ReadingComputed
    created_by: PyObjectId

    model_config = {"arbitrary_types_allowed": True}
