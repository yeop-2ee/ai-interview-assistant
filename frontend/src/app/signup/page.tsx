"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconUser, IconLock, IconEye, IconEyeOff, IconArrowRight } from "@/components/Icons";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !passwordConfirm) {
      setError("모든 항목을 입력해주세요.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "회원가입에 실패했습니다.");
        return;
      }
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("userRole", data.role ?? "user");
      localStorage.setItem("userName", data.name);
      localStorage.setItem("userEmail", data.email);
      localStorage.setItem("sessionToken", data.sessionToken);
      router.push("/");
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
        <div className="absolute top-[-100px] right-[-100px] w-[400px] h-[400px] bg-[#4f52e8] rounded-full blur-[160px] opacity-20 pointer-events-none" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[280px] h-[280px] bg-[#67e8f9] rounded-full blur-[120px] opacity-10 pointer-events-none" />

        <div className="flex items-center gap-2.5 relative z-10">
          <span className="text-white font-semibold text-[16px] tracking-tight">AI기반 맞춤 면접 도우미</span>
        </div>

        <div className="relative z-10">
          <h2 className="text-[36px] font-bold text-white leading-tight mb-4">
            면접 준비,<br />지금 시작하세요
          </h2>
          <p className="text-white/50 text-[15px] leading-relaxed mb-10">
            계정을 만들고 AI 맞춤 면접 연습을 시작하세요.
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

        <div className="relative z-10 border-t border-white/[0.08] pt-8">
          <p className="text-white/40 text-[13px] leading-relaxed italic">
            &ldquo;3번 연습하고 실제 면접에서 꼬리질문에 당황하지 않을 수 있었어요.&rdquo;
          </p>
          <p className="text-white/30 text-[12px] mt-2">— 컴퓨터공학과 4학년 취준생</p>
        </div>
      </div>

      {/* ─── Right panel ─── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#f8f9fc]">
        <div className="w-full max-w-[400px]">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <span className="font-semibold text-[#0d1035]">AI기반 맞춤 면접 도우미</span>
          </div>

          <h1 className="text-[26px] font-bold text-[#0d1035] mb-1">회원가입</h1>
          <p className="text-[14px] text-[#6b7280] mb-8">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-[#4f52e8] font-medium hover:underline">
              로그인
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이름 */}
            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5">이름</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]">
                  <IconUser className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름 입력"
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#e4e7ef] rounded-xl text-[14px] text-[#0d1035] placeholder-[#c4c9d6] focus:outline-none focus:border-[#4f52e8] focus:ring-1 focus:ring-[#4f52e8] transition-colors"
                />
              </div>
            </div>

            {/* 이메일 */}
            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5">이메일</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
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

            {/* 비밀번호 */}
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
                  placeholder="8자 이상 입력"
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#e4e7ef] rounded-xl text-[14px] text-[#0d1035] placeholder-[#c4c9d6] focus:outline-none focus:border-[#4f52e8] focus:ring-1 focus:ring-[#4f52e8] transition-colors"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] transition-colors">
                  {showPw ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5">비밀번호 확인</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]">
                  <IconLock className="w-4 h-4" />
                </div>
                <input
                  type={showPwConfirm ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="비밀번호 재입력"
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#e4e7ef] rounded-xl text-[14px] text-[#0d1035] placeholder-[#c4c9d6] focus:outline-none focus:border-[#4f52e8] focus:ring-1 focus:ring-[#4f52e8] transition-colors"
                />
                <button type="button" onClick={() => setShowPwConfirm((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] transition-colors">
                  {showPwConfirm ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-[13px] text-red-600">{error}</p>
              </div>
            )}

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
                  처리 중...
                </>
              ) : (
                <>가입하기 <IconArrowRight /></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#e4e7ef]">
            <Link href="/" className="text-[13px] text-[#6b7280] hover:text-[#374151] transition-colors flex items-center gap-1">
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
