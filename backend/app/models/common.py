"""Shared Pydantic types and base models used across all domain modules.

Every document stored in MongoDB carries an ObjectId as ``_id``.  Pydantic v2
cannot serialise ``bson.ObjectId`` out of the box, so we define ``PyObjectId``
— a custom annotated type that accepts ObjectId or 24-char hex strings and
serialises to ``str`` in JSON responses.

Money, periods, source-refs, and timestamps are defined here once and
imported everywhere else.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Any, Optional

from bson import ObjectId
from pydantic import BaseModel, Field, GetJsonSchemaHandler, field_validator
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema


# ---------------------------------------------------------------------------
# PyObjectId — Pydantic v2-compatible ObjectId type
# ---------------------------------------------------------------------------

class _ObjectIdAnnotation:
    """Custom Pydantic v2 annotation that validates/serialises bson.ObjectId."""

    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type: Any, _handler: Any) -> core_schema.CoreSchema:
        def validate(value: Any) -> ObjectId:
            if isinstance(value, ObjectId):
                return value
            if isinstance(value, str) and ObjectId.is_valid(value):
                return ObjectId(value)
            raise ValueError(f"Invalid ObjectId: {value!r}")

        return core_schema.no_info_plain_validator_function(
            validate,
            serialization=core_schema.to_string_ser_schema(),
        )

    @classmethod
    def __get_pydantic_json_schema__(
        cls, _schema: core_schema.CoreSchema, handler: GetJsonSchemaHandler
    ) -> JsonSchemaValue:
        return {"type": "string", "pattern": "^[0-9a-fA-F]{24}$"}


PyObjectId = Annotated[ObjectId, _ObjectIdAnnotation]


# ---------------------------------------------------------------------------
# Common sub-document models
# ---------------------------------------------------------------------------

class MoneyField(BaseModel):
    """ISO-4217 monetary amount: ``{ amount, currency }``."""
    amount: float
    currency: str = Field(..., min_length=3, max_length=3, description="ISO 4217 currency code")


class PeriodField(BaseModel):
    """Year/month time period used across the platform."""
    year: int = Field(..., ge=2000, le=2100)
    month: int = Field(..., ge=1, le=12)


class PeriodRange(BaseModel):
    """A from/to period pair for range queries."""
    from_period: PeriodField = Field(..., alias="from")
    to_period: PeriodField = Field(..., alias="to")

    model_config = {"populate_by_name": True}


class SourceRef(BaseModel):
    """Generic polymorphic reference to another collection."""
    collection: str
    id: PyObjectId


# ---------------------------------------------------------------------------
# Base document / response helpers
# ---------------------------------------------------------------------------

def utcnow() -> datetime:
    """Return timezone-aware UTC now, consistent across the codebase."""
    return datetime.now(timezone.utc)


class MongoBaseDocument(BaseModel):
    """Fields common to every MongoDB document we read back."""
    id: PyObjectId = Field(alias="_id")
    created_at: datetime
    updated_at: datetime

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class OrgScopedDocument(MongoBaseDocument):
    """MongoBaseDocument plus org_id — used for all tenant-owned docs."""
    org_id: PyObjectId


class TimestampMixin(BaseModel):
    """Provides created_at / updated_at defaults for insert payloads."""
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


# ---------------------------------------------------------------------------
# Standard API response wrappers
# ---------------------------------------------------------------------------

class MessageResponse(BaseModel):
    """Generic single-message response."""
    message: str


class ErrorDetail(BaseModel):
    """Structured error body returned on 4xx responses."""
    detail: str
