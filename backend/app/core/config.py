from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "INTELOPS - Intelligence Operations Platform"
    API_V1_STR: str = "/api/v1"

    SECRET_KEY: str = "changeme-please-generate-a-secure-random-key-here"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "user"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "comp_tracker"
    POSTGRES_PORT: str = "5432"

    BACKEND_CORS_ORIGINS: str = (
        "http://localhost:3000,http://localhost:3001,http://localhost:5173,"
        "http://127.0.0.1:3000,http://127.0.0.1:3001"
    )

    REDIS_URL: str = "redis://localhost:6379/0"

    # Whether to verify TLS certificates when scraping external sites.
    # Set to False in local dev environments where certificate chains may not be trusted.
    SCRAPER_VERIFY_SSL: bool = False

    @property
    def BACKEND_CORS_ORIGINS_LIST(self) -> List[str]:
        return [i.strip() for i in self.BACKEND_CORS_ORIGINS.split(",") if i.strip()]

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
