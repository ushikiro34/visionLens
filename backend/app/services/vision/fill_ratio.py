"""
Fill Ratio 2D → 3D 보정 서비스
- 2D 픽셀 면적 비율을 그릇 Shape Profile로 3D 부피 비율로 변환
- 단일 카메라의 깊이 정보 부재를 그릇 모양 보정 계수로 대체
"""
from app.data.bowl_profiles import get_bowl_profile, BowlProfile


class FillRatioCalculator:

    def calculate_3d(
        self,
        fill_ratio_2d: float,
        vessel_type: str,
        size_hint: str = "중",
    ) -> tuple[float, BowlProfile]:
        """
        2D fill ratio → 3D fill ratio 변환
        Returns: (3d_fill_ratio, 사용된 BowlProfile)
        """
        profile = get_bowl_profile(vessel_type, size_hint)
        fill_3d = profile.get_3d_fill_ratio(fill_ratio_2d)
        return fill_3d, profile

    def estimate_mass(
        self,
        fill_ratio_2d: float,
        vessel_type: str,
        density: float,
        size_hint: str = "중",
    ) -> dict:
        """
        최종 질량(g) 계산
        Mass = Bowl_Full_Volume × 3D_Fill_Ratio × Density

        Returns:
            mass_g: 추정 질량
            fill_ratio_3d: 보정된 3D fill ratio
            bowl_volume_ml: 사용된 그릇 용량
            vessel_key: 사용된 그릇 프로필 키
        """
        fill_3d, profile = self.calculate_3d(fill_ratio_2d, vessel_type, size_hint)
        mass_g = profile.full_volume_ml * fill_3d * density

        return {
            "mass_g": round(mass_g, 1),
            "fill_ratio_2d": round(fill_ratio_2d, 3),
            "fill_ratio_3d": round(fill_3d, 3),
            "bowl_volume_ml": profile.full_volume_ml,
            "bowl_shape": profile.shape,
            "vessel_type": vessel_type,
            "density": density,
        }
