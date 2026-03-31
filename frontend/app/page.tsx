"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { analyzeImage } from "@/lib/api"

const VESSEL_TYPES = [
  "공기밥", "국그릇", "찬그릇", "비빔밥그릇", "라면그릇",
  "뚝배기", "쌀국수그릇", "덮밥그릇", "파스타볼", "샐러드볼",
  "접시(소)", "접시(중)", "접시(대)", "도시락", "종지",
]
const SIZE_STEPS = ["초소", "소", "중", "대", "초대"]

export default function HomePage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [vesselType, setVesselType] = useState("공기밥")
  const [sizeIndex, setSizeIndex] = useState(2) // 0=초소 1=소 2=중 3=대 4=초대
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFile(f: File) {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError(null)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  async function onAnalyze() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const session = await analyzeImage(file, vesselType, SIZE_STEPS[sizeIndex])
      router.push(`/analysis/${session.session_id}?data=${encodeURIComponent(JSON.stringify(session))}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "분석 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-base font-bold text-[#1A0A0C]">&#8203;음식사진으로 칼로리 분석합니다.</p>
      </div>

      {/* 업로드 영역 */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative border-2 border-dashed border-[#F0C4C8] rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-[#FCE8EA] hover:border-[#8B2030] transition-colors mb-4"
        style={{ minHeight: preview ? "auto" : 200 }}
      >
        {preview ? (
          <img src={preview} alt="미리보기" className="rounded-2xl max-h-64 object-contain w-full" />
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-[#FCE8EA] flex items-center justify-center mb-3">
              <svg className="text-[#8B2030]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <p className="font-semibold text-[#1A0A0C]">사진을 드래그하거나 클릭해서 업로드</p>
            <p className="text-sm text-[#9E7078] mt-1">JPG, PNG 지원</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      {/* 그릇 설정 */}
      {file && (
        <div className="bg-white rounded-2xl border border-[#F0C4C8] p-4 mb-4 shadow-sm">
          <div className="text-sm font-semibold text-[#1A0A0C] mb-3">그릇 설정</div>

          {/* 그릇 종류 — 셀렉트박스 */}
          <div className="mb-4">
            <div className="text-xs text-[#9E7078] mb-1.5">그릇 종류</div>
            <div className="relative">
              <select
                value={vesselType}
                onChange={(e) => setVesselType(e.target.value)}
                className="w-full appearance-none bg-[#FDF5F6] border border-[#F0C4C8] rounded-xl px-3 py-2.5 text-sm text-[#1A0A0C] font-medium focus:outline-none focus:border-[#8B2030] cursor-pointer pr-9"
              >
                {VESSEL_TYPES.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              {/* 커스텀 화살표 */}
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9E7078]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>

          {/* 그릇 크기 — 슬라이더 5단계 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs text-[#9E7078]">그릇 크기</div>
              <div className="text-xs font-semibold text-[#8B2030]">{sizeIndex + 1}</div>
            </div>
            <input
              type="range"
              min={0}
              max={4}
              step={1}
              value={sizeIndex}
              onChange={(e) => setSizeIndex(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#8B2030] bg-[#F0C4C8]"
            />
            <div className="flex justify-between mt-1.5">
              {[1, 2, 3, 4, 5].map((n, i) => (
                <span
                  key={n}
                  className={`text-[10px] ${sizeIndex === i ? "text-[#8B2030] font-bold" : "text-[#C4878E]"}`}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 분석 버튼 */}
      <button
        onClick={onAnalyze}
        disabled={!file || loading}
        className="w-full py-4 rounded-3xl font-bold text-white text-base transition-all
          bg-[#8B2030] hover:bg-[#6D1826] active:scale-95
          disabled:bg-[#E2D0D2] disabled:text-[#B09498] disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin" viewBox="0 0 24 24" fill="none" width="20" height="20">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            분석 중...
          </span>
        ) : "분석하기"}
      </button>

      <p className="text-center text-xs text-[#9E7078] mt-3">
        AI 분석 결과는 반드시 사용자 확인 후 저장됩니다 (식약처 ±10% 오차)
      </p>
    </div>
  )
}
