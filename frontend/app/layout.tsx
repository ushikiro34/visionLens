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
          {/* 헤더: VO 아이콘 + VOCAL 워드마크 */}
          <div className="flex items-center gap-2.5">
            {/* VO 아이콘: 젓가락 V(좌) + 공기 탑뷰 O(우) */}
            <svg viewBox="0 0 58 36" width="38" height="24" fill="none">
              {/* 젓가락 왼쪽 (V 좌변) */}
              <line x1="4" y1="1" x2="17" y2="35" stroke="#8B2030" strokeWidth="2.4" strokeLinecap="round"/>
              {/* 젓가락 오른쪽 (V 우변), 살짝 교차 */}
              <line x1="24" y1="1" x2="13" y2="35" stroke="#8B2030" strokeWidth="2.4" strokeLinecap="round"/>
              {/* 공기 외곽 림 (O) */}
              <circle cx="44" cy="18" r="13" fill="#FDF5F6" stroke="#8B2030" strokeWidth="2.4"/>
              {/* 공기 내부 바닥 원 */}
              <circle cx="44" cy="18" r="7.5" fill="none" stroke="#8B2030" strokeWidth="1.2"/>
            </svg>
            {/* VOCAL 워드마크 */}
            <div className="flex flex-col justify-center leading-tight">
              <span className="font-black text-[#8B2030] text-xl tracking-widest">VOCAL</span>
              <span className="text-[10px] text-[#9E7078] tracking-wide">보이는 칼로리</span>
            </div>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6">{children}</main>
        <footer className="border-t border-[#F0C4C8] bg-white mt-8 py-4 px-4 text-center">
          <p className="text-xs text-[#9E7078]">식약처DB사용</p>
        </footer>
      </body>
    </html>
  )
}
