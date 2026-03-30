"""
식약처 식품영양성분DB API 클라이언트
- 엔드포인트: https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02
- 응답 형식: XML (JSON 미지원)
- 일 10,000회 제한 → 반드시 캐시 레이어와 함께 사용
- API 키는 환경변수로만 관리 (클라이언트 노출 금지)

필드 매핑 (per 100g 기준):
  AMT_NUM1  수분(g)      AMT_NUM2  에너지(kcal)  AMT_NUM3  단백질(g)
  AMT_NUM4  지방(g)      AMT_NUM6  탄수화물(g)   AMT_NUM7  당류(g)
  AMT_NUM8  식이섬유(g)  AMT_NUM13 나트륨(mg)
"""
import re
import httpx
import xml.etree.ElementTree as ET
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
        if not self.api_key:
            raise MFDSApiError("식약처 API 키가 설정되지 않았습니다. MFDS_API_KEY 환경변수를 확인하세요.")

        url = f"{self.base_url}/{self.service_id}"
        params = {
            "serviceKey": self.api_key,
            "pageNo": page,
            "numOfRows": page_size,
            "FOOD_NM_KR": food_name,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return self._parse_xml(response.text)

            except httpx.TimeoutException:
                raise MFDSApiError("식약처 API 타임아웃 (10초)")
            except httpx.HTTPStatusError as e:
                raise MFDSApiError(f"식약처 API HTTP 오류: {e.response.status_code}")
            except ET.ParseError as e:
                raise MFDSApiError(f"식약처 API 응답 파싱 오류: {e}")
            except Exception as e:
                raise MFDSApiError(f"식약처 API 오류: {e}")

    def _parse_xml(self, xml_text: str) -> list[dict]:
        """XML 응답 파싱 → 정규화된 딕셔너리 리스트 반환"""
        root = ET.fromstring(xml_text)

        result_code = root.findtext("header/resultCode", "")
        if result_code != "00":
            result_msg = root.findtext("header/resultMsg", "알 수 없는 오류")
            raise MFDSApiError(f"식약처 API 오류 ({result_code}): {result_msg}")

        items = root.findall(".//item")
        return [self._normalize(item) for item in items]

    async def get_first(self, food_name: str) -> Optional[dict]:
        """가장 유사한 첫 번째 결과 반환. 없으면 None."""
        results = await self.search(food_name, page_size=5)
        return results[0] if results else None

    def _normalize(self, item: ET.Element) -> dict:
        """XML <item> 엘리먼트를 내부 표준 형식으로 변환"""

        def get(tag: str) -> Optional[str]:
            el = item.find(tag)
            return el.text if el is not None else None

        return {
            "food_name":    get("FOOD_NM_KR") or "",
            "food_code":    get("FOOD_CD") or "",
            "maker_name":   get("MAKER_NM") or "",
            "serving_size": self._parse_serving(get("SERVING_SIZE")),
            "energy_kcal":  self._to_float(get("AMT_NUM2")),
            "protein_g":    self._to_float(get("AMT_NUM3")),
            "fat_g":        self._to_float(get("AMT_NUM4")),
            "carbs_g":      self._to_float(get("AMT_NUM6")),
            "sugar_g":      self._to_float(get("AMT_NUM7")),
            "fiber_g":      self._to_float(get("AMT_NUM8")),
            "sodium_mg":    self._to_float(get("AMT_NUM13")),
            "data_year":    (get("RESEARCH_YMD") or "")[:4],
            "raw":          {child.tag: child.text for child in item},
        }

    @staticmethod
    def _parse_serving(value: Optional[str]) -> Optional[float]:
        """'100g', '1회(200ml)' 등에서 첫 번째 숫자 추출"""
        if not value:
            return None
        match = re.search(r"[\d.]+", value)
        return float(match.group()) if match else None

    @staticmethod
    def _to_float(value: Optional[str]) -> Optional[float]:
        try:
            return float(value) if value not in (None, "", "N/A") else None
        except (ValueError, TypeError):
            return None


class MFDSApiError(Exception):
    pass
