"""
식약처 식품영양성분DB API 클라이언트
- 서비스 ID: I2790
- 일 1,000회 기본 제한 → 반드시 캐시 레이어와 함께 사용
- API 키는 환경변수로만 관리 (클라이언트 노출 금지)
"""
import httpx
from typing import Optional
from app.core.config import get_settings

settings = get_settings()


class MFDSApiClient:

    def __init__(self):
        self.base_url = settings.MFDS_BASE_URL
        self.api_key = settings.MFDS_API_KEY
        self.service_id = settings.MFDS_SERVICE_ID

    async def search(
        self,
        food_name: str,
        page: int = 1,
        page_size: int = 10,
    ) -> list[dict]:
        """
        음식명으로 식약처 DB 검색
        반환: 매칭된 식품 리스트 (100g당 영양 정보 포함)
        """
        start = (page - 1) * page_size + 1
        end = page * page_size
        url = f"{self.base_url}/{self.api_key}/{self.service_id}/json/{start}/{end}"
        params = {"DESC_KOR": food_name}

        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()

                rows = (
                    data.get(self.service_id, {}).get("row", [])
                    if data.get(self.service_id)
                    else []
                )
                return [self._normalize(row) for row in rows]

            except httpx.TimeoutException:
                raise MFDSApiError("식약처 API 타임아웃 (5초)")
            except httpx.HTTPStatusError as e:
                raise MFDSApiError(f"식약처 API HTTP 오류: {e.response.status_code}")
            except Exception as e:
                raise MFDSApiError(f"식약처 API 오류: {e}")

    async def get_first(self, food_name: str) -> Optional[dict]:
        """가장 유사한 첫 번째 결과 반환. 없으면 None."""
        results = await self.search(food_name, page_size=5)
        return results[0] if results else None

    def _normalize(self, row: dict) -> dict:
        """API 반환 필드를 내부 표준 형식으로 변환"""
        return {
            "food_name":    row.get("DESC_KOR", ""),
            "serving_size": self._to_float(row.get("SERVING_SIZE")),
            "energy_kcal":  self._to_float(row.get("ENERGY")),
            "carbs_g":      self._to_float(row.get("NUTR_CONT1")),
            "protein_g":    self._to_float(row.get("NUTR_CONT2")),
            "fat_g":        self._to_float(row.get("NUTR_CONT3")),
            "sugar_g":      self._to_float(row.get("NUTR_CONT4")),
            "sodium_mg":    self._to_float(row.get("NUTR_CONT5")),
            "data_year":    row.get("BGN_YEAR", ""),
            "raw":          row,   # 원본 보존
        }

    @staticmethod
    def _to_float(value) -> Optional[float]:
        try:
            return float(value) if value not in (None, "", "N/A") else None
        except (ValueError, TypeError):
            return None


class MFDSApiError(Exception):
    pass
