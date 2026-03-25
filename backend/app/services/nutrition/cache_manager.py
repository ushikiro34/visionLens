"""
식약처 영양 데이터 Redis 캐시 매니저
- 버전 포함 캐시 키: nutrient:{food_name}:{db_version}
- 분기 업데이트 시 rotate_quarter()로 구버전 일괄 삭제
- TTL = 현재 분기 종료까지 자동 계산
"""
import json
from datetime import datetime
from calendar import monthrange
from typing import Optional
from redis.asyncio import Redis
from app.services.nutrition.mfds_api import MFDSApiClient, MFDSApiError

DB_VERSION_KEY = "mfds:db_version"
OFFLINE_FALLBACK_KEY = "offline:nutrients"


def _current_quarter() -> str:
    now = datetime.utcnow()
    q = (now.month - 1) // 3 + 1
    return f"{now.year}Q{q}"


def _seconds_until_quarter_end() -> int:
    now = datetime.utcnow()
    q = (now.month - 1) // 3 + 1
    end_month = q * 3
    last_day = monthrange(now.year, end_month)[1]
    end_dt = datetime(now.year, end_month, last_day, 23, 59, 59)
    return max(int((end_dt - now).total_seconds()), 86400)  # 최소 1일


class NutrientCacheManager:

    def __init__(self, redis: Redis, api_client: MFDSApiClient):
        self.redis = redis
        self.api = api_client

    async def get(self, food_name: str) -> Optional[dict]:
        """
        캐시 우선 조회 → 없으면 식약처 API 호출 후 캐시 저장
        오프라인 환경에서는 fallback 캐시 반환
        """
        version = await self._get_version()
        cache_key = f"nutrient:{food_name}:{version}"

        # 1순위: Redis 캐시
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        # 2순위: 식약처 API 호출
        try:
            result = await self.api.get_first(food_name)
            if result:
                result["source"] = f"식약처 식품영양성분DB ({version} 기준)"
                result["db_version"] = version
                ttl = _seconds_until_quarter_end()
                await self.redis.setex(cache_key, ttl, json.dumps(result, ensure_ascii=False))
                return result
        except MFDSApiError:
            # 3순위: 오프라인 fallback (앱 번들 경량 DB)
            return await self._offline_fallback(food_name)

        return None

    async def rotate_quarter(self, new_version: str) -> int:
        """
        분기 DB 업데이트 시 호출
        구버전 캐시 일괄 삭제 → 신버전으로 전환
        CI/CD 파이프라인에서 분기 시작일 자동 실행 권장
        """
        old_version = await self._get_version()
        deleted = 0
        async for key in self.redis.scan_iter(f"nutrient:*:{old_version}"):
            await self.redis.delete(key)
            deleted += 1
        await self.redis.set(DB_VERSION_KEY, new_version)
        return deleted

    async def _get_version(self) -> str:
        v = await self.redis.get(DB_VERSION_KEY)
        if v:
            return v  # decode_responses=True이므로 항상 str
        current = _current_quarter()
        await self.redis.set(DB_VERSION_KEY, current)
        return current

    async def _offline_fallback(self, food_name: str) -> Optional[dict]:
        """오프라인 앱 번들 경량 DB (500종) 조회"""
        fallback_raw = await self.redis.hget(OFFLINE_FALLBACK_KEY, food_name)
        if fallback_raw:
            data = json.loads(fallback_raw)
            data["source"] = "오프라인 로컬 캐시"
            return data
        return None

    async def seed_offline_db(self, entries: list[dict]):
        """앱 배포 시 경량 DB 번들 Redis에 초기 로드"""
        pipe = self.redis.pipeline()
        for entry in entries:
            pipe.hset(OFFLINE_FALLBACK_KEY, entry["food_name"], json.dumps(entry, ensure_ascii=False))
        await pipe.execute()
