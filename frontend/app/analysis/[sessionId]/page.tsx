"use client"
import { use, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import type { AnalysisSession } from "@/lib/api"
import { approveSession, saveFeedback } from "@/lib/api"
import FoodCard from "@/components/FoodCard"

type FeedbackType = "good" | "correction_needed" | "retake"

export default function AnalysisPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [session, setSession] = useState<AnalysisSession | null>(null)
  const [approving, setApproving] = useState(false)
  const [approved, setApproved] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editedNames, setEditedNames] = useState<Record<number, string>>({})

  useEffect(() => {
    const raw = searchParams.get("data")
    if (raw) {
      try {
        setSession(JSON.parse(decodeURIComponent(raw)))
      } catch {
        setError("분석 결과를 불러올 수 없습니다.")
      }
    }
  }, [searchParams])

  const totalCalories = session?.foods.reduce((s, f) => s + f.calories, 0) ?? 0
  const totalCarbs = session?.foods.reduce((s, f) => s + f.nutrients.carbs_g, 0) ?? 0
  const totalProtein = session?.foods.reduce((s, f) => s + f.nutrients.protein_g, 0) ?? 0
  const totalFat = session?.foods.reduce((s, f) => s + f.nutrients.fat_g, 0) ?? 0

  async function onApprove() {
    if (!session) return
    setApproving(true)
    setError(null)
    try {
      const corrections = Object.entries(editedNames).map(([i, food_name]) => ({
        index: Number(i),
        food_name,
      }))
      await approveSession(sessionId, corrections)
      setApproved(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "승인 실패")
    } finally {
      setApproving(false)
    }
  }

  async function onFeedback(type: FeedbackType) {
    if (!session) return
    setFeedback(type)
    await saveFeedback(sessionId, type).catch(() => null)
  }

  if (error && !session) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600">{error}</div>
    )
  }
  if (!session) {
    return <div className="text-center text-[#9E7078] py-12">불러오는 중...</div>
  }

  if (approved) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-[#FCE8EA] flex items-center justify-center mx-auto mb-4">
          <svg className="text-[#8B2030]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#1A0A0C] mb-6">기록 완료!</h2>

        {!feedback ? (
          <div className="bg-white rounded-2xl border border-[#F0C4C8] p-4 mb-6 shadow-sm">
            <p className="text-sm font-semibold text-[#1A0A0C] mb-3">AI가 도움이 되었나요?</p>
            <div className="flex gap-2">
              {[
                {
                  type: "good" as FeedbackType,
                  label: "도움됐어요",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                    </svg>
                  ),
                },
                {
                  type: "correction_needed" as FeedbackType,
                  label: "보정 많았어요",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  ),
                },
                {
                  type: "retake" as FeedbackType,
                  label: "재촬영 필요",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  ),
                },
              ].map((fb) => (
                <button
                  key={fb.type}
                  onClick={() => onFeedback(fb.type)}
                  className="flex-1 py-2 px-2 text-xs font-medium rounded-xl bg-[#FDF5F6] text-[#6B4047] hover:bg-[#FCE8EA] transition-colors flex items-center justify-center gap-1"
                >
                  {fb.icon}
                  {fb.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#8B2030] font-medium mb-6">피드백 감사합니다</p>
        )}

        <button
          onClick={() => router.push("/")}
          className="w-full py-4 rounded-3xl font-bold text-white bg-[#8B2030] hover:bg-[#6D1826] transition-colors"
        >
          메인페이지로 이동
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-sm text-[#9E7078] hover:text-[#6B4047]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          다시 촬영
        </button>
        <span className="text-xs text-[#9E7078] bg-[#FCE8EA] px-2 py-0.5 rounded-full">
          {sessionId.slice(0, 8)}...
        </span>
      </div>

      {/* 복잡한 사진 안내 배너 */}
      {session.foods.some((f) => f.food_name === "분석불가") && (
        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 mb-4">
          <svg className="text-blue-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-blue-700">이 사진으로는 분석이 어렵습니다.</p>
            <p className="text-xs text-blue-600 mt-0.5">메인 음식을 가까이서 단독으로 촬영해주세요.</p>
          </div>
        </div>
      )}

      {/* HITL 경고 배너 */}
      {session.needs_hitl && !session.foods.some((f) => f.food_name === "분석불가") && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
          <svg className="text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-700">확인이 필요합니다</p>
            <p className="text-xs text-amber-600 mt-0.5">{session.hitl_reason || "AI 신뢰도가 낮아 사용자 확인이 필요합니다."}</p>
          </div>
        </div>
      )}

      {/* 총 칼로리 요약 */}
      <div className="bg-white rounded-3xl border border-[#F0C4C8] shadow-sm p-5 mb-4">
        <div className="text-xs text-[#9E7078] mb-1">이번 식사 총 칼로리</div>
        <div className="flex items-end gap-2 mb-3">
          <span className="text-4xl font-bold text-[#8B2030]">{Math.round(totalCalories)}</span>
          <span className="text-lg text-[#9E7078] pb-1">kcal</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "탄수화물", value: totalCarbs, unit: "g" },
            { label: "단백질", value: totalProtein, unit: "g" },
            { label: "지방", value: totalFat, unit: "g" },
          ].map((n) => (
            <div key={n.label} className="bg-[#FDF5F6] rounded-xl py-2">
              <div className="text-sm font-bold text-[#1A0A0C]">{n.value.toFixed(1)}{n.unit}</div>
              <div className="text-xs text-[#9E7078]">{n.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-[#9E7078] flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <span>식약처 {session.mfds_db_version} 기준</span>
          {session.yolo_confidence && (
            <span className="ml-auto">AI 신뢰도 {Math.round(session.yolo_confidence * 100)}%</span>
          )}
        </div>
      </div>

      {/* 음식 카드 목록 */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-[#6B4047] mb-2">검출된 음식 ({session.foods.length}개)</h2>
        {session.foods.map((food, i) => (
          <FoodCard
            key={i}
            food={food}
            index={i}
            editable
            editedName={editedNames[i]}
            onNameChange={(name) => setEditedNames((prev) => ({ ...prev, [i]: name }))}
          />
        ))}
      </div>

      {/* 에러 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4 text-sm text-red-600">{error}</div>
      )}

      {/* HITL 승인 버튼 */}
      <div className="sticky bottom-4">
        <button
          onClick={onApprove}
          disabled={approving}
          className="w-full py-4 rounded-3xl font-bold text-white text-base transition-all shadow-lg
            bg-[#8B2030] hover:bg-[#6D1826] active:scale-95
            disabled:bg-[#E2D0D2] disabled:text-[#B09498] disabled:cursor-not-allowed"
        >
          {approving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin" viewBox="0 0 24 24" fill="none" width="20" height="20">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              저장 중...
            </span>
          ) : "저장"}
        </button>
        <p className="text-center text-xs text-[#9E7078] mt-2">
          저장해야 최종 기록됩니다.
        </p>
      </div>
    </div>
  )
}
