import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "VOcal",
  description: "찍으면 칼로리가 보인다 — 식약처 공식 DB 기반",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${geist.variable} antialiased min-h-screen bg-[#FDF5F6]`}>
        <header className="bg-white border-b border-[#F0C4C8] px-4 py-3 flex items-center gap-3">
          {/* VOcal 통합 로고: 아이콘(VO) + cal 텍스트 = 하나의 워드마크 */}
          <div className="flex flex-col leading-none gap-0.5">
            <div className="flex items-center">
              {/* VO 아이콘 */}
              <svg viewBox="0 0 58 36" width="40" height="25" fill="none">
                <line x1="4" y1="1" x2="17" y2="35" stroke="#8B2030" strokeWidth="2.4" strokeLinecap="round"/>
                <line x1="24" y1="1" x2="13" y2="35" stroke="#8B2030" strokeWidth="2.4" strokeLinecap="round"/>
                <circle cx="44" cy="18" r="13" fill="#FDF5F6" stroke="#8B2030" strokeWidth="2.4"/>
                <circle cx="44" cy="18" r="7.5" fill="none" stroke="#8B2030" strokeWidth="1.2"/>
              </svg>
              {/* cal — 아이콘에 바짝 붙여서 하나의 로고처럼 */}
              <span className="font-black text-[#8B2030] text-xl tracking-tight" style={{ marginLeft: 1 }}>cal</span>
            </div>
            <span className="text-[10px] text-[#9E7078] tracking-wide pl-0.5">보이는 칼로리</span>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6 pb-16">{children}</main>
        <footer className="fixed bottom-0 left-0 right-0 border-t border-[#F0C4C8] bg-white py-3 px-4 flex items-center justify-between">
          {/* 좌측: 로고 */}
          <div className="flex items-center">
            <svg viewBox="0 0 58 36" width="28" height="18" fill="none">
              <line x1="4" y1="1" x2="17" y2="35" stroke="#8B2030" strokeWidth="2.4" strokeLinecap="round"/>
              <line x1="24" y1="1" x2="13" y2="35" stroke="#8B2030" strokeWidth="2.4" strokeLinecap="round"/>
              <circle cx="44" cy="18" r="13" fill="#FDF5F6" stroke="#8B2030" strokeWidth="2.4"/>
              <circle cx="44" cy="18" r="7.5" fill="none" stroke="#8B2030" strokeWidth="1.2"/>
            </svg>
            <span className="font-black text-[#8B2030] text-sm tracking-tight" style={{ marginLeft: 1 }}>cal</span>
          </div>
          {/* 우측: 식약처 표기 */}
          <span className="text-[10px] text-[#9E7078]">식약처DB사용</span>
        </footer>
      </body>
    </html>
  )
}
