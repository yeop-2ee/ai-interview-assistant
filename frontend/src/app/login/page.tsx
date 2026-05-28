"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconUser, IconLock, IconEye, IconEyeOff, IconArrowRight } from "@/components/Icons";

type Mode = "user" | "admin";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "admin") {
        const res = await fetch(`${BACKEND_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, mode: "admin" }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "로그인에 실패했습니다."); return; }
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userRole", "admin");
        localStorage.setItem("userName", data.name);
        localStorage.setItem("userEmail", data.email);
        localStorage.setItem("sessionToken", data.sessionToken);
        router.push("/admin");
      } else {
        const res = await fetch(`${BACKEND_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, mode: "user" }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "로그인에 실패했습니다."); return; }
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userRole", data.role ?? "user");
        localStorage.setItem("userName", data.name);
        localStorage.setItem("userEmail", data.email);
        localStorage.setItem("sessionToken", data.sessionToken);
        router.push("/");
      }
    } catch {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ─── Left panel ─── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between bg-[#0d1035] p-12 relative overflow-hidden flex-shrink-0">
        {/* Decorative glow */}
        <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] bg-[#4f52e8] rounded-full blur-[160px] opacity-20 pointer-events-none" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[280px] h-[280px] bg-[#67e8f9] rounded-full blur-[120px] opacity-10 pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-2.5 relative z-10">
<span className="text-white font-semibold text-[16px] tracking-tight">AI기반 맞춤 면접 도우미</span>
        </div>

        {/* Body */}
        <div className="relative z-10">
          <h2 className="text-[36px] font-bold text-white leading-tight mb-4">
            다시 만나서<br />반갑습니다
          </h2>
          <p className="text-white/50 text-[15px] leading-relaxed mb-10">
            로그인하고 이전 연습 기록과 피드백을 이어서 확인하세요.
          </p>

          <div className="space-y-4">
            {[
              "이력서 기반 맞춤 질문 자동 생성",
              "실시간 음성 면접 & 꼬리질문",
              "다차원 결과 리포트 저장",
            ].map((text) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-white/60 text-[14px]">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quote */}
        <div className="relative z-10 border-t border-white/[0.08] pt-8">
          <p className="text-white/40 text-[13px] leading-relaxed italic">
            &ldquo;3번 연습하고 실제 면접에서 꼬리질문에 당황하지 않을 수 있었어요.&rdquo;
          </p>
          <p className="text-white/30 text-[12px] mt-2">— 컴퓨터공학과 4학년 취준생</p>
        </div>
      </div>

      {/* ─── Right panel (form) ─── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#f8f9fc]">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
<span className="font-semibold text-[#0d1035]">AI기반 맞춤 면접 도우미</span>
          </div>

          <h1 className="text-[26px] font-bold text-[#0d1035] mb-1">로그인</h1>
          <p className="text-[14px] text-[#6b7280] mb-8">
            계정이 없으신가요?{" "}
            <Link href="/signup" className="text-[#4f52e8] font-medium hover:underline">
              회원가입
            </Link>
          </p>

          {/* Mode toggle */}
          <div className="flex bg-[#eef0fd] p-1 rounded-xl mb-7">
            {(["user", "admin"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all ${
                  mode === m
                    ? "bg-white text-[#0d1035] shadow-sm"
                    : "text-[#6b7280] hover:text-[#374151]"
                }`}
              >
                {m === "user" ? "일반 로그인" : "관리자 로그인"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5">이메일</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]">
                  <IconUser className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#e4e7ef] rounded-xl text-[14px] text-[#0d1035] placeholder-[#c4c9d6] focus:outline-none focus:border-[#4f52e8] focus:ring-1 focus:ring-[#4f52e8] transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5">비밀번호</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]">
                  <IconLock className="w-4 h-4" />
                </div>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#e4e7ef] rounded-xl text-[14px] text-[#0d1035] placeholder-[#c4c9d6] focus:outline-none focus:border-[#4f52e8] focus:ring-1 focus:ring-[#4f52e8] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] transition-colors"
                >
                  {showPw ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-[13px] text-red-600">{error}</p>
              </div>
            )}

            {/* Options */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 rounded border-[#d1d5db] accent-[#4f52e8]" />
                <span className="text-[13px] text-[#6b7280]">로그인 유지</span>
              </label>
              <a href="#" className="text-[13px] text-[#4f52e8] hover:underline">비밀번호 찾기</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[15px] transition-all mt-2 ${
                loading
                  ? "bg-[#a5a7f3] text-white cursor-not-allowed"
                  : "bg-[#4f52e8] hover:bg-[#3e41d4] text-white shadow-lg shadow-[#4f52e8]/25"
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  확인 중...
                </>
              ) : (
                <>
                  {mode === "admin" ? "관리자로 로그인" : "로그인"} <IconArrowRight />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#e4e7ef]">
            <Link
              href="/"
              className="text-[13px] text-[#6b7280] hover:text-[#374151] transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
