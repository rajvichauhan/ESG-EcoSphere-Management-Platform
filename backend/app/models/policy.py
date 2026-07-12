"""Pydantic models for policies, acknowledgements, and NGO/public commenting."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

from app.models.common import OrgScopedDocument, PyObjectId


class PolicyDocument(OrgScopedDocument):
    title: str
    group: Optional[str] = None
    category: Optional[str] = None
    version: str
    body_text: Optional[str] = None
    file_id: Optional[str] = None
    document_url: Optional[str] = None
    published_at: datetime
    status: str = "published"  # published, draft, retired
    is_public: bool = True


class PolicyCreate(BaseModel):
    title: str = Field(..., min_length=1)
    group: Optional[str] = None
    category: Optional[str] = None
    version: str = Field("1.0", min_length=1)
    body_text: Optional[str] = None
    file_id: Optional[str] = None
    document_url: Optional[str] = None
    status: str = "published"
    is_public: bool = True


class PolicyCommentCreate(BaseModel):
    author_name: Optional[str] = None
    author_email: Optional[str] = None
    author_role: Optional[str] = None
    content: str = Field(..., min_length=1)


class PolicyCommentDocument(BaseModel):
    id: PyObjectId = Field(alias="_id")
    policy_id: PyObjectId
    org_id: Optional[PyObjectId] = None
    author_name: str
    author_email: str
    author_role: str
    content: str
    created_at: datetime
    updated_at: datetime

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class PolicyAcknowledgementDocument(BaseModel):
    id: PyObjectId = Field(alias="_id")
    policy_id: PyObjectId
    user_id: PyObjectId
    acknowledged_at: datetime

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}
