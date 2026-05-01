from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import os


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./test.db"
    SECRET_KEY: str = "change-this-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    STORAGE_PATH: str = "/storage/documents"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    APP_ENV: str = "development"
    APP_TITLE: str = "Document Workflow System"

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# Ensure storage directory exists
os.makedirs(settings.STORAGE_PATH, exist_ok=True)
