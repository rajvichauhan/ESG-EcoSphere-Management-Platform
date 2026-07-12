"""Pydantic models for the department hierarchy (Phase 11).

Departments form a recursive tree via ``parent_id`` / ``ancestors``.
The ``ancestors`` array is a materialised path from root down to (but not
including) the department itself — enabling single-query subtree fetches.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.common import MoneyField, OrgScopedDocument, PyObjectId
from app.models.user import UserBrief


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    code: str = Field(..., min_length=1, max_length=50)
    parent_id: Optional[PyObjectId] = None
    head_user_id: Optional[PyObjectId] = None
    employee_count: int = Field(0, ge=0)


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    employee_count: Optional[int] = Field(None, ge=0)
    status: Optional[str] = Field(None, pattern="^(active|archived)$")
    parent_id: Optional[PyObjectId] = None
    head_user_id: Optional[PyObjectId] = None


class AssignHeadRequest(BaseModel):
    user_id: PyObjectId


class AddMemberRequest(BaseModel):
    user_id: PyObjectId


# ---------------------------------------------------------------------------
# Document model
# ---------------------------------------------------------------------------

class DepartmentDocument(OrgScopedDocument):
    name: str
    code: str
    parent_id: Optional[PyObjectId] = None
    ancestors: list[PyObjectId] = Field(default_factory=list)
    head_user_id: Optional[PyObjectId] = None
    employee_count: int = 0
    status: str = "active"


# ---------------------------------------------------------------------------
# Tree node (nested response for GET /departments/tree)
# ---------------------------------------------------------------------------

class DepartmentTreeNode(BaseModel):
    id: PyObjectId = Field(alias="_id")
    name: str
    code: str
    head: Optional[UserBrief] = None
    employee_count: int = 0
    status: str = "active"
    children: list["DepartmentTreeNode"] = Field(default_factory=list)

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


# ---------------------------------------------------------------------------
# Rollup response
# ---------------------------------------------------------------------------

class RollupChildEntry(BaseModel):
    department_id: PyObjectId
    name: str
    total_carbon_kg: float = 0.0
    emissions_kg: float = 0.0
    offsets_kg: float = 0.0
    xp_total: int = 0

    model_config = {"arbitrary_types_allowed": True}


class ESGScores(BaseModel):
    e: float = 0.0
    s: float = 0.0
    g: float = 0.0
    total: float = 0.0


class RollupResponse(BaseModel):
    department_id: PyObjectId
    period: dict
    total_carbon_kg: float = 0.0
    emissions_kg: float = 0.0
    offsets_kg: float = 0.0
    esg: ESGScores = Field(default_factory=ESGScores)
    xp_total: int = 0
    open_compliance_issues: int = 0
    # Data attached directly to this department (not to any sub-department), so
    # `direct` + every `by_child` sums to the subtree total. Explains the rollup.
    direct: Optional[RollupChildEntry] = None
    by_child: list[RollupChildEntry] = Field(default_factory=list)

    model_config = {"arbitrary_types_allowed": True}
