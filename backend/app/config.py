"""Application configuration, loaded from environment variables / .env.

Every secret and connection string is read from the environment. No credentials
or absolute paths are hardcoded anywhere else in the codebase.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # App
    app_name: str = "EcoSphere"
    app_env: str = "development"
    api_prefix: str = "/api"

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017/?replicaSet=rs0"
    mongodb_db: str = "ecosphere"

    # Auth (used from Phase 2)
    jwt_secret: str = "change-me"
    access_token_ttl_minutes: int = 30
    refresh_token_ttl_days: int = 30

    # Email / SMTP (used from Phase 2)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_app_password: str = ""
    smtp_from: str = ""

    # File storage
    file_storage_backend: str = "local"
    file_storage_local_dir: str = "./uploads"
    b2_key_id: str = ""
    b2_app_key: str = ""
    b2_bucket: str = ""
    b2_endpoint: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
