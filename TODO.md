# K-Food Vision Lens — TODO

> 마지막 업데이트: 2026-03-25

## 완료된 작업

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
- [x] Railway PostgreSQL / Redis 연동 지원 (DATABASE_URL, REDIS_URL)
- [x] .gitignore 추가 (.env, 모델 파일 제외)
- [x] Dockerfile 프로덕션 설정 수정 (--reload 제거, PORT 환경변수)
- [x] Dockerfile apt 패키지 오류 수정 (libgl1-mesa-glx → libgl1)
- [x] Railway 배포 성공 (visionLens Online)

---

## 남은 작업

### 🔴 즉시 (배포 정상화)

- [ ] Railway Variables — `REDIS_URL` reference variable 연결 확인
- [ ] Railway Variables — `MFDS_API_KEY` 실제 값 입력
- [ ] 배포 URL로 `GET /health` 및 `GET /docs` 접속 확인
- [ ] DB 테이블 자동 생성 확인 (lifespan create_tables 실행 여부)

### 🟡 중요 (기능 완성)

- [ ] ChromaDB 처리 방식 결정
  - 옵션 A: Railway Volume 마운트 (Hobby 플랜, 유료)
  - 옵션 B: 인메모리 유지 (재시작 시 RAG 데이터 초기화)
- [ ] YOLO 모델 처리 방식 결정
  - 옵션 A: 실제 모델 파일 업로드 + Railway Volume 마운트
  - 옵션 B: mock 모드 유지하고 다른 기능 먼저 검증
- [ ] API 엔드포인트 통합 테스트
  - `POST /api/v1/analysis/upload`
  - `POST /api/v1/analysis/{session_id}/approve`
  - `GET /api/v1/nutrient/search`

### 🟢 이후 (서비스 완성)

- [ ] 프론트엔드 개발 (ui_ux_design.md 기반, 현재 백엔드만 존재)
- [ ] YOLO 모델 파인튜닝 (YOLO_FineTune_Guide.md 참조)
- [ ] 식약처 영양소 데이터 ChromaDB 초기 적재 스크립트 작성
- [ ] 로깅 / 모니터링 설정 (Railway Metrics 또는 외부 서비스)
- [ ] 운영 환경 테스트 (부하 테스트, 커넥션 풀 검증)
