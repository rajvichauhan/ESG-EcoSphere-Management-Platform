"""FastAPI application entrypoint.

Wires the MongoDB lifespan, CORS for the React frontend, and mounts routers under
the configured API prefix. Run with: uvicorn app.main:app --reload
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import db
from app.config import get_settings
from app.indexes import ensure_indexes
from app.routers import (
    health,
    departments,
    facilities,
    city_profiles,
    products,
    carbon_reference,
    product_sales,
    allocations,
    product_links,
    sub_admins,
    policies,
    auth,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: open the Mongo connection. The app still boots if Mongo is down;
    # /health reports connectivity so the foundation is observable either way.
    await db.connect()
    try:
        await ensure_indexes()
        print("MongoDB indexes verified successfully.")
    except Exception as exc:
        print(f"Error establishing MongoDB indexes: {exc}")
    yield
    # Shutdown
    await db.close()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://localhost:3000"],  # React dev servers
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix=settings.api_prefix)
    app.include_router(departments.router, prefix=settings.api_prefix)
    app.include_router(facilities.router, prefix=settings.api_prefix)
    app.include_router(city_profiles.router, prefix=settings.api_prefix)
    app.include_router(products.router, prefix=settings.api_prefix)
    app.include_router(carbon_reference.router, prefix=settings.api_prefix)
    app.include_router(product_sales.router, prefix=settings.api_prefix)
    app.include_router(allocations.router, prefix=settings.api_prefix)
    app.include_router(product_links.router, prefix=settings.api_prefix)
    app.include_router(sub_admins.router, prefix=settings.api_prefix)
    app.include_router(sub_admins.me_router, prefix=settings.api_prefix)
    app.include_router(policies.router, prefix=settings.api_prefix)
    app.include_router(policies.acknowledgements_router, prefix=settings.api_prefix)
    app.include_router(auth.router, prefix=settings.api_prefix)
    app.include_router(auth.users_router, prefix=settings.api_prefix)

    @app.get("/")
    async def root() -> dict:
        return {"service": settings.app_name, "docs": "/docs", "health": f"{settings.api_prefix}/health"}

    return app


app = create_app()
