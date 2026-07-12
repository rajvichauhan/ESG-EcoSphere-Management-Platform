"""Health-check endpoint. Confirms the app is up and reports MongoDB connectivity."""
from fastapi import APIRouter

from app.config import get_settings
from app.db import ping

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    settings = get_settings()
    db_ok = await ping()
    return {
        "status": "ok",
        "app": settings.app_name,
        "env": settings.app_env,
        "database": "connected" if db_ok else "unavailable",
        "storage_backend": settings.file_storage_backend,
    }
