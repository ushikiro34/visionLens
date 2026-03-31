"use client"
import { useState } from "react"
import type { FoodResult } from "@/lib/api"
import NutrientBar from "./NutrientBar"
import FoodPicker from "./FoodPicker"

interface Props {
  food: FoodResult
  index: number
  editable?: boolean
  editedFood?: { name: string; kcal: number | null }
  onFoodChange?: (name: string, kcal: number | null) => void
}

export default function FoodCard({ food, index, editable, editedFood, onFoodChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)

  const displayName = editedFood?.name ?? food.food_name
  const displayKcal = editedFood?.kcal ?? Math.round(food.calories)
  const isEdited = !!editedFood

  const confidencePct = Math.round(food.confidence * 100)
  const needsReview = food.needs_hitl || food.confidence < 0.9

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-[#F0C4C8] p-4 mb-3">
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 mr-3">
            <span className="text-xs text-[#9E7078] mb-0.5 block">음식 {index + 1}</span>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-[#1A0A0C] text-base truncate">{displayName}</h3>
              {isEdited && (
                <span className="text-[10px] text-[#8B2030] bg-[#FCE8EA] px-1.5 py-0.5 rounded-full shrink-0">수정됨</span>
              )}
              {editable && (
                <button
                  onClick={() => setPickerOpen(true)}
                  className="text-[#C4878E] hover:text-[#8B2030] transition-colors shrink-0"
                  aria-label="음식 종류 변경"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              )}
            </div>
            {isEdited && editedFood.kcal !== null && (
              <div className="text-[10px] text-[#9E7078] mt-0.5">
                AI 추정: {Math.round(food.calories)} kcal → 테이블 고정값 적용
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-bold text-[#8B2030]">{displayKcal}</div>
            <div className="text-xs text-[#9E7078]">kcal</div>
          </div>
        </div>

        {/* HITL 경고 배지 */}
        {needsReview && !isEdited && (
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
            <div className={`text-base font-bold ${needsReview && !isEdited ? "text-amber-500" : "text-[#8B2030]"}`}>
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
        <div className="mt-2 text-xs text-[#9E7078]">
          {isEdited && editedFood.kcal !== null ? "국물 음식 고정 테이블 (1인분 기준)" : food.source}
        </div>
      </div>

      {pickerOpen && (
        <FoodPicker
          currentName={displayName}
          onSelect={(name, kcal) => onFoodChange?.(name, kcal)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  )
}
