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

export async function getNutrient(foodName: string) {
  const res = await fetch(`${BASE}/api/v1/nutrient/${encodeURIComponent(foodName)}`)
  return res.json()
}

export async function healthCheck() {
  const res = await fetch(`${BASE}/health`)
  return res.json()
}
