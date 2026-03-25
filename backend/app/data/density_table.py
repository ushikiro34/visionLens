"""
밀도(ρ) 표준 테이블 v1.1
- v1.0 충돌 해소: 밥 0.8(구 final_design) vs 1.1(구 handover) → 0.85로 통일
- version 필드로 분기별 변경 이력 추적 가능
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class DensityEntry:
    density: float      # g/ml
    source: str
    version: str


DENSITY_TABLE: dict[str, DensityEntry] = {
    # 곡류
    "밥":       DensityEntry(0.85, "식약처+실측", "2026Q1"),
    "죽":       DensityEntry(0.95, "실측",        "2026Q1"),
    "면류":     DensityEntry(0.90, "실측",        "2026Q1"),
    # 국/찌개
    "국물류":   DensityEntry(1.03, "물리상수",    "2026Q1"),
    "찌개류":   DensityEntry(1.04, "실측",        "2026Q1"),
    "탕류":     DensityEntry(1.04, "실측",        "2026Q1"),
    # 반찬
    "나물류":   DensityEntry(0.70, "실측",        "2026Q1"),
    "볶음류":   DensityEntry(0.80, "실측",        "2026Q1"),
    "구이류":   DensityEntry(0.90, "실측",        "2026Q1"),
    "조림류":   DensityEntry(0.95, "실측",        "2026Q1"),
    "튀김류":   DensityEntry(0.65, "실측",        "2026Q1"),
    # 기타
    "김치류":   DensityEntry(0.85, "실측",        "2026Q1"),
    "두부류":   DensityEntry(1.05, "실측",        "2026Q1"),
    "기본":     DensityEntry(0.85, "기본값",      "2026Q1"),  # fallback
}


def get_density(food_category: str) -> DensityEntry:
    """카테고리 키로 밀도 조회. 없으면 기본값 반환."""
    return DENSITY_TABLE.get(food_category, DENSITY_TABLE["기본"])
