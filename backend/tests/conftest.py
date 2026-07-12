"""Conftest configuration for ESG platform backend tests."""

from __future__ import annotations

import asyncio
import pytest
from motor.motor_asyncio import AsyncIOMotorClient

from app import db
from app.config import get_settings
from app.indexes import ensure_indexes


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def setup_db():
    settings = get_settings()
    # Override database name for tests to prevent clobbering production/dev data
    settings.mongodb_db = "ecosphere_test"
    # Remove replica set parameter for standalone local MongoDB instances in test environments
    if "?replicaSet=" in settings.mongodb_uri:
        settings.mongodb_uri = settings.mongodb_uri.split("?")[0]
    elif "&replicaSet=" in settings.mongodb_uri:
        settings.mongodb_uri = settings.mongodb_uri.split("&replicaSet=")[0]

    client = AsyncIOMotorClient(settings.mongodb_uri)
    # Drop test database before running tests
    await client.drop_database("ecosphere_test")

    # Connect app DB handle
    await db.connect()
    # Build indexes
    await ensure_indexes()

    yield

    # Clean up and close
    await client.drop_database("ecosphere_test")
    await db.close()
    client.close()
