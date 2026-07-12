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
        from app.storage.b2 import B2Storage
        return B2Storage(
            key_id=settings.b2_key_id,
            app_key=settings.b2_app_key,
            endpoint=settings.b2_endpoint,
            bucket_name=settings.b2_bucket,
        )
    raise ValueError(f"Unknown FILE_STORAGE_BACKEND: {settings.file_storage_backend!r}")
