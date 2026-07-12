"""FastAPI application entrypoint.

Wires the MongoDB lifespan, CORS for the React frontend, and mounts routers under
the configured API prefix. Run with: uvicorn app.main:app --reload
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import db
from app.config import get_settings
from app.routers import health


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: open the Mongo connection. The app still boots if Mongo is down;
    # /health reports connectivity so the foundation is observable either way.
    await db.connect()
    yield
    # Shutdown
    await db.close()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],  # Vite dev server
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix=settings.api_prefix)

    @app.get("/")
    async def root() -> dict:
        return {"service": settings.app_name, "docs": "/docs", "health": f"{settings.api_prefix}/health"}

    return app


app = create_app()
