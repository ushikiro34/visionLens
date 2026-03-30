"use client"

interface Props {
  label: string
  value: number
  unit: string
  color?: string
}

export default function NutrientBar({ label, value, unit, color = "#22C55E" }: Props) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-slate-500 w-16">{label}</span>
      <span className="text-sm font-semibold text-slate-800">
        {value.toFixed(1)}<span className="text-xs text-slate-400 ml-0.5">{unit}</span>
      </span>
    </div>
  )
}
