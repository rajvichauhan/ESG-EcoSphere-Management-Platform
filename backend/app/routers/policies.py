"""FastAPI router for policies, acknowledgements, and policy comments (Governance)."""

from __future__ import annotations

from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.auth import get_current_user, decode_access_token
from app.db import get_db
from app.models.policy import (
    PolicyDocument,
    PolicyCreate,
    PolicyCommentDocument,
    PolicyCommentCreate,
)
from app.services import policy as policy_service
from app.utils import serialize_doc as _serialize

router = APIRouter(prefix="/policies", tags=["policies"])
acknowledgements_router = APIRouter(prefix="/policy-acknowledgements", tags=["policy-acknowledgements"])

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> Optional[dict]:
    """FastAPI dependency to extract optional bearer token user.
    If token is invalid or missing, returns None instead of raising HTTP 401.
    """
    if not credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id or not ObjectId.is_valid(user_id):
            return None
        db = get_db()
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user and user.get("status") == "active":
            return user
    except Exception:
        pass
    return None


class PolicyAcknowledgementRequest(BaseModel):
    policy_id: str


@router.get("", response_model=list[PolicyDocument])
async def list_policies(
    user: Optional[dict] = Depends(get_optional_current_user),
    db = Depends(get_db),
):
    """Retrieve policies. Authenticated users see their organization's policies,
    while unauthenticated guests see only public policies.
    """
    org_id = user["org_id"] if user else None
    policies = await policy_service.list_policies(db, org_id)
    return _serialize(policies)


@router.post("", response_model=PolicyDocument, status_code=status.HTTP_201_CREATED)
async def create_new_policy(
    data: PolicyCreate,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Publish a new governance policy (requires management permissions)."""
    policy = await policy_service.create_policy(db, user, data)
    return _serialize(policy)


@acknowledgements_router.post("", status_code=status.HTTP_201_CREATED)
async def acknowledge_policy(
    data: PolicyAcknowledgementRequest,
    user: dict = Depends(get_current_user),
    db = Depends(get_db),
):
    """Record that an employee has read/acknowledged a policy."""
    if not ObjectId.is_valid(data.policy_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid policy ID format")
    ack = await policy_service.acknowledge_policy(db, user, data.policy_id)
    return _serialize(ack)


@router.get("/{policy_id}/comments", response_model=list[PolicyCommentDocument])
async def list_policy_comments(
    policy_id: str,
    db = Depends(get_db),
):
    """List comments posted on a specific policy (chronological)."""
    comments = await policy_service.list_comments(db, policy_id)
    return _serialize(comments)


@router.post("/{policy_id}/comments", response_model=PolicyCommentDocument, status_code=status.HTTP_201_CREATED)
async def create_policy_comment(
    policy_id: str,
    data: PolicyCommentCreate,
    user: Optional[dict] = Depends(get_optional_current_user),
    db = Depends(get_db),
):
    """Add a new comment to a policy. Supports guests/NGOs and authenticated users."""
    comment = await policy_service.create_comment(db, policy_id, user, data)
    return _serialize(comment)
