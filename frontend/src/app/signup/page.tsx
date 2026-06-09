"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { IconUser, IconLock, IconEye, IconEyeOff, IconArrowRight } from "@/components/Icons";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

// ─── 비밀번호 강도 계산 ───────────────────────────────────────────────────────
type StrengthLevel = "empty" | "심각" | "보통" | "양호" | "강력";

interface PwChecks {
  length: boolean;   // 12자 이상
  upper: boolean;    // 대문자
  lower: boolean;    // 소문자
  special: boolean;  // 특수문자
  number: boolean;   // 숫자 (보너스)
}

function getPwChecks(pw: string): PwChecks {
  return {
    length:  pw.length >= 12,
    upper:   /[A-Z]/.test(pw),
    lower:   /[a-z]/.test(pw),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw),
    number:  /[0-9]/.test(pw),
  };
}

function getStrength(pw: string): StrengthLevel {
  if (!pw) return "empty";
  const c = getPwChecks(pw);
  const mandatory = [c.length, c.upper, c.lower, c.special].filter(Boolean).length;
  if (mandatory <= 1) return "심각";
  if (mandatory === 2) return "보통";
  if (mandatory === 3) return "보통";
  // all 4 mandatory met
  if (c.number && pw.length >= 16) return "강력";
  return "양호";
}

const STRENGTH_CONFIG: Record<StrengthLevel, { label: string; color: string; bg: string; bars: number }> = {
  empty:  { label: "",     color: "text-gray-400",   bg: "bg-gray-200",    bars: 0 },
  심각:   { label: "심각", color: "text-red-500",    bg: "bg-red-500",     bars: 1 },
  보통:   { label: "보통", color: "text-amber-500",  bg: "bg-amber-500",   bars: 2 },
  양호:   { label: "양호", color: "text-green-500",  bg: "bg-green-500",   bars: 3 },
  강력:   { label: "강력", color: "text-blue-600",   bg: "bg-blue-600",    bars: 4 },
};

// ─── 이메일 상태 ──────────────────────────────────────────────────────────────
type EmailStatus = "idle" | "checking" | "available" | "taken" | "invalid";
type VerifyStatus = "idle" | "sending" | "sent" | "verifying" | "verified" | "error";

const TIMER_SECONDS = 180; // 3분

export default function SignupPage() {
  const router = useRouter();

  // 기본 정보
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword]           = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPw, setShowPw]               = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  // 이메일 중복 확인
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 인증 코드
  const [verifyStatus, setVerifyStatus]   = useState<VerifyStatus>("idle");
  const [verifyCode, setVerifyCode]       = useState("");
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const [timerLeft, setTimerLeft]         = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 비밀번호 강도
  const strength = getStrength(password);
  const pwChecks = getPwChecks(password);
  const strengthCfg = STRENGTH_CONFIG[strength];

  // ── 이메일 변경 시 중복 확인 (디바운스 500ms) ─────────────────────────────
  const checkEmail = useCallback(async (val: string) => {
    if (!val || !val.includes("@") || !val.includes(".")) {
      setEmailStatus(val ? "invalid" : "idle");
      return;
    }
    setEmailStatus("checking");
    try {
      const res = await fetch(`${BACKEND_URL}/auth/check-email?email=${encodeURIComponent(val)}`);
      const data = await res.json();
      setEmailStatus(data.exists ? "taken" : "available");
    } catch {
      setEmailStatus("idle");
    }
  }, []);

  useEffect(() => {
    // 이메일 바뀌면 인증 초기화
    setVerifyStatus("idle");
    setVerifyCode("");
    setVerifiedToken(null);
    stopTimer();

    if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    emailCheckTimer.current = setTimeout(() => checkEmail(email), 500);
    return () => {
      if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    };
  }, [email, checkEmail]);

  // ── 타이머 ────────────────────────────────────────────────────────────────
  function startTimer() {
    stopTimer();
    setTimerLeft(TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      setTimerLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => () => stopTimer(), []);

  function formatTimer(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  // ── 인증 코드 발송 ────────────────────────────────────────────────────────
  async function sendVerification() {
    setError("");
    setVerifyStatus("sending");
    try {
      const res = await fetch(`${BACKEND_URL}/auth/send-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyStatus("error");
        setError(data.error || "인증 코드 발송에 실패했습니다.");
        return;
      }
      setVerifyStatus("sent");
      setVerifyCode("");
      startTimer();
    } catch {
      setVerifyStatus("error");
      setError("서버에 연결할 수 없습니다.");
    }
  }

  // ── 인증 코드 확인 ────────────────────────────────────────────────────────
  async function verifyEmailCode() {
    if (verifyCode.length !== 6) return;
    setError("");
    setVerifyStatus("verifying");
    try {
      const res = await fetch(`${BACKEND_URL}/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyStatus("sent"); // 재입력 가능 상태로
        setError(data.error || "인증 코드가 올바르지 않습니다.");
        return;
      }
      stopTimer();
      setVerifiedToken(data.token);
      setVerifyStatus("verified");
    } catch {
      setVerifyStatus("sent");
      setError("서버에 연결할 수 없습니다.");
    }
  }

  // ── 회원가입 제출 ─────────────────────────────────────────────────────────
  const canSubmit =
    !!name &&
    verifyStatus === "verified" &&
    strength !== "empty" && strength !== "심각" &&
    pwChecks.length && pwChecks.upper && pwChecks.lower && pwChecks.special &&
    password === passwordConfirm &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name) { setError("이름을 입력해주세요."); return; }
    if (verifyStatus !== "verified") { setError("이메일 인증을 완료해주세요."); return; }
    if (!pwChecks.length || !pwChecks.upper || !pwChecks.lower || !pwChecks.special) {
      setError("비밀번호 요건을 모두 충족해주세요."); return;
    }
    if (password !== passwordConfirm) { setError("비밀번호가 일치하지 않습니다."); return; }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, verifiedToken }),
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

  // ── 렌더링 헬퍼 ──────────────────────────────────────────────────────────
  function EmailStatusBadge() {
    if (emailStatus === "checking")
      return <span className="text-[12px] text-[#9ca3af]">확인 중...</span>;
    if (emailStatus === "available")
      return (
        <span className="flex items-center gap-1 text-[12px] text-green-600 font-medium">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          사용 가능한 이메일
        </span>
      );
    if (emailStatus === "taken")
      return <span className="text-[12px] text-red-500 font-medium">이미 사용 중인 이메일</span>;
    if (emailStatus === "invalid")
      return <span className="text-[12px] text-[#9ca3af]">유효한 이메일 형식을 입력해주세요</span>;
    return null;
  }

  function CheckItem({ ok, label }: { ok: boolean; label: string }) {
    return (
      <span className={`flex items-center gap-1 text-[12px] ${ok ? "text-green-600" : "text-[#9ca3af]"}`}>
        {ok
          ? <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          : <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        }
        {label}
      </span>
    );
  }

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
        <div className="w-full max-w-[420px]">
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
            {/* ── 이름 ── */}
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

            {/* ── 이메일 + 인증 ── */}
            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5">이메일</label>

              {/* 이메일 입력 + 발송 버튼 */}
              <div className="flex gap-2">
                <div className="relative flex-1">
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
                    disabled={verifyStatus === "verified"}
                    placeholder="example@email.com"
                    className={`w-full pl-9 pr-4 py-2.5 bg-white border rounded-xl text-[14px] text-[#0d1035] placeholder-[#c4c9d6] focus:outline-none transition-colors ${
                      verifyStatus === "verified"
                        ? "border-green-300 bg-green-50 text-green-700 cursor-not-allowed"
                        : emailStatus === "taken"
                        ? "border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                        : "border-[#e4e7ef] focus:border-[#4f52e8] focus:ring-1 focus:ring-[#4f52e8]"
                    }`}
                  />
                  {verifyStatus === "verified" && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  )}
                </div>

                {verifyStatus !== "verified" && (
                  <button
                    type="button"
                    disabled={emailStatus !== "available" || verifyStatus === "sending"}
                    onClick={sendVerification}
                    className={`flex-shrink-0 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all whitespace-nowrap ${
                      emailStatus === "available" && verifyStatus !== "sending"
                        ? "bg-[#4f52e8] text-white hover:bg-[#3e41d4]"
                        : "bg-[#e4e7ef] text-[#9ca3af] cursor-not-allowed"
                    }`}
                  >
                    {verifyStatus === "sending"
                      ? "발송 중..."
                      : timerLeft > 0 && verifyStatus === "sent"
                      ? "재발송"
                      : "인증 코드 발송"}
                  </button>
                )}
              </div>

              {/* 이메일 상태 메시지 */}
              <div className="mt-1.5 min-h-[18px]">
                {verifyStatus === "verified" ? (
                  <span className="flex items-center gap-1 text-[12px] text-green-600 font-medium">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    이메일 인증 완료
                  </span>
                ) : (
                  <EmailStatusBadge />
                )}
              </div>

              {/* 인증 코드 입력 (코드 발송 후) */}
              {(verifyStatus === "sent" || verifyStatus === "verifying") && (
                <div className="mt-2 p-3.5 bg-white border border-[#e4e7ef] rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[#6b7280]">
                      {email}로 발송된 6자리 코드를 입력해주세요
                    </span>
                    {timerLeft > 0 && (
                      <span className={`text-[12px] font-mono font-semibold ${timerLeft <= 30 ? "text-red-500" : "text-[#4f52e8]"}`}>
                        {formatTimer(timerLeft)}
                      </span>
                    )}
                    {timerLeft === 0 && (
                      <span className="text-[12px] text-red-500 font-medium">만료됨</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      disabled={timerLeft === 0 || verifyStatus === "verifying"}
                      placeholder="인증 코드 6자리"
                      className="flex-1 px-3 py-2 bg-[#f8f9fc] border border-[#e4e7ef] rounded-lg text-[14px] text-[#0d1035] placeholder-[#c4c9d6] focus:outline-none focus:border-[#4f52e8] focus:ring-1 focus:ring-[#4f52e8] transition-colors font-mono tracking-widest"
                    />
                    <button
                      type="button"
                      disabled={verifyCode.length !== 6 || timerLeft === 0 || verifyStatus === "verifying"}
                      onClick={verifyEmailCode}
                      className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                        verifyCode.length === 6 && timerLeft > 0 && verifyStatus !== "verifying"
                          ? "bg-[#0d1035] text-white hover:bg-[#1a1f4e]"
                          : "bg-[#e4e7ef] text-[#9ca3af] cursor-not-allowed"
                      }`}
                    >
                      {verifyStatus === "verifying" ? "확인 중..." : "확인"}
                    </button>
                  </div>
                  {timerLeft === 0 && (
                    <p className="text-[12px] text-red-500">인증 코드가 만료되었습니다. 위에서 재발송해주세요.</p>
                  )}
                </div>
              )}
            </div>

            {/* ── 비밀번호 ── */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[13px] font-medium text-[#374151]">비밀번호</label>
                {/* 강도 인디케이터 */}
                {strength !== "empty" && (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 w-7 rounded-full transition-all ${
                            i <= strengthCfg.bars ? strengthCfg.bg : "bg-[#e4e7ef]"
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-[12px] font-semibold ${strengthCfg.color}`}>
                      {strengthCfg.label}
                    </span>
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]">
                  <IconLock className="w-4 h-4" />
                </div>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="12자 이상, 대소문자·특수문자 포함"
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#e4e7ef] rounded-xl text-[14px] text-[#0d1035] placeholder-[#c4c9d6] focus:outline-none focus:border-[#4f52e8] focus:ring-1 focus:ring-[#4f52e8] transition-colors"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] transition-colors">
                  {showPw ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>

              {/* 비밀번호 요건 체크리스트 */}
              {password && (
                <div className="mt-2 p-3 bg-[#f8f9fc] border border-[#e4e7ef] rounded-xl grid grid-cols-2 gap-1.5">
                  <CheckItem ok={pwChecks.length}  label="12자 이상" />
                  <CheckItem ok={pwChecks.upper}   label="대문자 포함" />
                  <CheckItem ok={pwChecks.lower}   label="소문자 포함" />
                  <CheckItem ok={pwChecks.special} label="특수문자 포함" />
                </div>
              )}
            </div>

            {/* ── 비밀번호 확인 ── */}
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
                  className={`w-full pl-9 pr-10 py-2.5 bg-white border rounded-xl text-[14px] text-[#0d1035] placeholder-[#c4c9d6] focus:outline-none transition-colors ${
                    passwordConfirm && password !== passwordConfirm
                      ? "border-red-300 focus:border-red-400 focus:ring-1 focus:ring-red-400"
                      : passwordConfirm && password === passwordConfirm
                      ? "border-green-300 focus:border-green-400 focus:ring-1 focus:ring-green-400"
                      : "border-[#e4e7ef] focus:border-[#4f52e8] focus:ring-1 focus:ring-[#4f52e8]"
                  }`}
                />
                <button type="button" onClick={() => setShowPwConfirm((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] transition-colors">
                  {showPwConfirm ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
              {passwordConfirm && (
                <p className={`mt-1.5 text-[12px] ${password === passwordConfirm ? "text-green-600" : "text-red-500"}`}>
                  {password === passwordConfirm ? "비밀번호가 일치합니다." : "비밀번호가 일치하지 않습니다."}
                </p>
              )}
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
              disabled={!canSubmit}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[15px] transition-all mt-2 ${
                loading
                  ? "bg-[#a5a7f3] text-white cursor-not-allowed"
                  : canSubmit
                  ? "bg-[#4f52e8] hover:bg-[#3e41d4] text-white shadow-lg shadow-[#4f52e8]/25"
                  : "bg-[#e4e7ef] text-[#9ca3af] cursor-not-allowed"
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
