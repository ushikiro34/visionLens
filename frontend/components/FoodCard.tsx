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
    <div className="bg-white rounded-2xl shadow-sm border border-[#F0C4C8] p-4 mb-3">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-xs text-[#9E7078] mb-0.5 block">음식 {index + 1}</span>
          <h3 className="font-bold text-[#1A0A0C] text-base">{food.food_name}</h3>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-[#8B2030]">{Math.round(food.calories)}</div>
          <div className="text-xs text-[#9E7078]">kcal</div>
        </div>
      </div>

      {/* HITL 경고 배지 */}
      {needsReview && (
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
          <svg className="text-amber-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="text-xs text-amber-700 font-medium">
            확인 필요 — AI 신뢰도 {confidencePct}%
          </span>
        </div>
      )}

      {/* 질량 / 신뢰도 */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1 bg-[#FDF5F6] rounded-xl px-3 py-2 text-center">
          <div className="text-base font-bold text-[#1A0A0C]">{Math.round(food.mass_g)}g</div>
          <div className="text-xs text-[#9E7078]">추정 질량</div>
        </div>
        <div className="flex-1 bg-[#FDF5F6] rounded-xl px-3 py-2 text-center">
          <div className={`text-base font-bold ${needsReview ? "text-amber-500" : "text-[#8B2030]"}`}>
            {confidencePct}%
          </div>
          <div className="text-xs text-[#9E7078]">신뢰도</div>
        </div>
        <div className="flex-1 bg-[#FDF5F6] rounded-xl px-3 py-2 text-center">
          <div className="text-base font-bold text-[#1A0A0C]">{food.bowl_volume_ml}ml</div>
          <div className="text-xs text-[#9E7078]">그릇 용량</div>
        </div>
      </div>

      {/* 영양 성분 */}
      <div className="border-t border-[#F0C4C8] pt-3">
        <div className="text-xs font-semibold text-[#9E7078] mb-1 uppercase tracking-wide">영양 성분 (100g 기준)</div>
        <div className="grid grid-cols-2 gap-x-4">
          <NutrientBar label="탄수화물" value={food.nutrients.carbs_g} unit="g" />
          <NutrientBar label="단백질" value={food.nutrients.protein_g} unit="g" />
          <NutrientBar label="지방" value={food.nutrients.fat_g} unit="g" />
          <NutrientBar label="나트륨" value={food.nutrients.sodium_mg} unit="mg" />
        </div>
      </div>

      {/* 출처 */}
      <div className="mt-2 text-xs text-[#9E7078]">{food.source}</div>
    </div>
  )
}
