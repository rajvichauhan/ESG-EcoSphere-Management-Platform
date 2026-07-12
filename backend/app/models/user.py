"""User and role models.

Roles are stored as an array of objects on the ``users`` document::

    roles: [
        { "role": "org_admin" },
        { "role": "sub_admin", "scope": { "kind": "region", "values": ["IN"] } }
    ]

This module defines the Pydantic shapes that validate and serialise those
entries, plus the user document itself.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.common import MongoBaseDocument, PyObjectId


# ---------------------------------------------------------------------------
# Role sub-document
# ---------------------------------------------------------------------------

class SubAdminScope(BaseModel):
    """Scope constraint for sub_admin role entries."""
    kind: str = Field(..., pattern="^(region|sector)$")
    values: list[str] = Field(..., min_length=1)


class RoleEntry(BaseModel):
    """One role held by a user.

    Most roles carry no ``scope`` (org_admin, dept_head, employee …).
    The ``sub_admin`` role carries a mandatory ``scope`` object.
    """
    role: str
    scope: Optional[SubAdminScope] = None


# ---------------------------------------------------------------------------
# User document
# ---------------------------------------------------------------------------

class UserDocument(MongoBaseDocument):
    """Shape of a ``users`` collection document as read from MongoDB."""
    org_id: PyObjectId
    email: EmailStr
    password_hash: str
    full_name: str
    department_id: Optional[PyObjectId] = None
    roles: list[RoleEntry] = Field(default_factory=list)
    status: str = "active"
    xp_total: int = 0
    points_balance: int = 0


class UserResponse(BaseModel):
    """Safe serialisation of a user — no password_hash."""
    id: PyObjectId = Field(alias="_id")
    org_id: PyObjectId
    email: EmailStr
    full_name: str
    department_id: Optional[PyObjectId] = None
    roles: list[RoleEntry] = Field(default_factory=list)
    status: str
    xp_total: int = 0
    points_balance: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class UserBrief(BaseModel):
    """Minimal user info embedded in tree nodes, assignments, etc."""
    id: PyObjectId = Field(alias="_id")
    full_name: str
    email: EmailStr

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}
