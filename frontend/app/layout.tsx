import type { Metadata } from "next"
import { Geist } from "next/font/google"
import Link from "next/link"
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
        <footer className="fixed bottom-0 left-0 right-0 border-t border-[#F0C4C8] bg-white py-2 px-6 flex items-center justify-around">
          {/* 홈 */}
          <Link href="/" className="flex flex-col items-center gap-0.5 text-[#9E7078] hover:text-[#8B2030] transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
              <polyline points="9 21 9 12 15 12 15 21"/>
            </svg>
            <span className="text-[10px] font-medium">홈</span>
          </Link>

          {/* 중앙: 로고 */}
          <Link href="/" className="flex items-center">
            <svg viewBox="0 0 58 36" width="28" height="18" fill="none">
              <line x1="4" y1="1" x2="17" y2="35" stroke="#8B2030" strokeWidth="2.4" strokeLinecap="round"/>
              <line x1="24" y1="1" x2="13" y2="35" stroke="#8B2030" strokeWidth="2.4" strokeLinecap="round"/>
              <circle cx="44" cy="18" r="13" fill="#FDF5F6" stroke="#8B2030" strokeWidth="2.4"/>
              <circle cx="44" cy="18" r="7.5" fill="none" stroke="#8B2030" strokeWidth="1.2"/>
            </svg>
            <span className="font-black text-[#8B2030] text-sm tracking-tight" style={{ marginLeft: 1 }}>cal</span>
          </Link>

          {/* 기록 */}
          <Link href="/history" className="flex flex-col items-center gap-0.5 text-[#9E7078] hover:text-[#8B2030] transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/>
              <line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
            <span className="text-[10px] font-medium">기록</span>
          </Link>
        </footer>
      </body>
    </html>
  )
}
