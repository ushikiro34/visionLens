from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "K-Food Vision Lens"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "kfood"
    POSTGRES_USER: str = "kfood_user"
    POSTGRES_PASSWORD: str = "kfood_password"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # 식약처 API
    MFDS_API_KEY: str = ""
    MFDS_BASE_URL: str = "http://openapi.foodsafetykorea.go.kr/api"
    MFDS_SERVICE_ID: str = "I2790"

    # HITL 트리거 임계값
    YOLO_CONFIDENCE_THRESHOLD: float = 0.85
    RAG_SIMILARITY_THRESHOLD: float = 0.78

    # ChromaDB
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CHROMA_COLLECTION: str = "kfood_nutrients"

    # YOLO 모델
    YOLO_MODEL_PATH: str = "models/kfood_yolov8s_seg.pt"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
