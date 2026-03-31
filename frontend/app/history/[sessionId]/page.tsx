"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { getHistorySession, type HistorySession, type HistoryFood } from "@/lib/api"

function NutrientRow({ label, value, unit }: { label: string; value: number | null | undefined; unit: string }) {
  if (value == null) return null
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-[#F5E8EA] last:border-0">
      <span className="text-[#6B4047]">{label}</span>
      <span className="font-medium text-[#1A0A0C]">{value.toLocaleString()} {unit}</span>
    </div>
  )
}

function FoodDetailCard({ food }: { food: HistoryFood }) {
  const name = food.final_food_name || food.ai_food_name || "알수없음"
  const calories = food.final_calories ?? food.ai_calories ?? 0
  const mass = food.final_mass_g ?? food.ai_mass_g ?? 0
  const nd = food.nutrient_detail as Record<string, number> | null

  return (
    <div className="bg-white border border-[#F0C4C8] rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-bold text-[#1A0A0C]">{name}</div>
          <div className="text-xs text-[#9E7078] mt-0.5">{mass.toFixed(0)}g</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-[#8B2030]">{calories.toFixed(0)}</div>
          <div className="text-xs text-[#9E7078]">kcal</div>
        </div>
      </div>

      {food.user_modified && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-[#8B2030] bg-[#FCE8EA] rounded-xl px-3 py-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          사용자 수정됨
        </div>
      )}

      {nd && (
        <div className="mt-2">
          <NutrientRow label="탄수화물" value={nd.carbs_g} unit="g" />
          <NutrientRow label="단백질" value={nd.protein_g} unit="g" />
          <NutrientRow label="지방" value={nd.fat_g} unit="g" />
          <NutrientRow label="나트륨" value={nd.sodium_mg} unit="mg" />
        </div>
      )}

      {food.is_composite && food.composite_breakdown && (
        <div className="mt-3">
          <div className="text-xs font-semibold text-[#9E7078] mb-1.5">구성 재료</div>
          <div className="space-y-1">
            {food.composite_breakdown.map((item, i) => (
              <div key={i} className="flex justify-between text-xs text-[#6B4047]">
                <span>{item.name}</span>
                <span>{item.mass_g?.toFixed(0)}g · {item.calories?.toFixed(0)}kcal</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function HistoryDetailPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const [session, setSession] = useState<HistorySession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return
    getHistorySession(sessionId)
      .then(setSession)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <svg className="animate-spin text-[#8B2030]" viewBox="0 0 24 24" fill="none" width="28" height="28">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div>
        <Link href="/history" className="flex items-center gap-2 text-[#8B2030] text-sm mb-6">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          기록 목록
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600">
          {error ?? "세션을 찾을 수 없습니다."}
        </div>
      </div>
    )
  }

  const approvedDate = session.approved_at
    ? new Date(session.approved_at).toLocaleString("ko-KR", {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "미승인"

  return (
    <div>
      {/* 뒤로가기 */}
      <Link href="/history" className="flex items-center gap-2 text-[#8B2030] text-sm mb-5">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        기록 목록
      </Link>

      {/* 헤더 카드 */}
      <div className="bg-[#8B2030] rounded-3xl p-5 mb-5 text-white">
        <div className="text-xs opacity-75 mb-1">{approvedDate}</div>
        <div className="text-3xl font-black mb-0.5">
          {session.total_calories.toLocaleString()}
          <span className="text-lg font-normal ml-1 opacity-80">kcal</span>
        </div>
        <div className="text-sm opacity-80">
          {session.food_names.join(", ") || "알수없음"}
        </div>
        {session.vessel_type && (
          <div className="text-xs opacity-60 mt-1">{session.vessel_type}</div>
        )}
      </div>

      {/* AI 정보 */}
      <div className="bg-white border border-[#F0C4C8] rounded-2xl px-4 py-3 mb-5 flex items-center justify-between shadow-sm">
        <div className="text-xs text-[#9E7078]">
          식약처 DB <span className="font-medium text-[#6B4047]">{session.mfds_db_version ?? "-"}</span>
        </div>
        {session.yolo_confidence != null && (
          <div className="text-xs text-[#9E7078]">
            AI 신뢰도 <span className="font-medium text-[#6B4047]">{(session.yolo_confidence * 100).toFixed(0)}%</span>
          </div>
        )}
        {session.hitl_triggered && (
          <div className="flex items-center gap-1 text-xs text-[#8B2030]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            HITL 검토됨
          </div>
        )}
      </div>

      {/* 음식 카드 목록 */}
      {session.foods && session.foods.length > 0 ? (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-[#1A0A0C] px-1 mb-1">음식 상세</div>
          {session.foods.map((food) => (
            <FoodDetailCard key={food.id} food={food} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-[#9E7078]">음식 기록이 없습니다.</div>
      )}
    </div>
  )
}
