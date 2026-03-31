"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { getHistory, type HistorySession } from "@/lib/api"

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<HistorySession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getHistory(30)
      .then((data) => setSessions(data.sessions))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // 날짜별 그룹핑
  const grouped: Record<string, HistorySession[]> = {}
  for (const s of sessions) {
    const key = formatDate(s.approved_at ?? s.created_at)
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(s)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A0A0C] mb-1">기록</h1>
        <p className="text-sm text-[#9E7078]">승인된 식사 기록을 확인합니다.</p>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <svg className="animate-spin text-[#8B2030]" viewBox="0 0 24 24" fill="none" width="28" height="28">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-[#FCE8EA] flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#8B2030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
              <line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
          </div>
          <p className="text-[#1A0A0C] font-semibold mb-1">저장된 기록이 없습니다</p>
          <p className="text-sm text-[#9E7078]">식사를 분석하고 승인하면 여기에 표시됩니다.</p>
          <Link
            href="/"
            className="inline-block mt-4 px-5 py-2.5 bg-[#8B2030] text-white rounded-2xl text-sm font-semibold"
          >
            분석하러 가기
          </Link>
        </div>
      )}

      {!loading && Object.keys(grouped).length > 0 && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <div className="text-xs font-semibold text-[#9E7078] mb-2 px-1">{date}</div>
              <div className="space-y-2">
                {items.map((s) => (
                  <Link
                    key={s.session_id}
                    href={`/history/${s.session_id}`}
                    className="block bg-white border border-[#F0C4C8] rounded-2xl px-4 py-3 shadow-sm hover:border-[#8B2030] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[#1A0A0C] text-sm truncate">
                          {s.food_names.join(", ") || "알수없음"}
                        </div>
                        <div className="text-xs text-[#9E7078] mt-0.5">
                          {formatTime(s.approved_at ?? s.created_at)}
                          {s.vessel_type && <span className="ml-2">{s.vessel_type}</span>}
                        </div>
                      </div>
                      <div className="ml-3 text-right shrink-0">
                        <div className="text-lg font-bold text-[#8B2030]">
                          {s.total_calories.toLocaleString()}
                        </div>
                        <div className="text-xs text-[#9E7078]">kcal</div>
                      </div>
                      <svg className="ml-2 text-[#C4878E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
