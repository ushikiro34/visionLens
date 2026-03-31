/**
 * 음식 수정용 카탈로그
 * - 국물 음식: soup_calories.py 고정값과 동기화
 * - 일반 음식: 식약처 DB 평균값 기준 추정
 */
export interface FoodOption {
  name: string
  kcal: number         // 1인분 기준 kcal
  category: string
}

export const FOOD_LIST: FoodOption[] = [
  // ── 국물 / 찌개류 ─────────────────────────────────────
  { name: "설렁탕",     kcal: 440, category: "국물·탕" },
  { name: "곰탕",       kcal: 380, category: "국물·탕" },
  { name: "사골탕",     kcal: 350, category: "국물·탕" },
  { name: "꼬리곰탕",   kcal: 520, category: "국물·탕" },
  { name: "갈비탕",     kcal: 490, category: "국물·탕" },
  { name: "삼계탕",     kcal: 620, category: "국물·탕" },
  { name: "감자탕",     kcal: 560, category: "국물·탕" },
  { name: "뼈해장국",   kcal: 520, category: "국물·탕" },
  { name: "순댓국",     kcal: 450, category: "국물·탕" },
  { name: "돼지국밥",   kcal: 520, category: "국물·탕" },
  { name: "해물탕",     kcal: 360, category: "국물·탕" },
  { name: "김치찌개",   kcal: 380, category: "국물·탕" },
  { name: "된장찌개",   kcal: 280, category: "국물·탕" },
  { name: "순두부찌개", kcal: 320, category: "국물·탕" },
  { name: "부대찌개",   kcal: 580, category: "국물·탕" },
  { name: "청국장",     kcal: 260, category: "국물·탕" },
  { name: "동태찌개",   kcal: 200, category: "국물·탕" },
  { name: "생선찌개",   kcal: 220, category: "국물·탕" },
  { name: "해물찌개",   kcal: 240, category: "국물·탕" },
  { name: "닭볶음탕",   kcal: 480, category: "국물·탕" },
  { name: "낙지볶음탕", kcal: 280, category: "국물·탕" },
  { name: "두부전골",   kcal: 240, category: "국물·탕" },
  { name: "버섯전골",   kcal: 200, category: "국물·탕" },
  { name: "샤브샤브",   kcal: 400, category: "국물·탕" },
  { name: "미역국",     kcal: 60,  category: "국물·탕" },
  { name: "북엇국",     kcal: 80,  category: "국물·탕" },
  { name: "콩나물국",   kcal: 40,  category: "국물·탕" },
  { name: "해장국",     kcal: 420, category: "국물·탕" },
  { name: "육개장",     kcal: 300, category: "국물·탕" },
  // ── 라면 / 면류 ───────────────────────────────────────
  { name: "라면",       kcal: 500, category: "면류" },
  { name: "신라면",     kcal: 505, category: "면류" },
  { name: "짜파게티",   kcal: 560, category: "면류" },
  { name: "우동",       kcal: 350, category: "면류" },
  { name: "쌀국수",     kcal: 380, category: "면류" },
  { name: "냉면",       kcal: 450, category: "면류" },
  { name: "쫄면",       kcal: 420, category: "면류" },
  { name: "짜장면",     kcal: 550, category: "면류" },
  { name: "짬뽕",       kcal: 520, category: "면류" },
  { name: "칼국수",     kcal: 450, category: "면류" },
  { name: "수제비",     kcal: 380, category: "면류" },
  { name: "잔치국수",   kcal: 350, category: "면류" },
  // ── 밥류 ──────────────────────────────────────────────
  { name: "흰쌀밥",     kcal: 300, category: "밥류" },
  { name: "잡곡밥",     kcal: 280, category: "밥류" },
  { name: "볶음밥",     kcal: 480, category: "밥류" },
  { name: "김치볶음밥", kcal: 500, category: "밥류" },
  { name: "비빔밥",     kcal: 550, category: "밥류" },
  { name: "돌솥비빔밥", kcal: 580, category: "밥류" },
  { name: "불고기덮밥", kcal: 580, category: "밥류" },
  { name: "제육덮밥",   kcal: 620, category: "밥류" },
  { name: "오므라이스", kcal: 540, category: "밥류" },
  { name: "낙지덮밥",   kcal: 480, category: "밥류" },
  { name: "간장게장",   kcal: 350, category: "밥류" },
  // ── 구이 / 볶음 ───────────────────────────────────────
  { name: "삼겹살",     kcal: 600, category: "구이·볶음" },
  { name: "불고기",     kcal: 380, category: "구이·볶음" },
  { name: "제육볶음",   kcal: 450, category: "구이·볶음" },
  { name: "닭갈비",     kcal: 420, category: "구이·볶음" },
  { name: "오징어볶음", kcal: 280, category: "구이·볶음" },
  { name: "낙지볶음",   kcal: 260, category: "구이·볶음" },
  { name: "두부김치",   kcal: 300, category: "구이·볶음" },
  { name: "고등어구이", kcal: 310, category: "구이·볶음" },
  { name: "갈치구이",   kcal: 280, category: "구이·볶음" },
  { name: "조기구이",   kcal: 250, category: "구이·볶음" },
  // ── 분식 ──────────────────────────────────────────────
  { name: "떡볶이",     kcal: 380, category: "분식" },
  { name: "순대",       kcal: 300, category: "분식" },
  { name: "튀김",       kcal: 350, category: "분식" },
  { name: "김밥",       kcal: 400, category: "분식" },
  { name: "참치김밥",   kcal: 430, category: "분식" },
  { name: "라볶이",     kcal: 550, category: "분식" },
  { name: "돈까스",     kcal: 620, category: "분식" },
  { name: "치킨",       kcal: 700, category: "분식" },
  { name: "피자",       kcal: 650, category: "분식" },
  { name: "햄버거",     kcal: 550, category: "분식" },
]

export const FOOD_CATEGORIES = [...new Set(FOOD_LIST.map(f => f.category))]
