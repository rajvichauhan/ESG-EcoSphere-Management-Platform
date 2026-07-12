"""FastAPI router for products management, calculations, and production records (Phase 13)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_user
from app.db import get_db
from app.models.product import (
    ProductCreate,
    ProductUpdate,
    ProductDocument,
    CalculateCarbonRequest,
    RecordProductionRequest,
)
from app.services import product as product_service

router = APIRouter(prefix="/products", tags=["products"])


from app.utils import serialize_doc as _serialize


@router.get("", response_model=list[ProductDocument])
async def list_org_products(
    status: Optional[str] = Query(None, pattern="^(active|discontinued)$"),
    category: Optional[str] = None,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """List products in the caller's organisation, with status and category filters."""
    products = await product_service.list_products(db, user["org_id"], status, category)
    return _serialize(products)


@router.post("", response_model=ProductDocument, status_code=status.HTTP_201_CREATED)
async def create_new_product(
    data: ProductCreate,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Register a new product manufactured/sold by the corporate user."""
    prod = await product_service.create_product(db, user, data)
    return _serialize(prod)


@router.get("/{id}", response_model=ProductDocument)
async def get_single_product(
    id: str,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Retrieve details of a single product."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid product ID")
    prod = await product_service.get_product(db, user["org_id"], id)
    return _serialize(prod)


@router.patch("/{id}", response_model=ProductDocument)
async def update_existing_product(
    id: str,
    data: ProductUpdate,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Modify details of a product record."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid product ID")
    prod = await product_service.update_product(db, user, id, data)
    return _serialize(prod)


@router.delete("/{id}")
async def discontinue_existing_product(
    id: str,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Discontinue/soft-delete a product registry."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid product ID")
    res = await product_service.discontinue_product(db, user, id)
    return _serialize(res)


@router.post("/{id}/calculate-carbon")
async def trigger_carbon_calculation(
    id: str,
    data: CalculateCarbonRequest,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Trigger tiered reference lookup to calculate or update a product's carbon footprint."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid product ID")
    res = await product_service.calculate_carbon(db, user, id, data.year)
    return _serialize(res)


@router.post("/{id}/record-production")
async def record_product_production(
    id: str,
    data: RecordProductionRequest,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Log production output quantity for a period and update the carbon ledger."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid product ID")
    tx = await product_service.record_production(db, user, id, data)
    return _serialize(tx)
