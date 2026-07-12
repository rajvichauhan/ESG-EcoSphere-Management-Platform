"""Pydantic models for regional city profiles (Phase 12).

City profiles hold grid and commute assumptions for specific regions, enabling
automated location-based carbon footprinting.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field

from app.models.common import MoneyField, MongoBaseDocument, PyObjectId


class TransportMixEntry(BaseModel):
    mode: str = Field(..., pattern="^(car|bus|rail|two_wheeler|walk)$")
    share: float = Field(..., ge=0.0, le=1.0)
    factor_kg_per_km: float = Field(..., ge=0.0)


class CityProfileCreate(BaseModel):
    country: str = Field(..., min_length=2, max_length=2, description="ISO 2-character country code")
    city: str = Field(..., min_length=1)
    year: int = Field(..., ge=2000, le=2100)
    avg_commute_km_per_day: float = Field(..., ge=0.0)
    transport_mix: list[TransportMixEntry] = Field(..., min_length=1)
    grid_renewable_pct: float = Field(..., ge=0.0, le=1.0)
    grid_factor_kg_per_kwh: float = Field(..., ge=0.0)
    electricity_tariff_per_kwh: Optional[MoneyField] = None
    working_days_per_month: int = Field(..., ge=1, le=31)
    source: Optional[str] = None


class CityProfileUpdate(BaseModel):
    avg_commute_km_per_day: Optional[float] = Field(None, ge=0.0)
    transport_mix: Optional[list[TransportMixEntry]] = None
    grid_renewable_pct: Optional[float] = Field(None, ge=0.0, le=1.0)
    grid_factor_kg_per_kwh: Optional[float] = Field(None, ge=0.0)
    electricity_tariff_per_kwh: Optional[MoneyField] = None
    working_days_per_month: Optional[int] = Field(None, ge=1, le=31)
    source: Optional[str] = None


class CityProfileDocument(MongoBaseDocument):
    country: str
    city: str
    year: int
    avg_commute_km_per_day: float
    transport_mix: list[TransportMixEntry]
    grid_renewable_pct: float
    grid_factor_kg_per_kwh: float
    electricity_tariff_per_kwh: Optional[MoneyField] = None
    working_days_per_month: int
    source: Optional[str] = None
    updated_by: Optional[PyObjectId] = None


class CityProfileResponse(CityProfileDocument):
    pass
