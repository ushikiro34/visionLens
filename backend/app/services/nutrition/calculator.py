"""
칼로리·영양 계산 엔진
- 단일 음식: Mass × (식약처 ENERGY / 100)
- 복합 음식: 재료별 비율 가중 합산
- 모든 계산 결과에 출처·버전·신뢰도 포함
"""
from dataclasses import dataclass
from app.core.config import get_settings
from app.data.density_table import get_density
from app.data.composite_foods import get_composite, is_composite
from app.data.soup_calories import get_soup_calories

settings = get_settings()


@dataclass
class NutrientSummary:
    energy_kcal: float
    carbs_g: float
    protein_g: float
    fat_g: float
    sodium_mg: float


@dataclass
class CalculationResult:
    food_name: str
    mass_g: float
    calories: float
    nutrients: NutrientSummary
    is_composite: bool
    breakdown: list[dict]       # 복합 음식 재료별 내역
    source: str                 # 식약처 DB 버전 표시
    confidence: float           # RAG 유사도 (신뢰도)
    fill_ratio_2d: float
    fill_ratio_3d: float
    bowl_volume_ml: int
    density_used: float
    needs_hitl: bool


class CalorieCalculator:

    def calculate(
        self,
        food_name: str,
        fill_ratio_2d: float,
        vessel_type: str,
        nutrient_data: dict,
        rag_confidence: float,
        fill_ratio_3d: float,
        bowl_volume_ml: int,
        size_hint: str = "중",
        db_version: str = "",
    ) -> CalculationResult:
        """
        최종 칼로리 계산
        복합 음식이면 재료별 분해 계산, 단일 음식이면 직접 계산
        """
        density_entry = get_density(self._get_category(food_name))
        density = density_entry.density
        db_version = nutrient_data.get("db_version") or db_version or "식약처DB"

        # 국물 음식: 부피 계산 대신 고정 칼로리 테이블 사용
        soup_data = get_soup_calories(food_name)
        if soup_data:
            return self._calculate_soup(
                food_name, soup_data, nutrient_data,
                fill_ratio_2d, bowl_volume_ml, rag_confidence,
            )

        # Mass = Bowl_Full_Volume × 3D_Fill_Ratio × Density
        mass_g = round(bowl_volume_ml * fill_ratio_3d * density, 1)

        if is_composite(food_name):
            return self._calculate_composite(
                food_name, mass_g, fill_ratio_2d, fill_ratio_3d,
                bowl_volume_ml, density, rag_confidence, db_version,
            )

        return self._calculate_single(
            food_name, mass_g, nutrient_data,
            fill_ratio_2d, fill_ratio_3d, bowl_volume_ml,
            density, rag_confidence, db_version,
        )

    def _calculate_single(
        self,
        food_name: str,
        mass_g: float,
        nutrient_data: dict,
        fill_ratio_2d: float,
        fill_ratio_3d: float,
        bowl_volume_ml: int,
        density: float,
        rag_confidence: float,
        db_version: str,
    ) -> CalculationResult:
        energy_per_100g = nutrient_data.get("energy_kcal") or 0.0
        calories = round(mass_g * energy_per_100g / 100, 1)

        nutrients = NutrientSummary(
            energy_kcal=calories,
            carbs_g=round(mass_g * (nutrient_data.get("carbs_g") or 0) / 100, 1),
            protein_g=round(mass_g * (nutrient_data.get("protein_g") or 0) / 100, 1),
            fat_g=round(mass_g * (nutrient_data.get("fat_g") or 0) / 100, 1),
            sodium_mg=round(mass_g * (nutrient_data.get("sodium_mg") or 0) / 100, 1),
        )

        return CalculationResult(
            food_name=food_name,
            mass_g=mass_g,
            calories=calories,
            nutrients=nutrients,
            is_composite=False,
            breakdown=[],
            source=f"식약처 식품영양성분DB ({db_version} 기준)",
            confidence=rag_confidence,
            fill_ratio_2d=fill_ratio_2d,
            fill_ratio_3d=fill_ratio_3d,
            bowl_volume_ml=bowl_volume_ml,
            density_used=density,
            needs_hitl=rag_confidence < settings.RAG_SIMILARITY_THRESHOLD,
        )

    def _calculate_composite(
        self,
        food_name: str,
        total_mass_g: float,
        fill_ratio_2d: float,
        fill_ratio_3d: float,
        bowl_volume_ml: int,
        density: float,
        rag_confidence: float,
        db_version: str,
    ) -> CalculationResult:
        ingredients = get_composite(food_name)
        total_calories = 0.0
        breakdown = []

        for ing in ingredients:
            ing_mass = round(total_mass_g * ing.ratio, 1)
            # 재료별 식약처 DB 평균값 (추후 RAG 연동 가능)
            ing_kcal_per_100g = self._get_default_energy(ing.name)
            ing_cal = round(ing_mass * ing_kcal_per_100g / 100, 1)
            total_calories += ing_cal
            breakdown.append({
                "ingredient": ing.name,
                "ratio": ing.ratio,
                "mass_g": ing_mass,
                "kcal": ing_cal,
            })

        nutrients = NutrientSummary(
            energy_kcal=round(total_calories, 1),
            carbs_g=0, protein_g=0, fat_g=0, sodium_mg=0,  # 복합 상세는 추후 확장
        )

        return CalculationResult(
            food_name=food_name,
            mass_g=total_mass_g,
            calories=round(total_calories, 1),
            nutrients=nutrients,
            is_composite=True,
            breakdown=breakdown,
            source=f"식약처 식품영양성분DB ({db_version} 기준) — 복합 음식 재료 비율 추정",
            confidence=rag_confidence,
            fill_ratio_2d=fill_ratio_2d,
            fill_ratio_3d=fill_ratio_3d,
            bowl_volume_ml=bowl_volume_ml,
            density_used=density,
            needs_hitl=True,  # 복합 음식은 항상 HITL 권장
        )

    def _calculate_soup(
        self,
        food_name: str,
        soup_data: tuple[int, int, str],
        nutrient_data: dict,
        fill_ratio_2d: float,
        bowl_volume_ml: int,
        rag_confidence: float,
    ) -> CalculationResult:
        """국물 음식 고정 칼로리 테이블 기반 계산"""
        soup_kcal, soup_mass_g, soup_desc = soup_data
        fill_ratio_3d = min(1.0, soup_mass_g / max(bowl_volume_ml, 1))

        nutrients = NutrientSummary(
            energy_kcal=float(soup_kcal),
            carbs_g=round(soup_mass_g * (nutrient_data.get("carbs_g") or 0) / 100, 1),
            protein_g=round(soup_mass_g * (nutrient_data.get("protein_g") or 0) / 100, 1),
            fat_g=round(soup_mass_g * (nutrient_data.get("fat_g") or 0) / 100, 1),
            sodium_mg=round(soup_mass_g * (nutrient_data.get("sodium_mg") or 0) / 100, 1),
        )

        return CalculationResult(
            food_name=food_name,
            mass_g=float(soup_mass_g),
            calories=float(soup_kcal),
            nutrients=nutrients,
            is_composite=False,
            breakdown=[],
            source=f"국물 음식 고정 테이블 ({soup_desc})",
            confidence=rag_confidence,
            fill_ratio_2d=fill_ratio_2d,
            fill_ratio_3d=fill_ratio_3d,
            bowl_volume_ml=bowl_volume_ml,
            density_used=round(soup_mass_g / max(bowl_volume_ml, 1), 3),
            needs_hitl=False,
        )

    def _get_category(self, food_name: str) -> str:
        """음식명 → 밀도 카테고리 매핑 (heuristic)"""
        if "밥" in food_name: return "밥"
        if "죽" in food_name: return "죽"
        if "국" in food_name or "탕" in food_name: return "국물류"
        if "찌개" in food_name: return "찌개류"
        if "나물" in food_name or "무침" in food_name: return "나물류"
        if "볶음" in food_name: return "볶음류"
        if "구이" in food_name or "전" in food_name: return "구이류"
        if "김치" in food_name: return "김치류"
        if "두부" in food_name: return "두부류"
        return "기본"

    @staticmethod
    def _get_default_energy(ingredient_name: str) -> float:
        """재료별 기본 에너지 값 (100g당 kcal) — 추후 RAG 연동으로 대체 예정"""
        defaults = {
            "밥": 150, "죽": 65, "국물": 15, "사골국물": 30,
            "김치": 18, "나물": 20, "채소": 15, "두부": 75,
            "돼지고기": 260, "닭고기": 170, "계란": 155,
            "고추장": 188, "된장": 130, "참기름": 880,
            "식용유": 900, "파": 25, "감자": 80, "호박": 22,
        }
        for key, val in defaults.items():
            if key in ingredient_name:
                return val
        return 100.0  # fallback
