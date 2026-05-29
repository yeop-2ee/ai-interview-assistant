"use client"

import { useEffect, useState } from "react"
import { useSessionGuard } from "@/hooks/useSessionGuard"

export function SessionGuardProvider({ children }: { children: React.ReactNode }) {
  useSessionGuard()
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const handler = () => {
      setExpired(true)
      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        window.location.href = "/login"
      }, 3000)
    }
    window.addEventListener("session-expired", handler)
    return () => window.removeEventListener("session-expired", handler)
  }, [])

  return (
    <>
      {children}

      {/* 세션 만료 오버레이 토스트 */}
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 ${
          expired ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3 bg-white border border-amber-200 rounded-2xl shadow-xl px-5 py-3.5 min-w-[340px]">
          <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-[#0d1035]">세션이 만료되었습니다</p>
            <p className="text-[11.5px] text-[#6b7280] mt-0.5">다른 기기에서 로그인하여 세션이 만료되었습니다. 잠시 후 로그인 페이지로 이동합니다.</p>
          </div>
          <div className="flex-shrink-0 flex items-center">
            <svg className="w-4 h-4 animate-spin text-amber-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        </div>
      </div>
    </>
  )
}
