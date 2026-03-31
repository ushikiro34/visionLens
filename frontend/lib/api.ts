const BASE = process.env.NEXT_PUBLIC_API_URL ?? ""

export interface NutrientSummary {
  energy_kcal: number
  carbs_g: number
  protein_g: number
  fat_g: number
  sodium_mg: number
}

export interface FoodResult {
  food_name: string
  mass_g: number
  calories: number
  nutrients: NutrientSummary
  is_composite: boolean
  breakdown: { name: string; mass_g: number; calories: number }[]
  confidence: number
  fill_ratio_2d: number
  fill_ratio_3d: number
  bowl_volume_ml: number
  density_used: number
  needs_hitl: boolean
  source: string
}

export interface AnalysisSession {
  session_id: string
  foods: FoodResult[]
  needs_hitl: boolean
  hitl_reason: string
  yolo_confidence: number | null
  mfds_db_version: string
  is_approved: boolean
}

export async function analyzeImage(
  file: File,
  vessel_type = "공기밥",
  size_hint = "중",
): Promise<AnalysisSession> {
  const form = new FormData()
  form.append("file", file)
  form.append("vessel_type", vessel_type)
  form.append("size_hint", size_hint)

  const res = await fetch(`${BASE}/api/v1/analysis/analyze`, {
    method: "POST",
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? "분석 실패")
  }
  return res.json()
}

export async function approveSession(sessionId: string) {
  const res = await fetch(`${BASE}/api/v1/analysis/approve/${sessionId}`, {
    method: "POST",
  })
  if (!res.ok) throw new Error("승인 실패")
  return res.json()
}

export async function saveFeedback(
  sessionId: string,
  feedback_type: "good" | "correction_needed" | "retake",
) {
  await fetch(`${BASE}/api/v1/analysis/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, feedback_type }),
  })
}

export interface HistoryFood {
  id: string
  ai_food_name: string | null
  final_food_name: string | null
  ai_calories: number | null
  final_calories: number | null
  ai_mass_g: number | null
  final_mass_g: number | null
  ai_confidence: number | null
  user_modified: boolean
  is_composite: boolean
  composite_breakdown: { name: string; mass_g: number; calories: number }[] | null
  nutrient_detail: Record<string, unknown> | null
}

export interface HistorySession {
  session_id: string
  created_at: string
  approved_at: string | null
  total_calories: number
  food_names: string[]
  food_count: number
  vessel_type: string | null
  hitl_triggered: boolean
  mfds_db_version: string | null
  yolo_confidence: number | null
  foods?: HistoryFood[]
}

export async function getHistory(limit = 20, offset = 0): Promise<{ sessions: HistorySession[]; total: number }> {
  const res = await fetch(`${BASE}/api/v1/history?limit=${limit}&offset=${offset}`)
  if (!res.ok) throw new Error("기록 조회 실패")
  return res.json()
}

export async function getHistorySession(sessionId: string): Promise<HistorySession> {
  const res = await fetch(`${BASE}/api/v1/history/${sessionId}`)
  if (!res.ok) throw new Error("세션 조회 실패")
  return res.json()
}

export async function getNutrient(foodName: string) {
  const res = await fetch(`${BASE}/api/v1/nutrient/${encodeURIComponent(foodName)}`)
  return res.json()
}

export async function healthCheck() {
  const res = await fetch(`${BASE}/health`)
  return res.json()
}
