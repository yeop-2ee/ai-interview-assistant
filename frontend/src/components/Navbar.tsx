"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconLogOut, IconSettings } from "./Icons";

const STEPS = [
  { href: "/setup", label: "면접 설정" },
  { href: "/upload", label: "자료 업로드" },
  { href: "/interview", label: "면접 진행" },
  { href: "/report", label: "결과 확인" },
];

export function Navbar({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <header className="bg-white border-b border-[#e4e7ef] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-[60px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-[#0d1035] hover:opacity-80 transition-opacity">
<span className="font-semibold text-[15px] tracking-tight">AI기반 맞춤 면접 도우미</span>
        </Link>

        <nav className="flex items-center gap-1">
          {isAdmin ? (
            <>
              <Link href="/admin" className="text-[13px] text-[#6b7280] hover:text-[#0d1035] px-3 py-1.5 rounded-lg hover:bg-[#f0f2f8] transition-all flex items-center gap-1.5">
                <IconSettings className="w-3.5 h-3.5" /> 관리자 대시보드
              </Link>
              <Link href="/" className="text-[13px] text-[#6b7280] hover:text-[#dc2626] px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all flex items-center gap-1.5">
                <IconLogOut className="w-3.5 h-3.5" /> 로그아웃
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-[13px] text-[#374151] hover:text-[#0d1035] px-3 py-1.5 rounded-lg hover:bg-[#f0f2f8] transition-all">
                로그인
              </Link>
              <Link
                href="/setup"
                className="text-[13px] font-medium bg-[#4f52e8] text-white px-4 py-1.5 rounded-lg hover:bg-[#3e41d4] transition-colors ml-1"
              >
                시작하기
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function StepNavbar() {
  const pathname = usePathname();
  const currentIdx = STEPS.findIndex((s) => pathname.startsWith(s.href));

  return (
    <header className="bg-white border-b border-[#e4e7ef] sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-6 h-[60px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-[#0d1035] hover:opacity-70 transition-opacity">
<span className="font-semibold text-[14px] tracking-tight">AI기반 맞춤 면접 도우미</span>
        </Link>

        <ol className="flex items-center gap-1">
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
