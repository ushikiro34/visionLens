# [UI/UX 설계서] K-Food Vision Lens 모바일 인터페이스
> 버전: 1.1 (2026년 3월 · Human-in-the-Loop 절대 룰 · 오프라인 모드 추가)

---

## 1. UI/UX 철학 및 핵심 원칙

**최우선 가치: Human-in-the-Loop (HITL)**
- AI 추정값은 항상 참고용이며, 사용자가 반드시 확인·승인·수정해야 최종 기록으로 저장됨
- AI 자동 저장 절대 금지

**목표 경험**: "최소한의 조작으로 최대한 정확한 기록" + "신뢰가 주는 투명성"

**디자인 시스템** (Material 3 기반 커스텀 · 2026 트렌드 반영):

| 역할 | 색상 | 의미 |
|------|------|------|
| Primary | #22C55E (Vibrant Green) | 건강·신뢰·자연 |
| Accent | #FACC15 (Sunny Yellow) | 에너지·보정 액션 강조 |
| Background | #F8FAFC (Soft Slate) | 시각적 피로 최소화 |
| Neutral | #64748B / #CBD5E1 | 보조 텍스트·구분선 |

- **곡률**: Rounded XL (24~32px) — 친근함 + 2026 모바일 트렌드
- **모션**: Micro-interactions + 햅틱 피드백 (HapticFeedback.medium)
- **접근성**: WCAG 2.2 AA 준수 (Contrast 4.5:1 이상, Dynamic Type, VoiceOver 지원)

---

## 2. UI 플로우 요약 (HITL 중심)

### Step 1 — 대시보드 → 즉시 촬영
- 홈 화면 중앙: 오늘 섭취 Donut Chart (Green-Yellow 그라디언트)
- Floating Action Button Extended → 1탭 카메라 모드 진입

### Step 2 — 촬영 & AR 가이드
- AR 오버레이: 식기류 외곽선 + 기준물체(젓가락/숟가락) 가이드라인 (Green 테두리)
- 기준물체 배치 안내 텍스트 표시 (scale factor 산출용)
- 자동 촬영 트리거: 그릇 안착 + 이전 프레임 대비 1.5초 이상 안정
- 수동 셔터 버튼 항상 노출 (실패 시 재촬영 유도)

### Step 3 — 분석 결과 확인 (Verification View)
- 화면 70% 이미지 + Overlay Layer (30% 투명 Green 마스킹)
- Floating Tags: 각 음식 영역 중심에 Rounded 태그 (이름 + Confidence %)
- 탭 → Horizontal Scroll 후보 리스트 (상위 5개 + "직접 검색" 버튼)
- **HITL 표시**: 태그 테두리 Confidence < 90% 시 "확인 필요" Yellow 배지 + 강제 탭 유도

### Step 4 — 보정 & 승인 (Human-in-the-Loop Core)
- 하단 30% 영역: 단일 가로 슬라이더 (Volume/양 조정)
- 슬라이더 드래그 시 실시간으로:
  - 마스킹 영역 두께 변화 (녹색 면적 시각화)
  - 칼로리/영양 수치 애니메이션 업데이트
- "식약처 기준 ±10% 오차 가능" 안내 Gray 텍스트 표시
- 우측 하단: **"이 값으로 저장" Primary Green 버튼**
  - HITL 완료 전까지 비활성 상태 유지 (툴팁: "보정 후 저장 가능")
  - 승인 전 취소 시 기록 저장 안 됨

### Step 5 — 저장 완료 & 피드백
- 저장 성공: 부드러운 Confetti + "기록 완료" → 캘린더 그리드로 전환 애니메이션
- 3초 후 Quick Feedback: "AI가 도움이 되었나요?" (좋아요/보정 많았어요/재촬영 필요)

---

## 3. 주요 화면 상세 설계

### 3.1 대시보드 (Home)

- 상단: Donut Chart (오늘 섭취 vs 목표, Green-Yellow 그라디언트)
- 중앙: "오늘의 식사 기록하기" 텍스트 + 카메라 FAB
- 하단: Horizontal Calendar Preview (최근 7일 썸네일 그리드, 가장 최근 식사 사진 우선)
- 내비게이션: Bottom Navigation Bar (Home / Calendar / History / Settings)

### 3.2 분석 & 확인 화면 (Verification View)

- 이미지 영역: Pinch Zoom + Pan 지원
- Overlay: Bounding Box + Semi-transparent Fill (#22C55E 30%)
- Tags: Rounded Pill (배경 White + Green 테두리, 텍스트 Bold)
  - 내용: "김치찌개 92%" / 탭 시 Bottom Sheet → Inline Horizontal Scroll 리스트
- Volume Slider: Custom Track (Gray → Green 그라디언트)
  - Thumb: Yellow 원형 + 햅틱
  - 실시간 레이블: "약 320g · 480kcal (식약처 기준)"
- 하단 버튼:
  - 좌: "재촬영" (Outline Gray)
  - 우: "저장" (Solid Green, HITL 완료 전 Disabled)

### 3.3 캘린더 그리드 (Calendar View)

- Layout: 세로 7열 그리드 (Material 3 Calendar 스타일)
- Cell: 날짜 숫자 + 대표 식사 썸네일 + 총 칼로리 Badge (Green/Yellow/Red 색상 코딩)
- 상세 보기: Bottom Sheet Drag-up
  - 아침/점심/저녁 탭 (Scrollable Horizontal Chips)
  - 각 식사: 사진 + 영양 Breakdown (Donut + List) + "수정" 버튼 (HITL 재진입)

### 3.4 기타 핵심 컴포넌트

**Smart Guide Overlay (촬영 시):**
- 식기류 외곽선 AR + "그릇을 평평하게" 텍스트 안내
- 젓가락/숟가락 기준물체 위치 가이드라인 (scale factor 산출 필수)

**직접 입력 모드:**
- 3글자 이상 검색 시 활성화 → 식약처 DB 자동 완성 + "직접 입력" 탭 제공

**신뢰성 표시:**
- 모든 결과 화면 우상단: "식약처 2026 Q1 데이터 · AI 신뢰도 94%" Badge

**오프라인 모드 표시:**
- 네트워크 없음 감지 시 상단 배너: "오프라인 모드 — 로컬 캐시 사용 중"
- 로컬 캐시 없는 항목 검색 시: "오프라인 상태 — 직접 입력으로 기록 가능"
- 온라인 복귀 시 로컬 큐 자동 동기화 + 완료 토스트 표시

---

## 4. 2026 트렌드 반영 및 최적화 포인트

- **Zero-UI 최소화**: 음성 입력/제스처는 선택 옵션만 (HITL 룰 저해 우려)
- **Personalization**: 사용자 보정 패턴 학습 → 다음 분석 시 기본 슬라이더 위치 조정 (익명화)
- **Performance**: 이미지 분석 후 즉시 로컬 캐시 → 오프라인에서도 HITL 보정 가능
- **접근성**: Color-blind 모드 (Green/Yellow 대비 강화), Large Text 지원
- **Flutter 구현 팁**: Riverpod + GoRouter + CustomPaint (오버레이) + Rive (애니메이션)

---

**작성일**: 2026년 3월
**버전**: 1.1 (기준물체 AR 가이드 추가 · 오프라인 모드 UI 추가 · 저장 버튼 HITL 조건 명세화)
