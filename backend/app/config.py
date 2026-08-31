from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(Path(__file__).resolve().parent.parent / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: Literal["development", "production", "test"] = "development"
    database_url: str
    admin_database_url: str | None = None
    app_db_role: str = "detechtico_app"
    jwt_secret: str
    jwt_issuer: str = "detechtico"
    jwt_audience: str = "detechtico-web"
    access_token_minutes: int = Field(default=10, ge=1, le=60)
    refresh_token_days: int = Field(default=7, ge=1, le=30)
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    trust_proxy: bool = False
    upload_dir: Path = Path("./uploads")
    max_upload_bytes: int = Field(default=26_214_400, ge=1, le=52_428_800)
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-5"
    analysis_require_llm: bool = False

    @field_validator("jwt_secret")
    @classmethod
    def jwt_secret_strength(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters")
        return value

    @field_validator("database_url", "admin_database_url")
    @classmethod
    def postgres_driver(cls, value: str | None) -> str | None:
        if not value:
            return value
        lowered = value.lower()
        if "supabase.co" in lowered:
            raise ValueError("Supabase is not used. Set DATABASE_URL to your own Postgres instance.")
        if value.startswith("postgresql://"):
            return "postgresql+psycopg://" + value[len("postgresql://") :]
        if value.startswith("postgres://"):
            return "postgresql+psycopg://" + value[len("postgres://") :]
        return value

    @model_validator(mode="after")
    def production_guards(self) -> "Settings":
        if self.environment == "production":
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE must be true in production")
            secret = self.jwt_secret.lower()
            if "change" in secret or "replace" in secret or "dev" in secret:
                raise ValueError("JWT_SECRET looks like a placeholder")
            if self.cookie_samesite == "none" and not self.cookie_secure:
                raise ValueError("SameSite=None requires Secure cookies")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
