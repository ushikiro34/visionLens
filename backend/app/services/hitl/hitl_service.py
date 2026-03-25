"""
Human-in-the-Loop 서비스
- AI 추정값 임시 저장 → 사용자 수정 → 최종 승인 후에만 DB 영구 저장
- 승인 전까지 절대 최종 기록으로 저장되지 않음 (절대 룰)
"""
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.analysis_log import AnalysisSession, FoodRecord, UserFeedback
from app.services.nutrition.calculator import CalculationResult
from app.core.config import get_settings

settings = get_settings()


class HITLService:

    async def create_session(
        self,
        db: AsyncSession,
        vision_result: dict,
        calc_results: list[CalculationResult],
        db_version: str,
    ) -> AnalysisSession:
        """
        분석 세션 생성 + 음식별 임시 레코드 저장
        is_approved=False 상태 → 사용자 승인 전까지 임시
        """
        first_calc = calc_results[0] if calc_results else None
        hitl_triggered = (
            vision_result.get("needs_hitl", False)
            or any(r.needs_hitl for r in calc_results)
        )

        session = AnalysisSession(
            yolo_confidence=vision_result.get("confidence"),
            vessel_type=vision_result.get("vessel_type"),
            fill_ratio_2d=first_calc.fill_ratio_2d if first_calc else None,
            fill_ratio_3d=first_calc.fill_ratio_3d if first_calc else None,
            hitl_triggered=hitl_triggered,
            hitl_trigger_reason=vision_result.get("hitl_reason", ""),
            is_approved=False,
            mfds_db_version=db_version,
        )
        db.add(session)
        await db.flush()  # session.id 확보

        for calc in calc_results:
            record = FoodRecord(
                session_id=session.id,
                ai_food_name=calc.food_name,
                ai_mass_g=calc.mass_g,
                ai_calories=calc.calories,
                ai_confidence=calc.confidence,
                rag_similarity=calc.confidence,
                nutrient_detail={"breakdown": calc.breakdown} if calc.is_composite else None,
                is_composite=calc.is_composite,
            )
            db.add(record)

        await db.flush()
        return session

    async def apply_correction(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        corrections: list[dict],
    ) -> AnalysisSession:
        """
        사용자 수정값 반영
        corrections: [{"record_id": ..., "food_name": ..., "mass_g": ..., "vessel_type": ...}]
        아직 is_approved=False
        """
        session = await self._get_session(db, session_id)

        for corr in corrections:
            record_id = corr.get("record_id")
            if not record_id:
                continue

            result = await db.execute(
                select(FoodRecord).where(FoodRecord.id == uuid.UUID(str(record_id)))
            )
            record = result.scalar_one_or_none()
            if not record:
                continue

            record.final_food_name = corr.get("food_name", record.ai_food_name)
            record.final_mass_g = corr.get("mass_g", record.ai_mass_g)
            record.final_vessel_type = corr.get("vessel_type", record.final_vessel_type)
            record.final_calories = corr.get("calories", record.ai_calories)
            record.user_modified = True
            record.user_modified_at = datetime.utcnow()
            record.modification_note = corr.get("note")

        return session

    async def approve(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
    ) -> AnalysisSession:
        """
        최종 승인 — 이 시점에 is_approved=True로 전환
        HITL 절대 룰: 이 메서드 호출 전까지 절대 최종 기록 저장 안 됨
        """
        session = await self._get_session(db, session_id)
        session.is_approved = True
        session.approved_at = datetime.utcnow()
        if session.hitl_triggered:
            session.hitl_completed_at = datetime.utcnow()

        # 최종값 미설정 레코드에 AI 추정값 기본 복사
        result = await db.execute(
            select(FoodRecord).where(FoodRecord.session_id == session_id)
        )
        records = result.scalars().all()
        for record in records:
            if record.final_food_name is None:
                record.final_food_name = record.ai_food_name
            if record.final_mass_g is None:
                record.final_mass_g = record.ai_mass_g
            if record.final_calories is None:
                record.final_calories = record.ai_calories

        await db.flush()
        await db.refresh(session)
        return session

    async def save_feedback(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        feedback_type: str,
    ) -> UserFeedback:
        """Quick Feedback 저장 (좋아요/보정 많았어요/재촬영 필요)"""
        feedback = UserFeedback(
            session_id=session_id,
            feedback_type=feedback_type,
        )
        db.add(feedback)
        await db.flush()
        return feedback

    async def _get_session(self, db: AsyncSession, session_id: uuid.UUID) -> AnalysisSession:
        result = await db.execute(
            select(AnalysisSession).where(AnalysisSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if not session:
            raise ValueError(f"세션 없음: {session_id}")
        return session
