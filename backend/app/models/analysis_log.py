"""
분석 로그 모델 — HITL 이력, AI 추정값, 사용자 최종값 저장
감사 목적으로 3년 보관 (개인정보 비식별화 후)
"""
import uuid
from datetime import datetime
from sqlalchemy import String, Float, JSON, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class AnalysisSession(Base):
    """사진 1장 촬영 = 1 세션"""
    __tablename__ = "analysis_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Vision 결과
    image_path: Mapped[str | None] = mapped_column(String(512))
    yolo_confidence: Mapped[float | None] = mapped_column(Float)
    vessel_type: Mapped[str | None] = mapped_column(String(64))
    fill_ratio_2d: Mapped[float | None] = mapped_column(Float)
    fill_ratio_3d: Mapped[float | None] = mapped_column(Float)

    # HITL 상태
    hitl_triggered: Mapped[bool] = mapped_column(Boolean, default=False)
    hitl_trigger_reason: Mapped[str | None] = mapped_column(String(256))
    hitl_completed_at: Mapped[datetime | None] = mapped_column(DateTime)

    # 최종 저장 여부 (HITL 승인 후에만 True)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)

    # 식약처 DB 버전 (감사용)
    mfds_db_version: Mapped[str | None] = mapped_column(String(16))

    food_records: Mapped[list["FoodRecord"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class FoodRecord(Base):
    """세션 내 개별 음식 1개 단위"""
    __tablename__ = "food_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("analysis_sessions.id")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # AI 추정값
    ai_food_name: Mapped[str | None] = mapped_column(String(128))
    ai_mass_g: Mapped[float | None] = mapped_column(Float)
    ai_calories: Mapped[float | None] = mapped_column(Float)
    ai_confidence: Mapped[float | None] = mapped_column(Float)
    rag_similarity: Mapped[float | None] = mapped_column(Float)

    # 사용자 최종 승인값 (HITL 완료 후에만 채워짐)
    final_food_name: Mapped[str | None] = mapped_column(String(128))
    final_mass_g: Mapped[float | None] = mapped_column(Float)
    final_calories: Mapped[float | None] = mapped_column(Float)
    final_vessel_type: Mapped[str | None] = mapped_column(String(64))

    # 영양 상세 (식약처 반환값 JSON 저장)
    nutrient_detail: Mapped[dict | None] = mapped_column(JSON)

    # 복합 음식 여부
    is_composite: Mapped[bool] = mapped_column(Boolean, default=False)
    composite_breakdown: Mapped[list | None] = mapped_column(JSON)

    # 사용자 수정 여부
    user_modified: Mapped[bool] = mapped_column(Boolean, default=False)
    user_modified_at: Mapped[datetime | None] = mapped_column(DateTime)
    modification_note: Mapped[str | None] = mapped_column(Text)

    session: Mapped["AnalysisSession"] = relationship(back_populates="food_records")


class UserFeedback(Base):
    """Quick Feedback (좋아요/보정 많았어요/재촬영 필요) 저장"""
    __tablename__ = "user_feedbacks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    feedback_type: Mapped[str] = mapped_column(String(32))  # good / correction_needed / retake
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
