"""
분석 API 라우터
POST /api/v1/analysis/analyze   — 이미지 업로드 → 분석 세션 생성
POST /api/v1/analysis/correct   — HITL 수정값 적용
POST /api/v1/analysis/approve   — 최종 승인 (HITL 완료)
POST /api/v1/analysis/feedback  — Quick Feedback 저장
"""
import io
import uuid
import numpy as np
from PIL import Image
from fastapi import APIRouter, Request, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import get_redis
from app.core.config import get_settings
from app.schemas.analysis import (
    AnalysisSessionSchema, FoodResultSchema, NutrientSummarySchema,
    ApplyCorrectionRequest, ApproveRequest, FeedbackRequest,
)
from app.services.nutrition.mfds_api import MFDSApiClient
from app.services.nutrition.cache_manager import NutrientCacheManager

router = APIRouter(prefix="/api/v1/analysis", tags=["analysis"])
settings = get_settings()


@router.post("/analyze", response_model=AnalysisSessionSchema)
async def analyze_image(
    request: Request,
    file: UploadFile = File(..., description="식사 이미지 (jpg/png)"),
    vessel_type: str = "공기밥",
    size_hint: str = "중",
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    """
    이미지 분석 → 임시 세션 생성 (미승인 상태)
    HITL 절대 룰: 이 API만으로는 최종 기록 저장 안 됨
    """
    yolo = request.app.state.yolo
    fill_calc = request.app.state.fill_calc
    rag = request.app.state.rag
    calorie_calc = request.app.state.calorie_calc
    hitl_svc = request.app.state.hitl_svc

    # 이미지 로드
    contents = await file.read()
    image = np.array(Image.open(io.BytesIO(contents)).convert("RGB"))

    # 1. Vision 분석
    vision_result = await yolo.analyze(image)
    if not vision_result.foods:
        raise HTTPException(status_code=422, detail="음식을 검출하지 못했습니다. 다시 촬영해 주세요.")

    # 2. 캐시 매니저 초기화
    mfds_client = MFDSApiClient()
    cache_mgr = NutrientCacheManager(redis, mfds_client)

    calc_results = []
    food_schemas = []

    for detected in vision_result.foods:
        # 3. Fill Ratio 2D → 3D 보정
        fill_3d, bowl_profile = fill_calc.calculate_3d(
            detected.fill_ratio_2d,
            detected.vessel_type or vessel_type,
            size_hint,
        )

        # 4. RAG 검색
        rag_result = await rag.search(detected.food_name, top_k=5)
        rag_confidence = rag_result["confidence"]
        nutrient_data = {}
        if rag_result["results"]:
            top_match = rag_result["results"][0]
            nutrient_data = await cache_mgr.get(top_match["food_name"]) or {}

        # 5. 칼로리 계산
        calc = calorie_calc.calculate(
            food_name=detected.food_name,
            fill_ratio_2d=detected.fill_ratio_2d,
            vessel_type=detected.vessel_type or vessel_type,
            nutrient_data=nutrient_data,
            rag_confidence=rag_confidence,
            fill_ratio_3d=fill_3d,
            bowl_volume_ml=bowl_profile.full_volume_ml,
            size_hint=size_hint,
            db_version=db_version,
        )
        calc_results.append(calc)

        food_schemas.append(FoodResultSchema(
            food_name=calc.food_name,
            mass_g=calc.mass_g,
            calories=calc.calories,
            nutrients=NutrientSummarySchema(**vars(calc.nutrients)),
            is_composite=calc.is_composite,
            breakdown=calc.breakdown,
            confidence=calc.confidence,
            fill_ratio_2d=calc.fill_ratio_2d,
            fill_ratio_3d=calc.fill_ratio_3d,
            bowl_volume_ml=calc.bowl_volume_ml,
            density_used=calc.density_used,
            needs_hitl=calc.needs_hitl,
            source=calc.source,
        ))

    # 6. 세션 생성 (임시 · 미승인)
    db_version = await cache_mgr._get_version()
    session = await hitl_svc.create_session(
        db,
        vision_result={
            "needs_hitl": vision_result.needs_hitl,
            "hitl_reason": vision_result.hitl_reason,
            "confidence": vision_result.foods[0].confidence if vision_result.foods else 0.0,
            "vessel_type": vessel_type,
        },
        calc_results=calc_results,
        db_version=db_version,
    )

    needs_hitl = vision_result.needs_hitl or any(r.needs_hitl for r in calc_results)

    return AnalysisSessionSchema(
        session_id=session.id,
        foods=food_schemas,
        needs_hitl=needs_hitl,
        hitl_reason=vision_result.hitl_reason,
        yolo_confidence=vision_result.foods[0].confidence if vision_result.foods else None,
        mfds_db_version=db_version,
        is_approved=False,
    )


@router.post("/correct/{session_id}")
async def apply_correction(
    request: Request,
    session_id: uuid.UUID,
    body: ApplyCorrectionRequest,
    db: AsyncSession = Depends(get_db),
):
    """HITL 수정값 적용 — 아직 미승인 상태 유지"""
    try:
        await request.app.state.hitl_svc.apply_correction(
            db, session_id,
            [c.model_dump() for c in body.corrections],
        )
        return {"status": "ok", "message": "수정값 저장됨 (미승인 상태)"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/approve/{session_id}")
async def approve_session(
    request: Request,
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    최종 승인 — HITL 완료
    이 API 호출 시에만 is_approved=True, 최종 기록 확정
    """
    try:
        session = await request.app.state.hitl_svc.approve(db, session_id)
        return {
            "status": "ok",
            "session_id": str(session.id),
            "approved_at": session.approved_at.isoformat(),
            "message": "기록 완료 — 식약처 DB 기준으로 최종 저장되었습니다.",
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/feedback")
async def save_feedback(
    request: Request,
    body: FeedbackRequest,
    db: AsyncSession = Depends(get_db),
):
    """Quick Feedback 저장 (좋아요/보정 많았어요/재촬영 필요)"""
    await request.app.state.hitl_svc.save_feedback(db, body.session_id, body.feedback_type)
    return {"status": "ok"}
