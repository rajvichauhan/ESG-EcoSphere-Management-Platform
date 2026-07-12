"""FastAPI router for product sales logs (Phase 14)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_user
from app.db import get_db
from app.models.allocation import (
    ProductSaleCreate,
    ProductSaleUpdate,
    ProductSaleDocument,
)
from app.services import allocation as allocation_service

router = APIRouter(prefix="/product-sales", tags=["product-sales"])


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


@router.get("", response_model=list[ProductSaleDocument])
async def list_sales_records(
    product_id: Optional[str] = None,
    year: Optional[int] = Query(None, ge=2000, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """List historical product sales records for the organisation."""
    pid = ObjectId(product_id) if product_id and ObjectId.is_valid(product_id) else None
    sales = await allocation_service.list_sales(db, user["org_id"], pid, year, month)
    return _serialize(sales)


@router.post("", response_model=ProductSaleDocument, status_code=status.HTTP_201_CREATED)
async def create_sales_record(
    data: ProductSaleCreate,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Log unit sales outputs and compute sales revenues."""
    sale = await allocation_service.record_sale(db, user, data)
    return _serialize(sale)


@router.patch("/{id}", response_model=ProductSaleDocument)
async def update_sales_record(
    id: str,
    data: ProductSaleUpdate,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Modify a historical sales record."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid sales record ID")
    sale = await allocation_service.update_sale(db, user, id, data)
    return _serialize(sale)
