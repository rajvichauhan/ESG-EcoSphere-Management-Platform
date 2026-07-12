"""FastAPI router for managing cross-company component links and value adoptions (Phase 14)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_user
from app.db import get_db
from app.models.allocation import (
    ProductLinkCreate,
    ProductLinkAction,
    ProductLinkDocument,
    AdoptLinkedValueRequest,
)
from app.services import product_link as product_link_service

router = APIRouter(tags=["product-links"])


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


@router.post("/product-links", response_model=ProductLinkDocument, status_code=status.HTTP_201_CREATED)
async def request_product_link(
    data: ProductLinkCreate,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Create a link request linking a local product/component to a supplier product."""
    link = await product_link_service.create_link(db, user, data)
    return _serialize(link)


@router.get("/product-links", response_model=list[ProductLinkDocument])
async def list_product_links(
    direction: Optional[str] = Query(None, pattern="^(incoming|outgoing)$"),
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """List product links relevant to the caller's organisation (incoming or outgoing)."""
    links = await product_link_service.list_links(db, user, direction)
    return _serialize(links)


@router.patch("/product-links/{id}", response_model=ProductLinkDocument)
async def respond_or_revoke_link(
    id: str,
    data: ProductLinkAction,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Approve, reject, or revoke a supply chain link request."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid link request ID")
    link = await product_link_service.respond_to_link(db, user, id, data.action)
    return _serialize(link)


@router.post("/products/{id}/adopt-linked-value")
async def adopt_linked_partner_value(
    id: str,
    data: AdoptLinkedValueRequest,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Apply a confirmed link's shared carbon footprint value to a local product."""
    if not ObjectId.is_valid(id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid product ID")
    prod = await product_link_service.adopt_linked_value(db, user, id, str(data.link_id))
    return _serialize(prod)
