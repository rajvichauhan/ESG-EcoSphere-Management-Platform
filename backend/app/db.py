"""MongoDB connection management using Motor (async driver).

A single client is created at app startup and shared across requests. Call
`connect()` on startup and `close()` on shutdown (wired in main.py's lifespan).
`get_db()` returns the database handle for use in routers/services.
"""
from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import get_settings


class _Mongo:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


_mongo = _Mongo()


async def connect() -> None:
    settings = get_settings()
    _mongo.client = AsyncIOMotorClient(
        settings.mongodb_uri, serverSelectionTimeoutMS=3000
    )
    _mongo.db = _mongo.client[settings.mongodb_db]


async def close() -> None:
    if _mongo.client is not None:
        _mongo.client.close()
        _mongo.client = None
        _mongo.db = None


def get_db() -> AsyncIOMotorDatabase:
    if _mongo.db is None:
        raise RuntimeError("Database not initialized. Did startup run?")
    return _mongo.db


async def ping() -> bool:
    """Return True if MongoDB responds to a ping, False otherwise."""
    if _mongo.client is None:
        return False
    try:
        await _mongo.client.admin.command("ping")
        return True
    except Exception:
        return False
