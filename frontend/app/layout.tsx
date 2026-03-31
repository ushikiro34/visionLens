import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "보칼",
  description: "찍으면 칼로리가 보인다 — 식약처 공식 DB 기반",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${geist.variable} antialiased min-h-screen bg-[#FDF5F6]`}>
        <header className="bg-white border-b border-[#F0C4C8] px-4 py-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#8B2030] flex items-center justify-center flex-shrink-0">
            <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-[#1A0A0C] text-lg tracking-tight">보칼</span>
            <span className="text-xs text-[#9E7078]">보이는 칼로리</span>
          </div>
          <span className="ml-auto text-xs text-[#9E7078] bg-[#FCE8EA] px-2 py-0.5 rounded-full">식약처 DB</span>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
