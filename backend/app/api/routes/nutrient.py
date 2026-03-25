"""
영양 정보 API 라우터
GET  /api/v1/nutrient/{food_name}    — 식약처 DB 영양 정보 조회
POST /api/v1/nutrient/cache/rotate   — 분기 캐시 무효화 (CI/CD 자동 호출)
"""
from fastapi import APIRouter, Depends, HTTPException
from app.core.redis import get_redis
from app.schemas.analysis import CacheRotateRequest
from app.services.nutrition.mfds_api import MFDSApiClient
from app.services.nutrition.cache_manager import NutrientCacheManager

router = APIRouter(prefix="/api/v1/nutrient", tags=["nutrient"])


@router.get("/{food_name}")
async def get_nutrient(food_name: str, redis=Depends(get_redis)):
    """
    식약처 DB 영양 정보 조회 (캐시 우선)
    매칭 실패 시 needs_hitl=True 반환
    """
    cache_mgr = NutrientCacheManager(redis, MFDSApiClient())
    result = await cache_mgr.get(food_name)

    if not result:
        return {
            "error": "매칭 실패 — 사용자 직접 보정 권장",
            "needs_hitl": True,
            "food_name": food_name,
        }

    return result


@router.post("/cache/rotate")
async def rotate_cache(request: CacheRotateRequest, redis=Depends(get_redis)):
    """
    분기 DB 업데이트 시 구버전 캐시 일괄 삭제
    CI/CD 파이프라인에서 분기 시작일 자동 호출 권장
    """
    cache_mgr = NutrientCacheManager(redis, MFDSApiClient())
    deleted = await cache_mgr.rotate_quarter(request.new_version)
    return {
        "status": "ok",
        "new_version": request.new_version,
        "deleted_keys": deleted,
    }
