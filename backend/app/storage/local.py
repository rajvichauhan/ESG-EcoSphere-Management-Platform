"""Local-filesystem storage backend (Phase 1 default).

Stores blobs under a single configured root directory. The storage key is treated
as a relative path beneath that root; traversal outside the root is rejected.
"""
from __future__ import annotations

from pathlib import Path

from app.storage.base import StorageBackend


class LocalStorage(StorageBackend):
    def __init__(self, root_dir: str) -> None:
        self._root = Path(root_dir).resolve()
        self._root.mkdir(parents=True, exist_ok=True)

    def _resolve(self, key: str) -> Path:
        # Normalize and ensure the resolved path stays within the storage root.
        target = (self._root / key).resolve()
        if self._root not in target.parents and target != self._root:
            raise ValueError(f"Storage key escapes root: {key!r}")
        return target

    async def save(self, key: str, data: bytes, content_type: str | None = None) -> str:
        path = self._resolve(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return key

    async def load(self, key: str) -> bytes:
        path = self._resolve(key)
        if not path.is_file():
            raise FileNotFoundError(key)
        return path.read_bytes()

    async def delete(self, key: str) -> None:
        path = self._resolve(key)
        path.unlink(missing_ok=True)

    async def exists(self, key: str) -> bool:
        return self._resolve(key).is_file()
