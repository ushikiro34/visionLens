"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { analyzeImage } from "@/lib/api"

const VESSEL_TYPES = ["공기밥", "국그릇", "찬그릇", "비빔밥그릇", "라면그릇"]
const SIZE_HINTS = ["소", "중", "대"]

export default function HomePage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [vesselType, setVesselType] = useState("공기밥")
  const [sizeHint, setSizeHint] = useState("중")
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
      const session = await analyzeImage(file, vesselType, sizeHint)
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
        <h1 className="text-2xl font-bold text-slate-800 mb-1">식사 분석</h1>
        <p className="text-sm text-slate-500">음식 사진을 업로드하면 칼로리를 분석합니다</p>
      </div>

      {/* 업로드 영역 */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative border-2 border-dashed border-[#22C55E] rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-green-50 transition-colors mb-4"
        style={{ minHeight: preview ? "auto" : 200 }}
      >
        {preview ? (
          <img src={preview} alt="미리보기" className="rounded-2xl max-h-64 object-contain w-full" />
        ) : (
          <>
            <span className="text-5xl mb-3">📷</span>
            <p className="font-semibold text-slate-600">사진을 드래그하거나 클릭해서 업로드</p>
            <p className="text-sm text-slate-400 mt-1">JPG, PNG 지원</p>
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
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-600 mb-3">그릇 설정</div>

          <div className="mb-3">
            <div className="text-xs text-slate-400 mb-1.5">그릇 종류</div>
            <div className="flex flex-wrap gap-2">
              {VESSEL_TYPES.map((v) => (
                <button
                  key={v}
                  onClick={() => setVesselType(v)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    vesselType === v
                      ? "bg-[#22C55E] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1.5">그릇 크기</div>
            <div className="flex gap-2">
              {SIZE_HINTS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSizeHint(s)}
                  className={`flex-1 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    sizeHint === s
                      ? "bg-[#22C55E] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s}
                </button>
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
          bg-[#22C55E] hover:bg-[#16A34A] active:scale-95
          disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            분석 중...
          </span>
        ) : "분석하기"}
      </button>

      <p className="text-center text-xs text-slate-400 mt-3">
        AI 분석 결과는 반드시 사용자 확인 후 저장됩니다 (식약처 ±10% 오차)
      </p>
    </div>
  )
}
