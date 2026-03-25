# [식약처 API 연동 코드 스니펫 가이드] K-Food Vision Lens
> 버전: 1.1 (2026년 3월 · 캐시 버전 관리 · 분기 무효화 전략 추가)

---

## 1. 개요

- **사용 API**: 식품의약품안전처_식품영양성분DB정보 (data.go.kr + food safety korea Open API)
- **핵심**: `DESC_KOR` 파라미터로 음식명 검색 → 100g당 영양 정보 반환
- **인증**: 공공데이터포털(data.go.kr)에서 API 키 발급 (무료, 비상업적 이용 가능)
- **캐싱 필수** (Redis 또는 SQLite) → 비용 0 + 속도 향상 + 일일 1,000회 제한 대응
- **HITL 연계**: API 결과는 항상 사용자 확인 후 저장

---

## 2. API 키 발급 방법 (5분 이내)

1. https://www.data.go.kr 접속 → 회원가입
2. 데이터 검색 → "식품의약품안전처_식품영양성분DB정보" (서비스 ID 15127578)
3. 활용신청 → 인증키 발급 (일 1,000회 제한 기본)

**기본 요청 URL 형식 (2026년 기준):**
```
http://openapi.foodsafetykorea.go.kr/api/{인증키}/I2790/json/1/100/DESC_KOR={음식명}
```

> 서비스 ID (I2790) 및 최신 엔드포인트는 data.go.kr에서 정기적으로 확인 권장

---

## 3. Python 기본 스니펫 (requests)

```python
import requests
from typing import Optional

def get_nutrient_from_mfds(food_name: str, api_key: str, page: int = 1) -> Optional[dict]:
    start = (page - 1) * 100 + 1
    end = page * 100
    url = f"http://openapi.foodsafetykorea.go.kr/api/{api_key}/I2790/json/{start}/{end}"
    params = {"DESC_KOR": food_name}

    try:
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()

        if data.get("I2790") and data["I2790"].get("row"):
            return data["I2790"]["row"][0]  # 첫 번째 결과 반환
        return None
    except Exception as e:
        print(f"API 오류: {e}")
        return None
```

---

## 4. FastAPI + Redis 캐싱 버전 (분기 자동 무효화 포함)

```python
import json
from datetime import datetime
from fastapi import APIRouter
from redis.asyncio import Redis

router = APIRouter()
redis_client = Redis(host="localhost", port=6379, db=0)

DB_VERSION_KEY = "mfds:db_version"

def _get_current_quarter() -> str:
    """현재 분기 문자열 반환 (예: 2026Q1)"""
    now = datetime.now()
    quarter = (now.month - 1) // 3 + 1
    return f"{now.year}Q{quarter}"

def _seconds_until_quarter_end() -> int:
    """현재 분기 종료까지 남은 초 계산"""
    now = datetime.now()
    quarter = (now.month - 1) // 3 + 1
    quarter_end_month = quarter * 3
    from calendar import monthrange
    last_day = monthrange(now.year, quarter_end_month)[1]
    end = datetime(now.year, quarter_end_month, last_day, 23, 59, 59)
    return max(int((end - now).total_seconds()), 86400)

@router.get("/nutrient/{food_name}")
async def get_nutrient(food_name: str):
    current_version = await redis_client.get(DB_VERSION_KEY)
    current_version = current_version.decode() if current_version else _get_current_quarter()

    # 버전 포함 캐시 키 → 분기 업데이트 시 자동 무효화
    cache_key = f"nutrient:{food_name}:{current_version}"
    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    result = get_nutrient_from_mfds(food_name, API_KEY)

    if result:
        ttl = _seconds_until_quarter_end()
        result["source"] = f"식약처 식품영양성분DB ({current_version} 기준)"
        await redis_client.setex(cache_key, ttl, json.dumps(result, ensure_ascii=False))
        return result

    return {"error": "매칭 실패 — 사용자 직접 보정 권장", "needs_hitl": True}


@router.post("/nutrient/rotate-quarter")
async def rotate_quarter(new_version: str):
    """
    분기 DB 업데이트 시 호출 → 구버전 캐시 일괄 삭제
    CI/CD 파이프라인에서 분기 시작일 자동 실행 권장
    """
    old_version = await redis_client.get(DB_VERSION_KEY)
    if old_version:
        old_version = old_version.decode()
        deleted = 0
        async for key in redis_client.scan_iter(f"nutrient:*:{old_version}"):
            await redis_client.delete(key)
            deleted += 1
        print(f"구버전 캐시 {deleted}건 삭제 완료: {old_version}")

    await redis_client.set(DB_VERSION_KEY, new_version)
    return {"status": "ok", "new_version": new_version}
```

---

## 5. 주요 반환 필드 (영양 정보 매핑용)

| 필드명 | 설명 |
|--------|------|
| FOOD_NM_KR | 음식명 |
| SERVING_SIZE | 1회 제공량 (g) |
| ENERGY | 에너지 (kcal) |
| NUTR_CONT1 | 탄수화물 (g) |
| NUTR_CONT2 | 단백질 (g) |
| NUTR_CONT3 | 지방 (g) |
| NUTR_CONT4 | 당류 (g) |
| NUTR_CONT5 | 나트륨 (mg) |
| BGN_YEAR | 데이터 구축 연도 (버전 관리용) |

---

## 6. HITL 연동 및 오류 처리

**매칭 실패 시 → 앱에서 "음식명 직접 입력 → 검색 재시도" 유도**

```python
if result is None:
    # HITL 강제 트리거
    return {
        "error": "매칭 실패",
        "needs_hitl": True,
        "suggestion": "음식명을 직접 입력하거나 선택해 주세요"
    }
```

**사용자 수정값 별도 로그 테이블에 저장 → 다음 RAG/DB 업데이트 시 반영**

---

## 7. 주의사항 (신뢰성 유지)

- API 키 절대 클라이언트 노출 금지 (Backend 전용 호출)
- 상업적 이용 시 data.go.kr 활용신청서에 명기 기재
- 모든 결과에 "식약처 (YYYY 분기) 기준" 배지 표시
- 일일 1,000회 제한 초과 예상 시 유료 플랜 또는 DB 전체 다운로드 후 로컬 임베딩 전환 고려

---

**작성일**: 2026년 3월
**버전**: 1.1 (분기 자동 캐시 무효화 · 버전 포함 캐시 키 · rotate-quarter 엔드포인트 추가)
