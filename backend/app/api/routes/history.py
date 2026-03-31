"""
기록 조회 API
GET /api/v1/history              — 승인된 세션 목록 (최신순)
GET /api/v1/history/{session_id} — 세션 상세 (음식 레코드 포함)
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import uuid

from app.core.database import get_db
from app.models.analysis_log import AnalysisSession, FoodRecord

router = APIRouter(prefix="/api/v1/history", tags=["history"])


def _serialize_record(r: FoodRecord) -> dict:
    return {
        "id": str(r.id),
        "ai_food_name": r.ai_food_name,
        "final_food_name": r.final_food_name,
        "ai_calories": r.ai_calories,
        "final_calories": r.final_calories,
        "ai_mass_g": r.ai_mass_g,
        "final_mass_g": r.final_mass_g,
        "ai_confidence": r.ai_confidence,
        "user_modified": r.user_modified,
        "is_composite": r.is_composite,
        "composite_breakdown": r.composite_breakdown,
        "nutrient_detail": r.nutrient_detail,
    }


def _serialize_session(s: AnalysisSession, include_records: bool = False) -> dict:
    total_calories = sum(
        (r.final_calories or r.ai_calories or 0) for r in (s.food_records or [])
    )
    food_names = [
        r.final_food_name or r.ai_food_name or "알수없음"
        for r in (s.food_records or [])
    ]
    data = {
        "session_id": str(s.id),
        "created_at": s.created_at.isoformat(),
        "approved_at": s.approved_at.isoformat() if s.approved_at else None,
        "total_calories": round(total_calories, 1),
        "food_names": food_names,
        "food_count": len(food_names),
        "vessel_type": s.vessel_type,
        "hitl_triggered": s.hitl_triggered,
        "mfds_db_version": s.mfds_db_version,
        "yolo_confidence": s.yolo_confidence,
    }
    if include_records:
        data["foods"] = [_serialize_record(r) for r in (s.food_records or [])]
    return data


@router.get("")
async def list_history(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """승인된 세션 목록 (최신순)"""
    result = await db.execute(
        select(AnalysisSession)
        .where(AnalysisSession.is_approved == True)
        .options(selectinload(AnalysisSession.food_records))
        .order_by(AnalysisSession.approved_at.desc())
        .limit(limit)
        .offset(offset)
    )
    sessions = result.scalars().all()
    return {
        "sessions": [_serialize_session(s) for s in sessions],
        "total": len(sessions),
        "limit": limit,
        "offset": offset,
    }


@router.get("/{session_id}")
async def get_session_detail(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """세션 상세 (음식별 기록 포함)"""
    result = await db.execute(
        select(AnalysisSession)
        .where(AnalysisSession.id == session_id)
        .options(selectinload(AnalysisSession.food_records))
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="세션 없음")
    return _serialize_session(session, include_records=True)
