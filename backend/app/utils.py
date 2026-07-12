"""Shared helpers used across routers/services."""

from __future__ import annotations

from datetime import datetime

from bson import ObjectId


def serialize_doc(doc):
    """Recursively convert ObjectId and datetime values into JSON-safe types.

    Used by every router to return MongoDB documents cleanly. Centralized here
    so the conversion rules stay consistent across the API.
    """
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    if isinstance(doc, dict):
        return {k: serialize_doc(v) for k, v in doc.items()}
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime):
        return doc.isoformat()
    return doc
