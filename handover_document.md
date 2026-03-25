# [인수인계] 칼로리 분석 시스템 모듈 및 RAG 구축 가이드
> 버전: 1.1 (2026년 3월 · final_design v1.1 기준으로 전면 재작성)
> 대상: 핵심 로직을 처음 접하는 개발자 및 기획자

---

## 주의사항

> 이 문서 v1.0은 Gemini API 기반 구버전 설계를 참조하고 있었습니다.
> v1.1부터는 **YOLOv8-seg + 오픈소스 모델 + 식약처 DB 전용** 설계로 완전 재정렬합니다.
> Gemini 관련 내용은 현재 프로젝트 설계에서 제외되었습니다.

---

## 1. 시스템 설계 철학

이 시스템은 단순한 이미지 분류(Classification)를 넘어 **'공간 및 밀도 추론'**을 지향합니다.
'그릇'이라는 고정된 기준물(Anchor)과 **기준물체(젓가락/숟가락)**를 통해
사진 안에서 실제 물리량을 역산하는 것이 가장 큰 특징입니다.

**핵심 계산 원리:**
```
Mass(g) = Bowl_Full_Volume(ml) × 3D_Fill_Ratio × Density(g/ml)
Calories = Mass × (식약처 ENERGY / 100)
```

모든 변수는 DB 테이블 참조 + 버전·출처 기록 필수

---

## 2. 모듈별 구현 가이드라인

### 2.1 Vision Module (YOLOv8-seg)

**역할**: 음식 종류 검출 + 세그먼트 마스크 + confidence 점수 반환

**구현 핵심:**
- 모델: Ultralytics YOLOv8-seg (AI Hub 150종 한국 음식 fine-tune)
- 출력 필수 필드: `food_name`, `vessel_type`, `segment_mask`, `confidence`
- 기준물체 병행 검출: 젓가락(23cm) 또는 숟가락 → scale factor(px/cm) 산출
- vessel_type 분류: 공기/국그릇/뚝배기/접시 4대분류

**모바일 배포:**
```bash
# ONNX 변환 → TFLite 또는 ONNX Runtime
yolo export model=best.pt format=onnx opset=12
# 목표 크기: 15MB 이하 (YOLOv8s-seg 기준)
# 런타임: flutter_tflite 또는 onnxruntime_flutter
```

**주의사항:**
- 스테인리스 그릇 반사광 → OpenCV 노이즈 제거 전처리 필수
- 가려진 음식(가려진 재료): 식약처 표준 레시피 비율로 가중치 부여 추정

---

### 2.2 Fill Ratio 2D→3D 보정 (물리 연산 핵심)

> 2D 세그먼트 면적 ≠ 3D 부피. 그릇 형태에 따라 최대 40% 오차 발생
> 반드시 Shape Profile 보정 적용

**보정 파이프라인:**
```python
def calculate_3d_fill_ratio(
    segment_2d_ratio: float,
    vessel_type: str
) -> float:
    profile = BOWL_SHAPE_PROFILE[vessel_type]
    correction_map = profile["fill_correction"]

    # 가장 가까운 키값으로 보간
    keys = sorted(correction_map.keys())
    for i, k in enumerate(keys):
        if segment_2d_ratio <= k:
            if i == 0:
                return correction_map[k]
            # 선형 보간
            k_prev = keys[i-1]
            ratio = (segment_2d_ratio - k_prev) / (k - k_prev)
            return correction_map[k_prev] + ratio * (correction_map[k] - correction_map[k_prev])
    return correction_map[keys[-1]]
```

---

### 2.3 RAG 검색 최적화 (Data Module)

**하이브리드 검색 구조 (BM25 + Vector):**

```python
from rank_bm25 import BM25Okapi
import chromadb

class HybridFoodSearch:
    """
    BM25(키워드 30%) + Vector 유사도(70%) 병합
    "김치찌개" / "김치 찌개" / "김칫국" 혼동 방지
    임계값: 0.78 (HITL 트리거 기준)
    """

    VECTOR_THRESHOLD = 0.78
    BM25_WEIGHT = 0.3
    VECTOR_WEIGHT = 0.7

    def search(self, query: str, top_k: int = 5) -> dict:
        bm25_scores  = self._bm25_search(query, top_k * 2)
        vector_results = self._vector_search(query, top_k * 2)
        combined = self._rrf_merge(bm25_scores, vector_results)

        top_result = combined[0]
        return {
            "results": combined[:top_k],
            "needs_hitl": top_result["combined_score"] < self.VECTOR_THRESHOLD,
            "confidence": top_result["combined_score"],
        }
```

**임베딩 시 주의사항:**
- 식품명만 벡터화하지 말고 **주재료 + 조리방식** 텍스트 포함하여 벡터화
- 예: "김치찌개 | 재료: 김치, 돼지고기, 두부 | 조리: 끓이기"
- 이렇게 해야 의미 기반 검색에서 유사 음식 혼동 최소화

---

### 2.4 밀도(ρ) 테이블 (v1.1 통일 기준)

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
# v1.0 충돌 해소: 밥 0.8 vs 1.1 → 0.85로 통일
```

**보정 로직:** 사용자가 수정 완료할 경우, 해당 피드백을 기록하여
개인화된 Volume 보정 인수로 활용 가능 (익명화 후)

---

### 2.5 복합 음식 처리

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

## 3. 주의사항 및 한계점 (Edge Cases)

| 케이스 | 처리 방식 |
|--------|---------|
| 가려진 음식 | 식약처 표준 레시피 비율로 가중치 추정 + HITL 강제 |
| 반사 광원 (스테인리스) | OpenCV 노이즈 제거 전처리 후 재인식 |
| 기준물체 미검출 | 그릇 타입 기본 크기 사용 + HITL 트리거 |
| 복합 반찬 (비빔밥 등) | COMPOSITE_FOOD_MAP 참조 + 사용자 확인 |
| 오프라인 환경 | 로컬 캐시 → 앱 번들 500종 DB → HITL 직접 입력 순 |

---

## 4. 향후 로드맵

- 사용자 전용 그릇 등록 기능 (Custom Vessel Calibration)
- 소비 위치(GPS) 정보를 결합하여 해당 식당 메뉴 직접 매칭
- 재학습 주기: 6개월 또는 보정 데이터 5,000건 이상 수집 시

---

**작성일**: 2026년 3월
**버전**: 1.1 (Gemini 제거 · final_design v1.1 기준 재정렬 · 밀도 통일 · 하이브리드 RAG · Fill Ratio 보정 추가)
