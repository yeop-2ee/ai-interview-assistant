"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IconLogOut, IconSettings } from "./Icons";
import { getSessionToken, clearSession } from "@/lib/auth";

// 다른 파일에서 authFetch를 import할 수 있도록 re-export
export { authFetch } from "@/lib/auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

const STEPS = [
  { href: "/setup", label: "면접 설정" },
  { href: "/upload", label: "자료 업로드" },
  { href: "/interview", label: "면접 진행" },
  { href: "/report", label: "결과 확인" },
];

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      const loggedIn = localStorage.getItem("isLoggedIn");
      if (loggedIn === "true") {
        setUser({
          name: localStorage.getItem("userName") ?? "",
          email: localStorage.getItem("userEmail") ?? "",
          role: localStorage.getItem("userRole") ?? "user",
        });
      } else {
        setUser(null);
      }
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const handleLogout = async () => {
    const token = getSessionToken();
    if (token) {
      fetch(`${BACKEND_URL}/auth/logout`, {
        method: "POST",
        headers: { "x-session-token": token },
      }).catch(() => {});
    }
    clearSession();
    setUser(null);
    setMobileOpen(false);
    router.push("/");
  };

  return (
    <header className="bg-white border-b border-[#e4e7ef] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[60px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-[#0d1035] hover:opacity-80 transition-opacity">
          <span className="font-semibold text-[15px] tracking-tight">AI기반 맞춤 면접 도우미</span>
        </Link>

        {/* 데스크톱 nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {user ? (
            <>
              {user.role === "admin" && (
                <Link href="/admin" className="text-[13px] text-[#6b7280] hover:text-[#0d1035] px-3 py-1.5 rounded-lg hover:bg-[#f0f2f8] transition-all flex items-center gap-1.5">
                  <IconSettings className="w-3.5 h-3.5" /> 관리자
                </Link>
              )}
              <Link href="/profile" className="text-[13px] text-[#374151] hover:text-[#0d1035] px-3 py-1.5 rounded-lg hover:bg-[#f0f2f8] transition-all flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#eef0fd] text-[#4f52e8] flex items-center justify-center text-[11px] font-bold">
                  {user.name.slice(0, 1)}
                </span>
                <span>{user.name}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-[13px] text-[#6b7280] hover:text-[#dc2626] px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all flex items-center gap-1.5"
              >
                <IconLogOut className="w-3.5 h-3.5" /> 로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-[13px] text-[#374151] hover:text-[#0d1035] px-3 py-1.5 rounded-lg hover:bg-[#f0f2f8] transition-all">
                로그인
              </Link>
              <Link
                href="/signup"
                className="text-[13px] font-medium bg-[#4f52e8] text-white px-4 py-1.5 rounded-lg hover:bg-[#3e41d4] transition-colors ml-1"
              >
                회원가입
              </Link>
            </>
          )}
        </nav>

        {/* 모바일 햄버거 버튼 */}
        <button
          className="sm:hidden p-2 -mr-1 text-[#374151] hover:text-[#0d1035] transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="메뉴"
        >
          {mobileOpen ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          )}
        </button>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-[#e4e7ef] bg-white px-4 py-3 space-y-1">
          {user ? (
            <>
              <Link href="/profile" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#f8f9fc] transition-colors">
                <span className="w-9 h-9 rounded-full bg-[#eef0fd] text-[#4f52e8] flex items-center justify-center text-[14px] font-bold flex-shrink-0">
                  {user.name.slice(0, 1)}
                </span>
                <div>
                  <div className="text-[14px] font-semibold text-[#0d1035]">{user.name}</div>
                  <div className="text-[12px] text-[#9ca3af]">{user.email}</div>
                </div>
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-3 rounded-xl hover:bg-[#f8f9fc] transition-colors text-[14px] text-[#6b7280]">
                  <IconSettings className="w-4.5 h-4.5" /> 관리자
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-3 rounded-xl hover:bg-red-50 transition-colors text-[14px] text-rose-500"
              >
                <IconLogOut className="w-4 h-4" /> 로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMobileOpen(false)}
                className="flex items-center px-3 py-3 rounded-xl hover:bg-[#f8f9fc] transition-colors text-[14px] font-medium text-[#374151]">
                로그인
              </Link>
              <Link href="/signup" onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center px-3 py-3 rounded-xl bg-[#4f52e8] text-[14px] font-semibold text-white hover:bg-[#3e41d4] transition-colors">
                회원가입
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

export function StepNavbar() {
  const pathname = usePathname();
  const currentIdx = STEPS.findIndex((s) => pathname.startsWith(s.href));
  const currentStep = STEPS[Math.max(0, currentIdx)];

  return (
    <header className="bg-white border-b border-[#e4e7ef] sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-[60px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-[#0d1035] hover:opacity-70 transition-opacity">
          <span className="font-semibold text-[14px] tracking-tight">AI기반 맞춤 면접 도우미</span>
        </Link>

        {/* 모바일: 현재 단계 표시 */}
        <div className="sm:hidden flex items-center gap-1.5 text-[13px]">
          <span className="font-bold text-[#4f52e8]">{currentIdx + 1}</span>
          <span className="text-[#d1d5db]">/</span>
          <span className="text-[#9ca3af]">{STEPS.length}</span>
          <span className="text-[#e4e7ef] mx-1">·</span>
          <span className="font-semibold text-[#4f52e8]">{currentStep.label}</span>
        </div>

        {/* 데스크톱: 전체 단계 목록 */}
        <ol className="hidden sm:flex items-center gap-1">
          {STEPS.map((step, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <li key={step.href} className="flex items-center gap-1">
                {i > 0 && <span className="text-[#d1d5db] text-xs mx-0.5">·</span>}
                <span
                  className={`text-[12px] font-medium px-2 py-1 rounded-md ${
                    active
                      ? "text-[#4f52e8] bg-[#eef0fd]"
                      : done
                      ? "text-[#059669]"
                      : "text-[#9ca3af]"
                  }`}
                >
                  {done && <span className="mr-0.5">✓</span>}
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </header>
  );
}
