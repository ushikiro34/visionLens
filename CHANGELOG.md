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
