"""
복합 음식 재료 비율 테이블
- 비빔밥, 볶음밥, 국밥 등 단일 식약처 DB 항목으로 매핑 불가한 복합 음식
- 각 재료 비율(ratio)은 총 중량 대비 소수점 비율
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class CompositeIngredient:
    name: str           # 식약처 DB 검색 키워드
    ratio: float        # 총 중량 대비 비율 (합계 = 1.0)
    category: str       # 밀도 테이블 카테고리 키


COMPOSITE_FOOD_MAP: dict[str, list[CompositeIngredient]] = {
    "비빔밥": [
        CompositeIngredient("밥",       0.55, "밥"),
        CompositeIngredient("나물",      0.25, "나물류"),
        CompositeIngredient("고추장",    0.10, "조림류"),
        CompositeIngredient("참기름",    0.05, "볶음류"),
        CompositeIngredient("계란후라이", 0.05, "구이류"),
    ],
    "볶음밥": [
        CompositeIngredient("밥",   0.65, "밥"),
        CompositeIngredient("채소", 0.20, "나물류"),
        CompositeIngredient("계란", 0.10, "구이류"),
        CompositeIngredient("식용유", 0.05, "볶음류"),
    ],
    "국밥": [
        CompositeIngredient("사골국물", 0.55, "국물류"),
        CompositeIngredient("밥",       0.30, "밥"),
        CompositeIngredient("고명",     0.10, "나물류"),
        CompositeIngredient("파",       0.05, "나물류"),
    ],
    "김치볶음밥": [
        CompositeIngredient("밥",   0.60, "밥"),
        CompositeIngredient("김치", 0.25, "김치류"),
        CompositeIngredient("돼지고기", 0.10, "볶음류"),
        CompositeIngredient("식용유",   0.05, "볶음류"),
    ],
    "된장찌개": [
        CompositeIngredient("된장국물", 0.55, "찌개류"),
        CompositeIngredient("두부",     0.20, "두부류"),
        CompositeIngredient("호박",     0.15, "나물류"),
        CompositeIngredient("감자",     0.10, "나물류"),
    ],
    "김치찌개": [
        CompositeIngredient("김치국물", 0.50, "찌개류"),
        CompositeIngredient("김치",     0.25, "김치류"),
        CompositeIngredient("돼지고기", 0.15, "볶음류"),
        CompositeIngredient("두부",     0.10, "두부류"),
    ],
    "순두부찌개": [
        CompositeIngredient("국물",   0.45, "찌개류"),
        CompositeIngredient("순두부", 0.35, "두부류"),
        CompositeIngredient("계란",   0.10, "구이류"),
        CompositeIngredient("조개",   0.10, "구이류"),
    ],
}


def get_composite(food_name: str) -> list[CompositeIngredient] | None:
    """복합 음식 재료 리스트 반환. 해당 없으면 None."""
    return COMPOSITE_FOOD_MAP.get(food_name)


def is_composite(food_name: str) -> bool:
    return food_name in COMPOSITE_FOOD_MAP
