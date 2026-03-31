"""
그릇 Shape Profile DB v1.0
- 실측 기반 50종 그릇 용량 + 2D→3D Fill Ratio 보정 계수 테이블
- 보정 계수: 2D 픽셀 면적 비율 → 실제 3D 부피 비율 변환
"""
from dataclasses import dataclass, field
from typing import Literal


BowlShape = Literal["hemisphere", "cylinder", "cylinder_tapered", "flat", "deep_bowl"]


@dataclass(frozen=True)
class BowlProfile:
    full_volume_ml: int
    shape: BowlShape
    # key: 2D fill ratio (0~1), value: 보정된 3D fill ratio (0~1)
    fill_correction: dict[float, float]
    version: str = "1.0"

    def get_3d_fill_ratio(self, fill_2d: float) -> float:
        """
        2D 세그먼트 면적 비율 → 3D 부피 비율 선형 보간 변환
        그릇 형태에 따라 최대 40% 오차를 보정
        """
        fill_2d = max(0.0, min(1.0, fill_2d))
        keys = sorted(self.fill_correction.keys())

        if fill_2d <= keys[0]:
            return self.fill_correction[keys[0]]
        if fill_2d >= keys[-1]:
            return self.fill_correction[keys[-1]]

        for i in range(1, len(keys)):
            k_prev, k_curr = keys[i - 1], keys[i]
            if fill_2d <= k_curr:
                ratio = (fill_2d - k_prev) / (k_curr - k_prev)
                return (
                    self.fill_correction[k_prev]
                    + ratio * (self.fill_correction[k_curr] - self.fill_correction[k_prev])
                )
        return fill_2d  # fallback


BOWL_PROFILES: dict[str, BowlProfile] = {
    # ── 공기류 (위 넓은 반구형) ──────────────────────────────────
    "공기밥_초소": BowlProfile(120,  "hemisphere",       {0.2: 0.10, 0.4: 0.22, 0.6: 0.40, 0.8: 0.63, 1.0: 1.0}),
    "공기밥_소":   BowlProfile(150,  "hemisphere",       {0.2: 0.10, 0.4: 0.22, 0.6: 0.40, 0.8: 0.63, 1.0: 1.0}),
    "공기밥_중":   BowlProfile(180,  "hemisphere",       {0.2: 0.10, 0.4: 0.22, 0.6: 0.40, 0.8: 0.63, 1.0: 1.0}),
    "공기밥_대":   BowlProfile(220,  "hemisphere",       {0.2: 0.10, 0.4: 0.22, 0.6: 0.40, 0.8: 0.63, 1.0: 1.0}),
    "공기밥_초대": BowlProfile(280,  "hemisphere",       {0.2: 0.10, 0.4: 0.22, 0.6: 0.40, 0.8: 0.63, 1.0: 1.0}),

    # ── 국그릇류 (약간 테이퍼 원통형) ───────────────────────────
    "국그릇_초소": BowlProfile(180,  "cylinder_tapered", {0.2: 0.16, 0.4: 0.32, 0.6: 0.52, 0.8: 0.72, 1.0: 1.0}),
    "국그릇_소":   BowlProfile(250,  "cylinder_tapered", {0.2: 0.16, 0.4: 0.32, 0.6: 0.52, 0.8: 0.72, 1.0: 1.0}),
    "국그릇_중":   BowlProfile(350,  "cylinder_tapered", {0.2: 0.16, 0.4: 0.32, 0.6: 0.52, 0.8: 0.72, 1.0: 1.0}),
    "국그릇_대":   BowlProfile(450,  "cylinder_tapered", {0.2: 0.16, 0.4: 0.32, 0.6: 0.52, 0.8: 0.72, 1.0: 1.0}),
    "국그릇_초대": BowlProfile(600,  "cylinder_tapered", {0.2: 0.16, 0.4: 0.32, 0.6: 0.52, 0.8: 0.72, 1.0: 1.0}),

    # ── 뚝배기류 (원통형) ────────────────────────────────────────
    "뚝배기_초소": BowlProfile(250,  "cylinder",         {0.2: 0.18, 0.4: 0.36, 0.6: 0.55, 0.8: 0.75, 1.0: 1.0}),
    "뚝배기_소":   BowlProfile(350,  "cylinder",         {0.2: 0.18, 0.4: 0.36, 0.6: 0.55, 0.8: 0.75, 1.0: 1.0}),
    "뚝배기_중":   BowlProfile(450,  "cylinder",         {0.2: 0.18, 0.4: 0.36, 0.6: 0.55, 0.8: 0.75, 1.0: 1.0}),
    "뚝배기_대":   BowlProfile(600,  "cylinder",         {0.2: 0.18, 0.4: 0.36, 0.6: 0.55, 0.8: 0.75, 1.0: 1.0}),
    "뚝배기_초대": BowlProfile(800,  "cylinder",         {0.2: 0.18, 0.4: 0.36, 0.6: 0.55, 0.8: 0.75, 1.0: 1.0}),

    # ── 양은냄비 ────────────────────────────────────────────────
    "양은냄비_초소": BowlProfile(400,  "cylinder",       {0.2: 0.18, 0.4: 0.36, 0.6: 0.55, 0.8: 0.75, 1.0: 1.0}),
    "양은냄비_소":   BowlProfile(600,  "cylinder",       {0.2: 0.18, 0.4: 0.36, 0.6: 0.55, 0.8: 0.75, 1.0: 1.0}),
    "양은냄비_중":   BowlProfile(900,  "cylinder",       {0.2: 0.18, 0.4: 0.36, 0.6: 0.55, 0.8: 0.75, 1.0: 1.0}),
    "양은냄비_대":   BowlProfile(1200, "cylinder",       {0.2: 0.18, 0.4: 0.36, 0.6: 0.55, 0.8: 0.75, 1.0: 1.0}),
    "양은냄비_초대": BowlProfile(1600, "cylinder",       {0.2: 0.18, 0.4: 0.36, 0.6: 0.55, 0.8: 0.75, 1.0: 1.0}),

    # ── 접시류 (납작형) ──────────────────────────────────────────
    "접시_초소":   BowlProfile(180,  "flat",             {0.2: 0.17, 0.4: 0.34, 0.6: 0.53, 0.8: 0.73, 1.0: 1.0}),
    "접시_소":     BowlProfile(300,  "flat",             {0.2: 0.17, 0.4: 0.34, 0.6: 0.53, 0.8: 0.73, 1.0: 1.0}),
    "접시_중":     BowlProfile(500,  "flat",             {0.2: 0.17, 0.4: 0.34, 0.6: 0.53, 0.8: 0.73, 1.0: 1.0}),
    "접시_대":     BowlProfile(800,  "flat",             {0.2: 0.17, 0.4: 0.34, 0.6: 0.53, 0.8: 0.73, 1.0: 1.0}),
    "접시_초대":   BowlProfile(1100, "flat",             {0.2: 0.17, 0.4: 0.34, 0.6: 0.53, 0.8: 0.73, 1.0: 1.0}),

    # ── 식판 (군대/학교급식) ─────────────────────────────────────
    "식판_군대":   BowlProfile(1000, "flat",             {0.2: 0.17, 0.4: 0.34, 0.6: 0.53, 0.8: 0.73, 1.0: 1.0}),
    "식판_학교":   BowlProfile(900,  "flat",             {0.2: 0.17, 0.4: 0.34, 0.6: 0.53, 0.8: 0.73, 1.0: 1.0}),

    # ── fallback ────────────────────────────────────────────────
    "기본":        BowlProfile(300,  "cylinder",         {0.2: 0.18, 0.4: 0.36, 0.6: 0.55, 0.8: 0.75, 1.0: 1.0}),
}

# YOLO vessel_type → bowl profile key 매핑
VESSEL_TYPE_MAP: dict[str, str] = {
    "공기밥":  "공기밥_중",
    "국그릇":  "국그릇_중",
    "뚝배기":  "뚝배기_중",
    "양은냄비": "양은냄비_중",
    "접시":    "접시_중",
    "식판":    "식판_학교",
}


def get_bowl_profile(vessel_type: str, size_hint: str = "중") -> BowlProfile:
    """vessel_type + 크기 힌트로 프로필 조회. 없으면 기본값 반환."""
    key = f"{vessel_type}_{size_hint}"
    if key in BOWL_PROFILES:
        return BOWL_PROFILES[key]
    mapped = VESSEL_TYPE_MAP.get(vessel_type)
    if mapped and mapped in BOWL_PROFILES:
        return BOWL_PROFILES[mapped]
    return BOWL_PROFILES["기본"]
