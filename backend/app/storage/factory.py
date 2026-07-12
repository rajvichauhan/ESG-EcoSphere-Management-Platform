"""Selects the active storage backend from configuration.

Call get_storage() everywhere a backend is needed. To add Backblaze B2 later:
implement StorageBackend in b2.py and add a branch here keyed on "b2".
"""
from functools import lru_cache

from app.config import get_settings
from app.storage.base import StorageBackend
from app.storage.local import LocalStorage


@lru_cache
def get_storage() -> StorageBackend:
    settings = get_settings()
    backend = settings.file_storage_backend.lower()
    if backend == "local":
        return LocalStorage(settings.file_storage_local_dir)
    if backend == "b2":
        raise NotImplementedError(
            "Backblaze B2 backend arrives with Phase 4 file handling / migration."
        )
    raise ValueError(f"Unknown FILE_STORAGE_BACKEND: {settings.file_storage_backend!r}")
