"""Pydantic models for sales, revenue allocation, and supply chain linking (Phase 14)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

from app.models.common import MoneyField, OrgScopedDocument, PeriodField, PyObjectId


# ---------------------------------------------------------------------------
# Product Sales
# ---------------------------------------------------------------------------

class ProductSaleCreate(BaseModel):
    product_id: PyObjectId
    period: PeriodField
    units_sold: float = Field(..., gt=0.0)
    unit_price: MoneyField


class ProductSaleUpdate(BaseModel):
    units_sold: Optional[float] = Field(None, gt=0.0)
    unit_price: Optional[MoneyField] = None


class ProductSaleDocument(OrgScopedDocument):
    product_id: PyObjectId
    department_id: Optional[PyObjectId] = None
    period: PeriodField
    units_sold: float
    unit_price: MoneyField
    revenue: MoneyField

    model_config = {"arbitrary_types_allowed": True}


# ---------------------------------------------------------------------------
# Overhead Allocation
# ---------------------------------------------------------------------------

class AllocationRunRequest(BaseModel):
    department_id: Optional[PyObjectId] = None
    period: PeriodField


class AllocationLine(BaseModel):
    product_id: PyObjectId
    revenue: MoneyField
    revenue_share: float = Field(..., ge=0.0, le=1.0)
    allocated_kg: float = Field(..., ge=0.0)

    model_config = {"arbitrary_types_allowed": True}


class OverheadAllocationDocument(OrgScopedDocument):
    department_id: Optional[PyObjectId] = None
    period: PeriodField
    overhead_total_kg: float
    revenue_total: MoneyField
    lines: list[AllocationLine]
    unallocated_kg: float = 0.0
    status: str = "current"
    run_by: PyObjectId

    model_config = {"arbitrary_types_allowed": True}


# ---------------------------------------------------------------------------
# Product Links (Supply Chain)
# ---------------------------------------------------------------------------

class ProductLinkCreate(BaseModel):
    requester_product_id: PyObjectId
    partner_org_id: PyObjectId
    partner_product_id: PyObjectId
    link_type: str = Field(..., pattern="^(component|carbon_credit)$")


class ProductLinkAction(BaseModel):
    action: str = Field(..., pattern="^(confirm|reject|revoke)$")


class ProductLinkShared(BaseModel):
    mode: str = "partner_per_unit_carbon"
    value_kg: Optional[float] = None
    snapshot_at: Optional[datetime] = None


class ProductLinkDocument(BaseModel):
    id: PyObjectId = Field(alias="_id")
    requester_org_id: PyObjectId
    requester_product_id: PyObjectId
    partner_org_id: PyObjectId
    partner_product_id: PyObjectId
    link_type: str
    status: str = "pending"
    shared: Optional[ProductLinkShared] = None
    requested_by: PyObjectId
    responded_by: Optional[PyObjectId] = None
    responded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class AdoptLinkedValueRequest(BaseModel):
    link_id: PyObjectId
