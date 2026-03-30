import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "K-Food Vision Lens",
  description: "한국 음식 칼로리 분석 — 식약처 공식 DB 기반",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${geist.variable} antialiased min-h-screen bg-[#F8FAFC]`}>
        <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-2">
          <span className="text-2xl">🥗</span>
          <span className="font-bold text-slate-800 text-lg">K-Food Vision Lens</span>
          <span className="ml-auto text-xs text-slate-400">식약처 DB 기반</span>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
