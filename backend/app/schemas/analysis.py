"""Pydantic 스키마 — API 요청/응답 형식 정의"""
import uuid
from pydantic import BaseModel, Field
from typing import Optional


# ── 분석 요청 ─────────────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    vessel_type: str = Field("공기밥", description="그릇 타입 (YOLO 검출 또는 사용자 선택)")
    size_hint: str = Field("중", description="그릇 크기 힌트 (소/중/대)")
    # 이미지는 multipart/form-data 로 별도 수신


# ── 영양소 요약 ───────────────────────────────────────────────────────────────
class NutrientSummarySchema(BaseModel):
    energy_kcal: float
    carbs_g: float
    protein_g: float
    fat_g: float
    sodium_mg: float


# ── 개별 음식 결과 ─────────────────────────────────────────────────────────────
class FoodResultSchema(BaseModel):
    food_name: str
    mass_g: float
    calories: float
    nutrients: NutrientSummarySchema
    is_composite: bool
    breakdown: list[dict]
    confidence: float
    fill_ratio_2d: float
    fill_ratio_3d: float
    bowl_volume_ml: int
    density_used: float
    needs_hitl: bool
    source: str


# ── 분석 세션 응답 ─────────────────────────────────────────────────────────────
class AnalysisSessionSchema(BaseModel):
    session_id: uuid.UUID
    foods: list[FoodResultSchema]
    needs_hitl: bool
    hitl_reason: str
    yolo_confidence: Optional[float]
    mfds_db_version: str
    is_approved: bool


# ── HITL 수정 요청 ─────────────────────────────────────────────────────────────
class CorrectionItem(BaseModel):
    record_id: uuid.UUID
    food_name: Optional[str] = None
    mass_g: Optional[float] = None
    vessel_type: Optional[str] = None
    calories: Optional[float] = None
    note: Optional[str] = None


class ApplyCorrectionRequest(BaseModel):
    corrections: list[CorrectionItem]


# ── 승인 요청 ─────────────────────────────────────────────────────────────────
class ApproveRequest(BaseModel):
    session_id: uuid.UUID


# ── 피드백 요청 ───────────────────────────────────────────────────────────────
class FeedbackRequest(BaseModel):
    session_id: uuid.UUID
    feedback_type: str = Field(..., pattern="^(good|correction_needed|retake)$")


# ── 캐시 로테이션 ─────────────────────────────────────────────────────────────
class CacheRotateRequest(BaseModel):
    new_version: str = Field(..., description="새 분기 버전 (예: 2026Q2)")
