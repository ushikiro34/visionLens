# 문서 최적화 변경사항 (v1.0 → v1.1)
> 작성일: 2026년 3월 · 구조적 오류 수정 + 기술적 보완 반영

---

## 수정 파일 목록

| 파일 | 변경 유형 | 주요 변경사항 |
|------|---------|-------------|
| final_design.md | 대폭 수정 | 밀도 통일, Fill Ratio 2D→3D 보정, Bowl DB 방법론, 하이브리드 RAG, 오프라인 폴백 |
| handover_document.md | 전면 재작성 | Gemini 제거, final_design v1.1 기준 재정렬, 밀도 통일, 하이브리드 RAG |
| tech_specification.md | 대폭 수정 | 캐시 버전 관리, 복합 음식 처리, 오프라인 폴백, YOLO 증강 설정 |
| YOLO_FineTune_Guide.md | 보완 수정 | 한국 음식 특화 증강, 클래스 불균형 처리, 도메인 갭 대응 |
| 식약처_API_연동_코드_스니펫_가이드.md | 보완 수정 | 분기 자동 캐시 무효화, 버전 포함 키 전략 |
| project_proposal.md | 소폭 수정 | 오프라인 리스크 대응 추가, KPI 표 정리 |
| ui_ux_design.md | 보완 수정 | 기준물체 AR 가이드, 오프라인 모드 UI, 저장 버튼 HITL 조건 명세화 |

---

## 구조적 수정 상세 (P0/P1)

### [P0] 밀도(ρ) 값 문서 통일
- **문제**: final_design(밥 0.8) vs handover_document(밥 1.1) 충돌 → 37.5% 오차
- **해결**: 0.85로 통일, version 필드 추가하여 분기별 추적 가능

### [P0] handover_document 전면 재작성
- **문제**: 구버전(Gemini API 기반) 설계 참조 → final_design과 방향 충돌
- **해결**: YOLOv8-seg + 오픈소스 중심, HITL 절대 원칙 기준으로 완전 재정렬

### [P1] Fill Ratio 2D→3D 보정 파이프라인 신규 추가
- **문제**: 2D 픽셀 면적 ≠ 3D 부피 → 그릇 형태에 따라 최대 40% 오차
- **해결**: 기준물체 scale factor + 그릇 Shape Profile 보정 계수 테이블 도입

### [P1] Bowl Volume DB 구축 프로세스 정의
- **문제**: "50종 DB" 명시만 있고 구축 방법 없음
- **해결**: 실측 절차, 분류 기준, 버전 관리 방법 상세화

### [P1] 하이브리드 RAG + 임계값 재조정
- **문제**: 단일 벡터 검색 + 임계값 0.92 → 과도한 HITL 트리거
- **해결**: BM25(30%) + Vector(70%) 병합, 임계값 0.78로 하향, RRF 머지 구현

---

## 기술적 보완 상세 (P2/P3)

### [P2] 식약처 API 캐시 버전 관리
- 버전 포함 캐시 키: `nutrient:{food_name}:{db_version}`
- 분기 업데이트 시 rotate_quarter 엔드포인트로 구버전 일괄 삭제

### [P2] Flutter AR + YOLO 추론 패키지 확정
- AR: `ar_flutter_plugin` (ARCore/ARKit 통합)
- YOLO 온디바이스: `flutter_tflite` 또는 `onnxruntime_flutter`
- 목표 모델 크기: 15MB 이하

### [P2] 복합 음식 처리 로직 신규 추가
- 비빔밥, 볶음밥, 국밥 등 COMPOSITE_FOOD_MAP 기반 재료 비율 가중 합산

### [P3] 오프라인 폴백 전략 신규 추가
- 1순위: Redis/로컬 SQLite 캐시
- 2순위: 앱 번들 내 500종 경량 DB
- 3순위: HITL 강제 직접 입력

### [P3] YOLO 데이터 증강 전략 추가
- 한국 음식 특화: hsv_v(반사광), degrees(촬영각도), mosaic(복합반찬), copy_paste
- 클래스 불균형 사전 확인 스크립트 추가
- 도메인 갭 대응 방법 명시

---

## 원본 파일 위치

원본 문서는 상위 폴더(`../`)에 그대로 보존됩니다.
이 폴더(`최적화_문서/`)의 파일들이 신규 프로젝트 기준 문서입니다.

---

# 구현 변경사항 (v1.1 → dev)
> 작성일: 2026-03-31 · 백엔드/프론트엔드 코드 구현 단계 · 최종 테스트 후 정식 버전으로 통합 예정

---

## 변경 파일 목록

| 파일 | 변경 유형 | 주요 내용 |
|------|---------|---------|
| `backend/app/data/soup_calories.py` | 신규 | 한국 국물 음식 고정 칼로리 테이블 (40+종) |
| `backend/app/data/bowl_profiles.py` | 수정 | 그릇 크기 5단계 확장 (초소/소/중/대/초대) |
| `backend/app/services/nutrition/calculator.py` | 수정 | 국물 음식 고정 칼로리 경로 추가, db_version 버그 수정 |
| `backend/app/services/vision/yolo_service.py` | 수정 | Claude Vision 프롬프트 개선 (반찬 제외, 분석불가 처리) |
| `backend/app/api/routes/history.py` | 신규 | 승인된 세션 기록 조회 API (목록 + 상세) |
| `backend/app/api/routes/analysis.py` | 수정 | db_version UnboundLocalError 수정 |
| `backend/app/main.py` | 수정 | history 라우터 등록 |
| `frontend/lib/api.ts` | 수정 | HistorySession/HistoryFood 타입, getHistory/getHistorySession 함수 추가 |
| `frontend/app/history/page.tsx` | 신규 | 기록 목록 페이지 (날짜별 그룹핑) |
| `frontend/app/history/[sessionId]/page.tsx` | 신규 | 기록 상세 페이지 |
| `frontend/app/analysis/[sessionId]/page.tsx` | 수정 | 복잡한 사진 안내 배너, 문구 수정 |
| `frontend/app/page.tsx` | 수정 | 그릇 종류 셀렉트박스, 크기 5단계 슬라이더, 제목/부제 수정 |
| `frontend/app/layout.tsx` | 수정 | 헤더 센터 정렬, 푸터 레이아웃 재구성, 카피라이트 추가 |

---

## 기능 변경 상세

### [기능] 기록 확인 페이지 신규 구현
- `GET /api/v1/history` — 승인된 세션 목록, 최신순, 페이지네이션 지원
- `GET /api/v1/history/{session_id}` — 세션 상세 + food_records eager load
- 프론트엔드: `/history` 날짜별 그룹 리스트, `/history/[sessionId]` 상세 카드

### [기능] 국물 음식 고정 칼로리 테이블
- **배경**: 설렁탕·뚝배기 등 국물 음식은 부피 기반 계산 오차가 큼 (국물 밀도 ≈ 물, 건더기 비율 불확실)
- `soup_calories.py`: 설렁탕(440kcal), 김치찌개(380kcal), 된장찌개(280kcal) 등 40+종 고정값
- `calculator.py`: `get_soup_calories()` 히트 시 `_calculate_soup()` 경로로 분기 → 부피 계산 생략
- 국물 음식 source 표기: `"국물 음식 고정 테이블 (국물+고기 1인분)"` 형식
- 국물 음식은 `needs_hitl = False` (신뢰도 높음)

### [기능] Claude Vision 프롬프트 개선 — 반찬 제외
- **배경**: 한국 밥상 사진에는 반찬이 많아 메인 음식 인식이 어려움
- 프롬프트 규칙 추가: 반찬(김치, 깍두기, 나물무침 등) 무시, 메인 요리 1가지만 반환
- 메인 요리 불명확 시 `food_name: "분석불가"` 반환
- `vessel_type` 선택지에 `양은냄비` 추가

### [기능] 복잡한 사진 안내 배너
- `food_name === "분석불가"` 감지 시 파란 정보 배너 표시
- 문구: "이 사진으로는 분석이 어렵습니다. 메인 음식을 가까이서 단독으로 촬영해주세요."
- 기존 HITL 경고(amber)는 분석불가가 아닌 경우에만 표시

### [기능] 그릇 선택 UI 개선
- 그릇 종류: 버튼 → `<select>` 셀렉트박스 (15종: 공기밥/국그릇/뚝배기/양은냄비/접시/라면그릇/쌀국수그릇/덮밥그릇/비빔밥그릇/우동그릇/냉면그릇/부대찌개냄비/전골냄비/식판/기타)
- 그릇 크기: 소/중/대 3단계 → 초소/소/중/대/초대 5단계 슬라이더 (1~5 숫자 레이블)

---

## 버그 수정 상세

### [버그] `UnboundLocalError: cannot access local variable 'db_version'`
- **원인**: `analysis.py`에서 `db_version = await cache_mgr._get_version()`이 루프 이후(111번째 줄)에 선언됐으나, 루프 안(90번째 줄)에서 참조
- **수정**: `db_version` 할당을 루프 시작 전으로 이동

### [버그] `식약처 식품영양성분DB(unknown 기준)` 표시
- **원인**: `calculator.py`에서 `db_version` 파라미터가 없어 fallback이 항상 `"unknown"`
- **수정**: `calculate()`에 `db_version: str = ""` 파라미터 추가, fallback 로직을 `nutrient_data.get("db_version") or db_version or "식약처DB"` 순서로 개선

---

## UI/UX 변경 상세

### 레이아웃
- 헤더: VO 로고 + "보이는 칼로리" 텍스트 가운데 정렬
- 푸터 상단 탭: 홈 / 기록 (아이콘 + 텍스트)
- 푸터 하단: VO 로고(좌) + "식약처 DB 참조 · 의료적 판단 불가 · 재미로 즐겨주세요." + `© 2026 보이는 칼로리 (VOcal)`

### 문구 변경
| 이전 | 이후 |
|------|------|
| 식사 분석 (h1 제목) | 삭제 |
| 음식 사진을 보고 칼로리를 분석합니다. | **음식사진으로 칼로리 분석합니다.** (볼드) |
| 이 값으로 저장 | 저장 |
| 확인 후 저장해야 최종 기록됩니다 (HITL) | 저장해야 최종 기록됩니다. |
| 새 식사 분석하기 | 메인페이지로 이동 |
| 승인된 식사 기록을 확인합니다. | 삭제 |

---

## 미완료 / 테스트 필요 항목

- [ ] 국물 음식 고정 칼로리 실제 분석 결과 확인 (설렁탕, 된장찌개 등)
- [ ] 분석불가 배너 실제 노출 확인 (복잡한 사진 업로드 시)
- [ ] 반찬 포함 사진에서 반찬 제외 여부 확인
- [ ] 기록 페이지 데이터 정상 조회 확인
- [ ] Railway 재배포 후 전체 플로우 E2E 테스트
