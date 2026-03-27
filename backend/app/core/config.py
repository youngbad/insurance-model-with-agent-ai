from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    openai_api_key: str = ""
    database_url: str = "sqlite+aiosqlite:///./insurance.db"
    environment: str = "development"
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    vector_db_path: str = "./data/vector_store"
    knowledge_base_path: str = "./data/knowledge_base"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
