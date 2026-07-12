"""Storage backend interface.

All file access in the app goes through this interface. Files are addressed by an
opaque *storage key* (a relative path-like string, e.g. "org/<id>/csr/<uuid>.jpg"),
never an absolute filesystem path. Swapping local disk for Backblaze B2 later means
implementing this interface once (b2.py) and changing FILE_STORAGE_BACKEND — no other
code changes.
"""
from __future__ import annotations

from abc import ABC, abstractmethod


class StorageBackend(ABC):
    @abstractmethod
    async def save(self, key: str, data: bytes, content_type: str | None = None) -> str:
        """Persist `data` under `key`. Returns the stored key."""

    @abstractmethod
    async def load(self, key: str) -> bytes:
        """Return the bytes stored under `key`. Raises FileNotFoundError if absent."""

    @abstractmethod
    async def delete(self, key: str) -> None:
        """Remove the object at `key`. No error if it does not exist."""

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Return True if an object exists at `key`."""
