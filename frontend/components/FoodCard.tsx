"use client"
import type { FoodResult } from "@/lib/api"
import NutrientBar from "./NutrientBar"

interface Props {
  food: FoodResult
  index: number
}

export default function FoodCard({ food, index }: Props) {
  const confidencePct = Math.round(food.confidence * 100)
  const needsReview = food.needs_hitl || food.confidence < 0.9

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-3">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-xs text-slate-400 mb-0.5 block">음식 {index + 1}</span>
          <h3 className="font-bold text-slate-800 text-base">{food.food_name}</h3>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-[#22C55E]">{Math.round(food.calories)}</div>
          <div className="text-xs text-slate-400">kcal</div>
        </div>
      </div>

      {/* HITL 경고 배지 */}
      {needsReview && (
        <div className="flex items-center gap-1.5 bg-[#FEFCE8] border border-[#FACC15] rounded-xl px-3 py-2 mb-3">
          <span className="text-sm">⚠️</span>
          <span className="text-xs text-amber-700 font-medium">
            확인 필요 — AI 신뢰도 {confidencePct}%
          </span>
        </div>
      )}

      {/* 질량 / 신뢰도 */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2 text-center">
          <div className="text-base font-bold text-slate-700">{Math.round(food.mass_g)}g</div>
          <div className="text-xs text-slate-400">추정 질량</div>
        </div>
        <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2 text-center">
          <div className={`text-base font-bold ${needsReview ? "text-amber-500" : "text-[#22C55E]"}`}>
            {confidencePct}%
          </div>
          <div className="text-xs text-slate-400">신뢰도</div>
        </div>
        <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2 text-center">
          <div className="text-base font-bold text-slate-700">{food.bowl_volume_ml}ml</div>
          <div className="text-xs text-slate-400">그릇 용량</div>
        </div>
      </div>

      {/* 영양 성분 */}
      <div className="border-t border-slate-100 pt-3">
        <div className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">영양 성분 (100g 기준)</div>
        <div className="grid grid-cols-2 gap-x-4">
          <NutrientBar label="탄수화물" value={food.nutrients.carbs_g} unit="g" />
          <NutrientBar label="단백질" value={food.nutrients.protein_g} unit="g" />
          <NutrientBar label="지방" value={food.nutrients.fat_g} unit="g" />
          <NutrientBar label="나트륨" value={food.nutrients.sodium_mg} unit="mg" />
        </div>
      </div>

      {/* 출처 */}
      <div className="mt-2 text-xs text-slate-400">{food.source}</div>
    </div>
  )
}
