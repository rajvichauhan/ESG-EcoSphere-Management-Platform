"""MongoDB connection management using Motor (async driver).

A single client is created at app startup and shared across requests. Call
`connect()` on startup and `close()` on shutdown (wired in main.py's lifespan).
`get_db()` returns the database handle for use in routers/services.
"""
from __future__ import annotations

import logging
from urllib.parse import quote_plus, unquote
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import get_settings

logger = logging.getLogger(__name__)


class _Mongo:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


_mongo = _Mongo()


def validate_and_prepare_uri(uri: str) -> str:
    """Validate the MongoDB connection URI and ensure the password is URL-encoded correctly."""
    if not uri:
        raise ValueError("MongoDB URI is empty or not provided.")

    if not (uri.startswith("mongodb://") or uri.startswith("mongodb+srv://")):
        raise ValueError("Invalid MongoDB URI protocol. Must start with 'mongodb://' or 'mongodb+srv://'")

    # Split protocol prefix
    proto, _, rest = uri.partition("://")

    # If no authentication part is in the string, return as is
    if "@" not in rest:
        return uri

    # Detect multiple '@' characters which suggests a raw '@' in the password
    if rest.count("@") > 1:
        raise ValueError(
            "Malformed MongoDB connection string: Multiple '@' characters detected. "
            "If your password contains special characters (like '@'), they must be URL-encoded (e.g., %40)."
        )

    userinfo, _, host = rest.partition("@")
    if ":" not in userinfo:
        raise ValueError("Malformed MongoDB connection string: Missing password separator ':' in userinfo.")

    username, _, password = userinfo.partition(":")

    # Check for raw special characters in the password that would break standard URL parsers
    for char in ["/", "?", "#", " "]:
        if char in password:
            raise ValueError(
                f"Malformed MongoDB connection string: Raw special character '{char}' detected in password. "
                f"Please URL-encode special characters in the password (e.g., space as %20, / as %2F)."
            )

    try:
        decoded_password = unquote(password)
    except Exception as e:
        raise ValueError(f"Failed to URL-decode the password: {e}")

    # Ensure correct URL encoding of credentials
    safe_password = quote_plus(decoded_password)
    safe_username = quote_plus(unquote(username))

    return f"{proto}://{safe_username}:{safe_password}@{host}"


async def connect() -> None:
    settings = get_settings()
    raw_uri = settings.mongodb_uri

    # Validate and build safe URI
    uri = validate_and_prepare_uri(raw_uri)

    # Instantiate single shared client instance with connection pooling
    _mongo.client = AsyncIOMotorClient(
        uri,
        serverSelectionTimeoutMS=5000,
        maxPoolSize=50,  # Appropriate pooling for Atlas M0 free tier limits
        minPoolSize=1,
    )
    _mongo.db = _mongo.client[settings.mongodb_db_name]

    # Verify replica set connectivity
    try:
        await _mongo.client.admin.command("ping")
        # Log topology to confirm replica set / transaction compatibility
        topology = _mongo.client.topology_description
        logger.info(f"Connected to MongoDB. Topology Type: {topology.topology_type_name}")
        if topology.replica_set_name:
            logger.info(f"Replica Set Name: {topology.replica_set_name}")
    except Exception as e:
        logger.error(f"Failed to verify MongoDB connection: {e}")
        raise e


async def close() -> None:
    if _mongo.client is not None:
        _mongo.client.close()
        _mongo.client = None
        _mongo.db = None
        logger.info("MongoDB client connection closed.")


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
