# 보칼 (BoCal) — TODO

> 마지막 업데이트: 2026-03-31

## 완료된 작업

### 버그 수정 (백엔드)
- [x] fix #1: RRF combined_score → vector_similarity로 HITL threshold 비교
- [x] fix #2: 이중 커밋 패턴 제거 (get_db + HITLService)
- [x] fix #3: BM25 빈 코퍼스 에러 방어
- [x] fix #4: get_db() 타입 힌트 수정 (AsyncSession → AsyncGenerator)
- [x] fix #5: composite_breakdown 컬럼 연결
- [x] fix #6: MFDS API 키 미설정 시 명시적 에러 발생
- [x] fix #7: ChromaDB 동기 블로킹 호출 → run_in_executor
- [x] fix #8: 함수 내부 반복 settings import 제거
- [x] fix #9: Redis decode 불필요 분기 제거
- [x] fix #10: rotate_quarter 개별 delete → pipeline 배치 처리
- [x] fix #11: 서비스 싱글톤 lifespan으로 이동

### 인프라 / 배포
- [x] Railway PostgreSQL / Redis 연동 지원 (DATABASE_URL, REDIS_URL)
- [x] .gitignore 추가 (.env, 모델 파일 제외)
- [x] Dockerfile 프로덕션 설정 수정 (--reload 제거, PORT 환경변수)
- [x] Dockerfile apt 패키지 오류 수정 (libgl1-mesa-glx → libgl1)
- [x] Railway 배포 성공
- [x] Railway Variables — `DATABASE_URL` / `REDIS_URL` / `MFDS_API_KEY` 연결 확인 완료

### 식약처 API
- [x] 엔드포인트 변경 (I2790 → apis.data.go.kr/FoodNtrCpntDbInfo02)
- [x] XML 파싱 전환 및 AMT_NUM 필드 매핑 수정 (김치전 테스트 완료)

### 프론트엔드
- [x] Next.js 15 + Tailwind 웹앱 개발 (홈, 분석결과, HITL 승인 플로우)
- [x] Vercel 배포 완료
- [x] `NEXT_PUBLIC_API_URL` http → **https** 수정 (Mixed Content 버그 해결)

### 비전 / AI
- [x] YOLO mock → Claude Vision API (claude-haiku-4-5) fallback 구현
  - 모델 파일 없을 때 실제 이미지를 Claude에게 전송, 한국 음식 식별
  - `ANTHROPIC_API_KEY` 없으면 기존 mock 유지
  - `backend/app/services/vision/yolo_service.py` `_claude_vision_result()` 추가
  - `backend/requirements.txt` — `anthropic==0.40.0` 추가
  - `backend/app/core/config.py` — `ANTHROPIC_API_KEY` 설정 추가

### 브랜딩
- [x] K-Food Vision Lens → **보칼 (BoCal)** 리브랜딩
  - 슬로건: "보이는 칼로리" / "찍으면 칼로리가 보인다"
  - 메인 컬러: 버건디 `#8B2030`
  - 전체 이모지 → 인라인 SVG (2D flat style) 교체
  - 변경 파일: `layout.tsx`, `page.tsx`, `analysis/page.tsx`, `FoodCard.tsx`, `globals.css`, `config.py`, `main.py`, `.env.example`

---

## 남은 작업

### 🔴 즉시

- [ ] Railway Variables — `ANTHROPIC_API_KEY` 추가 (Anthropic Console에서 발급)
- [ ] 재배포 후 실제 음식 사진으로 Claude Vision 인식 테스트
- [ ] 배포 URL로 `GET /health` 및 `GET /docs` 접속 확인

### 🟡 중요 (기능 완성)

- [ ] ChromaDB 처리 방식 결정
  - 옵션 A: Railway Volume 마운트 (Hobby 플랜, 유료)
  - 옵션 B: 인메모리 유지 (재시작 시 RAG 데이터 초기화) ← 현재 적용 중
- [ ] API 엔드포인트 통합 테스트
  - `POST /api/v1/analysis/upload`
  - `POST /api/v1/analysis/{session_id}/approve`
  - `GET /api/v1/nutrient/search`
- [ ] 식약처 영양소 데이터 ChromaDB 초기 적재 스크립트 작성

### 🟢 이후 (서비스 완성)

- [ ] YOLO 모델 파인튜닝 (YOLO_FineTune_Guide.md 참조) — Claude Vision 대체 후 장기 과제
- [ ] 로깅 / 모니터링 설정 (Railway Metrics 또는 외부 서비스)
- [ ] 운영 환경 테스트 (부하 테스트, 커넥션 풀 검증)
