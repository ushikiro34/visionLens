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
      await approveSession(sessionId)
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
    return <div className="text-center text-slate-400 py-12">불러오는 중...</div>
  }

  if (approved) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">기록 완료!</h2>
        <p className="text-sm text-slate-500 mb-6">식약처 DB 기준으로 최종 저장되었습니다.</p>

        {/* 피드백 */}
        {!feedback ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-600 mb-3">AI가 도움이 되었나요?</p>
            <div className="flex gap-2">
              {[
                { type: "good" as FeedbackType, label: "👍 도움됐어요" },
                { type: "correction_needed" as FeedbackType, label: "✏️ 보정 많았어요" },
                { type: "retake" as FeedbackType, label: "📷 재촬영 필요" },
              ].map((fb) => (
                <button
                  key={fb.type}
                  onClick={() => onFeedback(fb.type)}
                  className="flex-1 py-2 px-2 text-xs font-medium rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  {fb.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#22C55E] font-medium mb-6">피드백 감사합니다 🙏</p>
        )}

        <button
          onClick={() => router.push("/")}
          className="w-full py-4 rounded-3xl font-bold text-white bg-[#22C55E] hover:bg-[#16A34A] transition-colors"
        >
          새 식사 분석하기
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push("/")} className="text-sm text-slate-400 hover:text-slate-600">
          ← 다시 촬영
        </button>
        <span className="text-xs text-slate-400">세션 {sessionId.slice(0, 8)}...</span>
      </div>

      {/* HITL 경고 배너 */}
      {session.needs_hitl && (
        <div className="flex items-start gap-2 bg-[#FEFCE8] border border-[#FACC15] rounded-2xl px-4 py-3 mb-4">
          <span className="text-lg mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-700">확인이 필요합니다</p>
            <p className="text-xs text-amber-600 mt-0.5">{session.hitl_reason || "AI 신뢰도가 낮아 사용자 확인이 필요합니다."}</p>
          </div>
        </div>
      )}

      {/* 총 칼로리 요약 */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-4">
        <div className="text-xs text-slate-400 mb-1">이번 식사 총 칼로리</div>
        <div className="flex items-end gap-2 mb-3">
          <span className="text-4xl font-bold text-[#22C55E]">{Math.round(totalCalories)}</span>
          <span className="text-lg text-slate-400 pb-1">kcal</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "탄수화물", value: totalCarbs, unit: "g" },
            { label: "단백질", value: totalProtein, unit: "g" },
            { label: "지방", value: totalFat, unit: "g" },
          ].map((n) => (
            <div key={n.label} className="bg-slate-50 rounded-xl py-2">
              <div className="text-sm font-bold text-slate-700">{n.value.toFixed(1)}{n.unit}</div>
              <div className="text-xs text-slate-400">{n.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-slate-400 flex items-center gap-1">
          <span>📊</span>
          <span>식약처 {session.mfds_db_version} 기준</span>
          {session.yolo_confidence && (
            <span className="ml-auto">AI 신뢰도 {Math.round(session.yolo_confidence * 100)}%</span>
          )}
        </div>
      </div>

      {/* 음식 카드 목록 */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-600 mb-2">검출된 음식 ({session.foods.length}개)</h2>
        {session.foods.map((food, i) => (
          <FoodCard key={i} food={food} index={i} />
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
            bg-[#22C55E] hover:bg-[#16A34A] active:scale-95
            disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
        >
          {approving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              저장 중...
            </span>
          ) : "이 값으로 저장"}
        </button>
        <p className="text-center text-xs text-slate-400 mt-2">
          확인 후 저장해야 최종 기록됩니다 (HITL)
        </p>
      </div>
    </div>
  )
}
