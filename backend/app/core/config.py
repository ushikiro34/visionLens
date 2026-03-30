from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "K-Food Vision Lens"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database — Railway는 DATABASE_URL을 직접 제공, 로컬은 개별 변수 사용
    DATABASE_URL: Optional[str] = None        # Railway: postgresql://user:pass@host:port/db
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "kfood"
    POSTGRES_USER: str = "kfood_user"
    POSTGRES_PASSWORD: str = "kfood_password"

    def get_database_url(self) -> str:
        """asyncpg 드라이버 prefix 보정 후 최종 URL 반환"""
        if self.DATABASE_URL:
            url = self.DATABASE_URL
            # Railway는 postgresql:// 또는 postgres:// 형태로 제공
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgresql://"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            return url
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # Redis — Railway는 REDIS_URL을 직접 제공, 로컬은 개별 변수 사용
    REDIS_URL: Optional[str] = None           # Railway: redis://default:pass@host:port
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # 식약처 API (공공데이터포털 — apis.data.go.kr)
    MFDS_API_KEY: str = ""
    MFDS_BASE_URL: str = "https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02"
    MFDS_SERVICE_ID: str = "getFoodNtrCpntDbInq02"

    # HITL 트리거 임계값
    YOLO_CONFIDENCE_THRESHOLD: float = 0.85
    RAG_SIMILARITY_THRESHOLD: float = 0.78

    # ChromaDB
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CHROMA_COLLECTION: str = "kfood_nutrients"

    # YOLO 모델
    YOLO_MODEL_PATH: str = "models/kfood_yolov8s_seg.pt"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
