import logging
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.database import create_tables
from app.core.redis import close_redis
from app.api.routes import analysis, nutrient
from app.services.vision.yolo_service import YOLOService
from app.services.vision.fill_ratio import FillRatioCalculator
from app.services.rag.hybrid_search import HybridFoodSearch
from app.services.nutrition.calculator import CalorieCalculator
from app.services.hitl.hitl_service import HITLService

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    app.state.yolo = YOLOService()
    app.state.fill_calc = FillRatioCalculator()
    app.state.rag = HybridFoodSearch()
    app.state.calorie_calc = CalorieCalculator()
    app.state.hitl_svc = HITLService()
    yield
    await close_redis()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="한국 음식 칼로리 분석 API — 식약처 공식 DB 기반 · Human-in-the-Loop",
    lifespan=lifespan,
)

# CORS 미들웨어는 가장 먼저 추가 (모든 응답에 헤더 적용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(analysis.router)
app.include_router(nutrient.router)


# 전역 예외 핸들러 — CORS 헤더가 없는 500 응답 방지
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s\n%s", exc, traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": f"서버 오류: {type(exc).__name__}: {exc}"},
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
