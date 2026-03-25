from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import create_tables
from app.core.redis import close_redis
from app.api.routes import analysis, nutrient

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시
    await create_tables()
    yield
    # 종료 시
    await close_redis()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="한국 음식 칼로리 분석 API — 식약처 공식 DB 기반 · Human-in-the-Loop",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # 프로덕션에서는 도메인 제한
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router)
app.include_router(nutrient.router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
