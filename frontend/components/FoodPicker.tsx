"use client"
import { useState, useRef, useEffect } from "react"
import { FOOD_LIST, FOOD_CATEGORIES, type FoodOption } from "@/lib/foodList"

interface Props {
  currentName: string
  onSelect: (name: string, kcal: number | null) => void
  onClose: () => void
}

export default function FoodPicker({ currentName, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("")
  const [directMode, setDirectMode] = useState(false)
  const [directName, setDirectName] = useState(currentName)
  const inputRef = useRef<HTMLInputElement>(null)
  const directRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { if (directMode) directRef.current?.focus() }, [directMode])

  const filtered: FoodOption[] = query
    ? FOOD_LIST.filter(f => f.name.includes(query))
    : FOOD_LIST

  // 카테고리별 그룹
  const grouped = FOOD_CATEGORIES.reduce<Record<string, FoodOption[]>>((acc, cat) => {
    const items = filtered.filter(f => f.category === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {})

  function handleSelect(food: FoodOption) {
    onSelect(food.name, food.kcal)
    onClose()
  }

  function handleDirectConfirm() {
    const name = directName.trim()
    if (name) onSelect(name, null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* 핸들 + 헤더 */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[#E0C8CA] mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
          <span className="text-sm font-semibold text-[#1A0A0C]">음식 종류 변경</span>
          <button onClick={onClose} className="text-[#9E7078] hover:text-[#6B4047] p-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* 검색창 */}
        {!directMode && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 bg-[#FDF5F6] rounded-2xl px-3 py-2">
              <svg className="text-[#9E7078] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="음식 이름 검색..."
                className="bg-transparent text-sm text-[#1A0A0C] placeholder:text-[#C4878E] outline-none flex-1"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-[#C4878E]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 직접 입력 모드 */}
        {directMode ? (
          <div className="px-4 py-3 flex flex-col gap-3">
            <p className="text-xs text-[#9E7078]">목록에 없는 음식을 직접 입력하세요. 칼로리는 AI 추정값이 유지됩니다.</p>
            <input
              ref={directRef}
              type="text"
              value={directName}
              onChange={e => setDirectName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleDirectConfirm()}
              placeholder="음식명 입력"
              className="border border-[#F0C4C8] rounded-2xl px-4 py-3 text-sm text-[#1A0A0C] outline-none focus:border-[#8B2030]"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setDirectMode(false)}
                className="flex-1 py-2.5 rounded-2xl border border-[#F0C4C8] text-sm text-[#6B4047]"
              >
                목록으로
              </button>
              <button
                onClick={handleDirectConfirm}
                className="flex-1 py-2.5 rounded-2xl bg-[#8B2030] text-white text-sm font-semibold"
              >
                확인
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 음식 목록 */}
            <div className="overflow-y-auto flex-1 px-4 pb-2">
              {Object.keys(grouped).length === 0 ? (
                <p className="text-center text-sm text-[#9E7078] py-8">검색 결과 없음</p>
              ) : (
                Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat} className="mb-3">
                    <div className="text-[10px] font-semibold text-[#9E7078] uppercase tracking-wide mb-1.5 px-1">{cat}</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {items.map(food => (
                        <button
                          key={food.name}
                          onClick={() => handleSelect(food)}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl border text-left transition-colors
                            ${food.name === currentName
                              ? "bg-[#FCE8EA] border-[#8B2030] text-[#8B2030]"
                              : "bg-[#FDF5F6] border-transparent text-[#1A0A0C] hover:border-[#F0C4C8]"
                            }`}
                        >
                          <span className="text-sm font-medium truncate">{food.name}</span>
                          <span className="text-xs text-[#9E7078] shrink-0 ml-1">{food.kcal}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 직접 입력 버튼 */}
            <div className="px-4 py-3 border-t border-[#F8ECEE]">
              <button
                onClick={() => setDirectMode(true)}
                className="w-full py-2.5 rounded-2xl border border-[#F0C4C8] text-sm text-[#6B4047] flex items-center justify-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                목록에 없음 — 직접 입력
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
