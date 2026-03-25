# K-Food Vision Lens 기술문서
> 버전: 1.1 (2026년 3월 · Human-in-the-Loop 절대 룰 · 구조적 오류 수정)

---

## 1. 시스템 아키텍처 개요

```
[사용자] → 모바일 카메라 촬영
        ↓
[Vision] YOLOv8-seg (AI Hub 한국 음식 150종 fine-tune)
        ↓ 객체 검출 + 세그먼트 + 신뢰도 점수
[Pre-processing]
  - 그릇 종류 판별
  - 기준물체(젓가락/숟가락) scale factor 산출
  - Fill Ratio 2D → 3D 보정 (Shape Profile 적용)
        ↓
[RAG] dragonkue/snowflake-arctic-embed-l-v2.0-ko + ChromaDB
  - 하이브리드 검색: BM25(30%) + Vector(70%)
  - 식약처 공식 DB만 검색
        ↓
[Calculation Engine]
  Mass(g)  = Bowl_Full_Volume × 3D_Fill_Ratio × Density
  Calories = Mass × (식약처 ENERGY / 100)
        ↓
[Human-in-the-Loop Layer] 사용자 확인·수정 필수 단계
        ↓
[Final Output] 칼로리·영양소 + 출처 로그 + 신뢰도 + 수정 이력
        ↓
[Feedback Loop] 사용자 보정값 → 다음 fine-tune 데이터 후보
```

---

## 2. 핵심 데이터 소스 (신뢰성 보장)

| 데이터 종류 | 출처 | 내용 | 신뢰성 보장 방식 |
|------------|------|------|----------------|
| 학습 이미지 | AI Hub 한국 음식 이미지 데이터셋 | 150종, 약 15만 장, 세그먼트 어노테이션 | 공공데이터, 버전 관리 |
| 영양성분 DB | 식약처 식품영양성분DB | 100g/ml 단위 공식 값 | OPEN API + 분기 동기화 |
| 그릇 표준 용량 | 내부 실측 + 한국식기 표준 자료 | 뚝배기 대/중/소, 공기 3종 등 50종 | 버전 관리 테이블 + 검증 로그 |
| 밀도값 (ρ) | 식약처 데이터 제출 + 물리 실측 검증 | 아래 통일 테이블 참조 | 검증 로그 + 변경 이력 기록 |

---

## 3. Human-in-the-Loop 구현 스펙 (절대 룰)

**HITL 트리거 조건**
- YOLO detection confidence < 0.85
- RAG 통합 점수 < 0.78
- 기준물체 미검출 → Fill Ratio 추정 불안정
→ 자동으로 "사용자 확인 필요" 모드 지정

**필수 사용자 인터페이스 포인트**
1. 음식명 다중 선택/수정 (드롭다운 + 검색)
2. 그릇 종류 선택 (대분류/중분류)
3. Fill Ratio 슬라이더 (기본값 = AI 추정, 실시간 칼로리 업데이트)
4. "이 값으로 기록" 버튼 (승인 전까지 임시 저장만)

**로그 필수 항목**
- AI 추정값
- 사용자 최종 수정값
- 수정 수행 타임스탬프
- 신뢰도 점수
- 식약처 DB 버전

---

## 4. 핵심 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| Vision | Ultralytics YOLOv8-seg | |
| Embedding | dragonkue/snowflake-arctic-embed-l-v2.0-ko | |
| Vector DB | ChromaDB (또는 LanceDB) | |
| Backend | FastAPI + PostgreSQL | 로그·출처 테이블 필수 |
| Cache | Redis | 버전 포함 키 관리 |
| Frontend | Flutter | AR Overlay + Slider |
| AR | ar_flutter_plugin | ARCore/ARKit 통합 |
| 온디바이스 추론 | flutter_tflite / onnxruntime_flutter | YOLO ONNX→TFLite |
| 배포 | Docker + CI/CD | 분기 식약처 동기화 자동화 |

---

## 5. 계산 공식 (검증 가능)

```
Mass(g)     = Bowl_Full_Volume(ml) × 3D_Fill_Ratio(%) × Density(g/ml)
Calories    = Mass × (식약처 100g당 칼로리 / 100)
```

**밀도(ρ) 통일 테이블 v1.1:**

```python
DENSITY_TABLE = {
    "밥":     {"density": 0.85, "source": "식약처+실측", "version": "2026Q1"},
    "죽":     {"density": 0.95, "source": "실측",        "version": "2026Q1"},
    "국물류": {"density": 1.03, "source": "물리상수",    "version": "2026Q1"},
    "찌개류": {"density": 1.04, "source": "실측",        "version": "2026Q1"},
    "나물류": {"density": 0.70, "source": "실측",        "version": "2026Q1"},
    "볶음류": {"density": 0.80, "source": "실측",        "version": "2026Q1"},
    "구이류": {"density": 0.90, "source": "실측",        "version": "2026Q1"},
}
# ※ v1.0 충돌 해소: 밥 0.8 vs 1.1 → 0.85로 통일
```

모든 변수는 DB 테이블 참조 + 버전·출처 기록

---

## 6. 식약처 API 캐시 버전 관리 (신규)

```python
class NutrientCacheManager:
    """
    분기 DB 업데이트 시 캐시 자동 무효화 전략
    버전 포함 키: "nutrient:{food_name}:{db_version}"
    """
    DB_VERSION_KEY = "mfds:db_version"

    async def get_nutrient(self, food_name: str) -> dict:
        current_version = await self.redis.get(self.DB_VERSION_KEY) or "2026Q1"
        cache_key = f"nutrient:{food_name}:{current_version}"

        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        result = await self._fetch_from_mfds(food_name)
        if result:
            ttl = self._seconds_until_quarter_end()
            await self.redis.setex(cache_key, ttl, json.dumps(result))
        return result

    async def rotate_quarter(self, new_version: str):
        """분기 업데이트 시 구버전 캐시 일괄 삭제"""
        old_version = await self.redis.get(self.DB_VERSION_KEY)
        async for key in self.redis.scan_iter(f"nutrient:*:{old_version}"):
            await self.redis.delete(key)
        await self.redis.set(self.DB_VERSION_KEY, new_version)
```

---

## 7. 하이브리드 RAG 검색

```python
class HybridFoodSearch:
    """
    BM25(키워드) + Vector(의미) 결합
    임계값: 0.78 (기존 0.92 → 하향 조정)
    """
    VECTOR_THRESHOLD = 0.78
    BM25_WEIGHT = 0.3
    VECTOR_WEIGHT = 0.7

    def search(self, query: str, top_k: int = 5) -> dict:
        bm25_scores    = self._bm25_search(query, top_k * 2)
        vector_results = self._vector_search(query, top_k * 2)
        combined       = self._rrf_merge(bm25_scores, vector_results)
        top_result     = combined[0]
        return {
            "results":    combined[:top_k],
            "needs_hitl": top_result["combined_score"] < self.VECTOR_THRESHOLD,
            "confidence": top_result["combined_score"],
        }
```

---

## 8. 복합 음식 처리 (신규)

```python
COMPOSITE_FOOD_MAP = {
    "비빔밥": {"base": [("밥", 0.55), ("나물류", 0.30), ("고추장", 0.10), ("참기름", 0.05)]},
    "볶음밥": {"base": [("밥", 0.65), ("채소류", 0.20), ("계란", 0.10), ("기름", 0.05)]},
    "국밥":   {"base": [("국물류", 0.60), ("밥", 0.30), ("고명", 0.10)]},
}

def calculate_composite_calories(food_name: str, total_mass_g: float) -> dict:
    components = COMPOSITE_FOOD_MAP.get(food_name, {}).get("base", [])
    total_calories = 0
    breakdown = []
    for ingredient, ratio in components:
        mass = total_mass_g * ratio
        nutrient = get_nutrient_from_db(ingredient)
        cal = mass * (nutrient["ENERGY"] / 100)
        total_calories += cal
        breakdown.append({"ingredient": ingredient, "mass_g": round(mass, 1), "kcal": round(cal, 1)})
    return {"total_kcal": round(total_calories, 1), "breakdown": breakdown}
```

---

## 9. 오프라인 폴백 전략 (신규)

```
[온라인]  RAG 검색 → 식약처 API → Redis 캐시 저장
    ↓ 네트워크 없음
[1순위]  Redis / 로컬 SQLite 캐시 조회
[2순위]  앱 번들 내 핵심 500종 경량 DB
[3순위]  HITL 강제 → 사용자 직접 입력
→ 오프라인 보정 데이터는 로컬 큐 저장 → 온라인 복귀 시 서버 동기화
```

---

## 10. 운영·유지보수 계획

- 식약처 DB 분기 자동 동기화 스크립트 (캐시 버전 로테이션 포함)
- 사용자 보정 데이터 익명화 수집 → 다음 fine-tune ground truth 후보
- 모델 재학습 주기: 6개월 또는 보정 데이터 5,000건 이상 수집 시
- 감사 로그 보관 기간: 최소 3년 (개인정보 비식별화 후)

---

**작성일**: 2026년 3월
**버전**: 1.1 (밀도 통일 · 하이브리드 RAG · 캐시 버전 관리 · 복합 음식 처리 · 오프라인 폴백 추가)
