"""
식약처 식품영양성분DB API 클라이언트
- 엔드포인트: https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02
- 일 10,000회 제한 → 반드시 캐시 레이어와 함께 사용
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
        반환: 매칭된 식품 리스트 (영양 정보 포함)
        """
        if not self.api_key:
            raise MFDSApiError("식약처 API 키가 설정되지 않았습니다. MFDS_API_KEY 환경변수를 확인하세요.")

        url = f"{self.base_url}/{self.service_id}"
        params = {
            "serviceKey": self.api_key,
            "pageNo": page,
            "numOfRows": page_size,
            "type": "json",
            "FOOD_NM_KR": food_name,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()

                # 응답 구조: {"response": {"header": {...}, "body": {"items": [...]}}}
                body = data.get("response", {}).get("body", {})
                items = body.get("items", [])

                # items가 dict로 올 때 (단일 결과) 리스트로 정규화
                if isinstance(items, dict):
                    items = [items]

                return [self._normalize(item) for item in items if item]

            except httpx.TimeoutException:
                raise MFDSApiError("식약처 API 타임아웃 (10초)")
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
            "food_name":    row.get("FOOD_NM_KR", ""),
            "serving_size": self._to_float(row.get("SERVING_WT")),
            "energy_kcal":  self._to_float(row.get("ENERGY")),
            "carbs_g":      self._to_float(row.get("CARBOHYDRATE")),
            "protein_g":    self._to_float(row.get("PROTEIN")),
            "fat_g":        self._to_float(row.get("FAT")),
            "sugar_g":      self._to_float(row.get("SUGAR")),
            "sodium_mg":    self._to_float(row.get("SODIUM")),
            "maker_name":   row.get("MAKER_NM", ""),
            "data_year":    row.get("RESEARCH_YEAR", ""),
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
