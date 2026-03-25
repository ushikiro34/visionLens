# K-Food Vision Lens 최종 설계문서
> 버전: 1.1 (2026년 3월 기준 · 구조적 오류 수정 반영)
> 핵심 원칙: 데이터 신뢰성 최우선 · Human-in-the-Loop 절대 룰

---

## 작성 기준
- 데이터 신뢰성: 식약처 공식 DB + AI Hub 공공 이미지 데이터만 100% 사용
- Human-in-the-Loop (HITL): AI 추정값은 참고용, 사용자 확인·승인 후에만 최종 기록 저장 (AI 자동 저장 절대 금지)
- 비용 최소화: 외부 API(Gemini 등) 제거, 오픈소스 모델 + 로컬/캐싱 중심
- 한국 특화: 뚝배기·식판·국물 요리·반찬 복합 구성 인식 최적화

---

## 1. 프로젝트 목표 및 핵심 가치

**목표**
사용자가 촬영한 식판/그릇 사진으로 한국식 그릇·음식 기반 실제 섭취 칼로리·영양 정보를 제공하되,
모든 결과의 근거가 **공공기관 공식 데이터**에만 기반하고,
**사용자 주도 보정(Human-in-the-Loop)**을 통해 신뢰성을 극대화한다.

**가치 우선순위 (Non-negotiable)**
1. 데이터 신뢰성 (식약처·AI Hub 공공 데이터만)
2. Human-in-the-Loop 절대 원칙
3. 한국 음식문화 특화 정밀도 (뚝배기/식판/국물 요리/복합 반찬)
4. 법령·규정 준수 용이성
5. 운영 비용 최소화

---

## 2. 전체 아키텍처

```
[모바일 카메라] → 사진 촬영 + AR 가이드 (식기류 + 기준물체 참조)
        ↓
[Vision Engine] YOLOv8-seg (AI Hub 150종 한국 음식 fine-tune)
        ↓ 객체 검출 + 세그먼트 + confidence 점수
[Pre-process] 그릇 타입 판별 → 기준물체(젓가락/숟가락) scale factor 산출
        ↓
[Fill Ratio 보정] 2D 픽셀 면적 → 3D 부피 보정 계수 적용 (그릇 Shape Profile 참조)
        ↓
[RAG] dragonkue/snowflake-arctic-embed-l-v2.0-ko + ChromaDB
      하이브리드 검색: BM25(키워드) + Vector(의미) 병합 → 식약처 DB만 검색·매핑
        ↓
[Calculation Engine]
  Mass(g)     = Bowl_Full_Volume(ml) × 3D_Fill_Ratio × Density(g/ml)
  Calories    = Mass × (식약처 ENERGY / 100)
        ↓
[Human-in-the-Loop Layer] 사용자 확인·수정·승인 필수 단계
        ↓
[Final Output] 결과 + 출처 로그 + 신뢰도 + 수정 이력
        ↓ (Feedback Loop)
[Periodic Re-train] 사용자 보정 데이터 익명화 → YOLO fine-tune 반영
```

---

## 3. 핵심 데이터 소스 (신뢰성 보장)

| 데이터 유형 | 출처 | 세부 내용 | 신뢰성 근거 | 업데이트 주기 |
|------------|------|---------|-----------|------------|
| 학습 이미지 | AI Hub 한국 이미지(음식) (dataSetSn=79) | 150종 × ~1,000장 = 15만 장, 세그먼트 태깅 | 공공기관(AI Hub/KIST), 연구목적 공개 | 2018~ (지속 버전 지원) |
| 영양성분 DB | 식약처 식품영양성분DB (I2790 서비스) | 100g/ml 단위 공식 값, OPEN API 제공 | 정부 기관 운영, 분기 업데이트 | 분기 |
| 그릇 용량 DB | 내부 실측 + 한국식기 표준 기반 | 뚝배기(대/중/소), 공기, 양은냄비 등 50종 | 내부 검증 + 버전 관리 | 필요 시 업데이트 |
| 밀도 테이블 (ρ) | 식약처 데이터 제출 + 물리 실측 검증 | 아래 표준 테이블 참조 | 공식 DB + 실측 로그 | 연 1회 |

### 밀도(ρ) 표준 테이블 v1.1 (통일 기준)

```python
DENSITY_TABLE = {
    # 곡류
    "밥":       {"density": 0.85, "source": "식약처+실측", "version": "2026Q1"},
    "죽":       {"density": 0.95, "source": "실측",       "version": "2026Q1"},
    # 국/찌개 (고형물+국물 혼합 기준)
    "국물류":   {"density": 1.03, "source": "물리상수",   "version": "2026Q1"},
    "찌개류":   {"density": 1.04, "source": "실측",       "version": "2026Q1"},
    # 반찬
    "나물류":   {"density": 0.70, "source": "실측",       "version": "2026Q1"},
    "볶음류":   {"density": 0.80, "source": "실측",       "version": "2026Q1"},
    "구이류":   {"density": 0.90, "source": "실측",       "version": "2026Q1"},
}
# ※ v1.0 충돌 해소: 밥 0.8(final_design) vs 1.1(handover) → 0.85로 통일
```

---

## 4. Fill Ratio 2D→3D 보정 파이프라인 (신규)

> 기존 2D 픽셀 면적 비율을 그대로 사용하면 그릇 형태에 따라 최대 40% 오차 발생
> 그릇 Shape Profile + 기준물체 scale factor를 결합한 3단계 보정 적용

```
[Step 1] 기준물체 검출
  - 젓가락(23cm) 또는 숟가락 픽셀 길이 측정
  - scale factor(px/cm) 산출

[Step 2] 그릇 타입 분류 (YOLOv8-seg 병행 클래스)
  - 공기류 / 국그릇류 / 뚝배기류 / 접시류

[Step 3] Shape Profile 보정 계수 적용
  - 2D fill % → 3D volume % 변환
  - 그릇 타입별 보정 계수 테이블 참조

[Step 4] 최종 계산
  Mass = Bowl_Full_Volume × 3D_Fill_Ratio × Density
```

**그릇 Shape Profile 보정 계수 테이블:**

```python
BOWL_SHAPE_PROFILE = {
    "공기밥": {
        "full_volume_ml": 180,
        "shape": "hemisphere",
        "fill_correction": {0.3: 0.18, 0.5: 0.35, 0.7: 0.58, 0.9: 0.82}
    },
    "국그릇": {
        "full_volume_ml": 350,
        "shape": "cylinder_tapered",
        "fill_correction": {0.3: 0.25, 0.5: 0.45, 0.7: 0.65, 0.9: 0.85}
    },
    "뚝배기_대": {"full_volume_ml": 600, "shape": "cylinder", ...},
    "뚝배기_중": {"full_volume_ml": 450, "shape": "cylinder", ...},
    "양은냄비":  {"full_volume_ml": 900, "shape": "cylinder", ...},
    "접시_대":   {"full_volume_ml": 800, "shape": "flat",     ...},
}
```

---

## 5. Bowl Volume DB 구축 프로세스

> 문서에 "50종 DB"만 명시되어 있었으나, 구축 방법론 추가

**표준 측정 절차:**
1. 그릇 분류 기준 정의: 대분류(공기/국/뚝배기/접시) × 중분류(대/중/소)
2. 물 채우기 → ml 눈금으로 Full Volume 3회 측정 평균
3. 젓가락 옆 배치 레퍼런스 이미지 촬영 (정면/45도/조감 3방향)
4. `bowl_db_v1.0.json` 버전 파일로 관리 → 커뮤니티 제보로 점진적 확장

---

## 6. RAG 구성 (하이브리드 검색)

- **Embedding**: dragonkue/snowflake-arctic-embed-l-v2.0-ko (Hugging Face, 온디바이스 가능)
- **Vector DB**: ChromaDB 또는 LanceDB
- **검색 방식**: BM25(키워드) + Vector 유사도 병합 (Reciprocal Rank Fusion)
  - BM25:Vector 비율 = 3:7
  - 통합 임계값: **0.78** (기존 0.92에서 하향 조정 — 과도한 HITL 트리거 방지)
- **목적**: "김치찌개" / "김치 찌개" / "김칫국" 혼동 방지

---

## 7. 복합 음식 처리 로직 (신규)

> 비빔밥·볶음밥·국밥 등 단일 식품 DB로 매핑 불가한 경우

```python
COMPOSITE_FOOD_MAP = {
    "비빔밥": {"base": [("밥", 0.55), ("나물류", 0.30), ("고추장", 0.10), ("참기름", 0.05)]},
    "볶음밥": {"base": [("밥", 0.65), ("채소류", 0.20), ("계란", 0.10), ("기름", 0.05)]},
    "국밥":   {"base": [("국물류", 0.60), ("밥", 0.30), ("고명", 0.10)]},
}
# 재료별 식약처 DB 조회 → 비율 가중 합산 → 최종 칼로리 산출
```

---

## 8. Human-in-the-Loop 구현 (절대 룰)

**트리거 조건**
- YOLO detection confidence < 0.85
- RAG 매칭 통합 점수 < 0.78
- Fill Ratio 추정 불안정 (기준물체 미검출)
→ 자동 "사용자 확인 필요" 모드 + Yellow 뱃지

**필수 인터페이스**
1. 음식명 태그 탭 → 후보 리스트 + 직접 검색
2. 그릇 종류 선택 (드롭다운)
3. Volume 슬라이드 조정 (실시간 칼로리 업데이트)
4. "이 값으로 저장" 버튼 (승인 전까지 임시 저장만)

**로그 필수 항목**
- AI 추정값 / 사용자 최종값 / 수정 타임스탬프 / 신뢰도 / 식약처 DB 버전

---

## 9. 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| Vision | Ultralytics YOLOv8-seg | AI Hub fine-tune |
| Embedding | dragonkue/snowflake-arctic-embed-l-v2.0-ko | 온디바이스 가능 |
| Vector DB | ChromaDB (또는 LanceDB) | |
| Backend | FastAPI + PostgreSQL + Redis | 로그·출처·HITL 이력 테이블 필수 |
| Frontend | Flutter | AR Overlay + Slider + 신뢰도 UI |
| AR | ar_flutter_plugin (ARCore/ARKit 통합) | Plane Detection |
| 온디바이스 추론 | flutter_tflite 또는 onnxruntime_flutter | YOLO ONNX→TFLite 변환 |
| 배포 | Docker + CI/CD | 분기 식약처 동기화 자동화 |

**YOLO 모바일 변환 파이프라인:**
```bash
yolo export model=best.pt format=onnx opset=12
# → TFLite 또는 ONNX Runtime으로 모바일 온디바이스 추론
# 목표 모델 크기: 15MB 이하 (YOLOv8s-seg 기준)
```

---

## 10. 모바일 UI/UX 설계 (HITL 중심)

- **컬러**: Primary #22C55E (Vibrant Green), Accent #FACC15 (Sunny Yellow), BG #F8FAFC
- **곡률**: Rounded XL (24~32px)
- **플로우**
  1. 대시보드 → 즉시 카메라 FAB 1탭
  2. AR 가이드 → 젓가락/숟가락 기준물체 배치 안내
  3. Verification View → Overlay 태그 + Confidence 표시
  4. 보정 → 단일 슬라이더 (마스킹 면적 변화 + 실시간 수치)
  5. 저장 → Confetti + 캘린더 그리드 선택
- **신뢰성 표시**: 모든 화면에 "식약처 [YYYY Q] 기준 · AI 신뢰도 XX%" Badge
- **오프라인**: 로컬 캐시 + HITL 보정 가능 (온라인 복귀 시 동기화)

---

## 11. 오프라인 폴백 전략 (신규)

```
[온라인]  RAG 검색 → 식약처 API → Redis 캐시 저장
    ↓ 네트워크 없음
[1순위]  Redis/로컬 SQLite 캐시 조회
[2순위]  앱 번들 내 핵심 500종 경량 DB
[3순위]  HITL 강제 → 사용자 직접 입력
→ 오프라인 보정 데이터는 로컬 큐 저장 → 온라인 복귀 시 서버 동기화
```

---

## 12. 개발·운영 계획

**초기 구축**
- AI Hub 데이터 fine-tune YOLO (Colab 무료 GPU)
- 식약처 DB 전체 임베딩 + ChromaDB 저장
- Bowl Volume DB 50종 실측 구축

**운영**
- 분기 식약처 API 동기화 자동 스크립트 (캐시 버전 로테이션 포함)
- 사용자 보정 데이터 익명화 수집 → 6개월 주기 재학습
- 감사 로그 3년 보관 (비식별화)

**리스크 대응**
- 인식 실패 → HITL 강제 + 재촬영 가이드
- 신뢰 라벨 → 출처·버전·링크 자동 표시

**성공 지표 (KPI)**
- HITL 보정률 평균 35% 이하
- 사용자 승인 후 오차율 ±10% 이내
- 데이터 출처 신뢰도 평균 95점 이상
- 식약처 DB 동기화 지연 0일

---

**작성일**: 2026년 3월
**버전**: 1.1 (v1.0 구조적 오류 수정 — 밀도 테이블 통일, Fill Ratio 2D→3D 보정, 하이브리드 RAG, Bowl DB 방법론, 오프라인 폴백 추가)
