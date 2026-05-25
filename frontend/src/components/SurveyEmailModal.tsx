"use client";

import { useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

interface Props {
  questions?: string[];
  answers?: string[];
  onClose: () => void;
}

const PURPOSE_OPTIONS = ["취업 준비", "이직 준비", "면접 연습", "스터디·과제"];
const QUESTION_QUALITY_LEVELS = [
  { score: 1, label: "전혀\n도움 안됨" },
  { score: 2, label: "별로\n도움 안됨" },
  { score: 3, label: "보통" },
  { score: 4, label: "도움\n됐어요" },
  { score: 5, label: "매우\n도움됐어요" },
];

export default function SurveyEmailModal({ questions = [], answers = [], onClose }: Props) {
  const [step, setStep] = useState<"survey" | "email" | "done">("survey");

  // 설문 상태
  const [purpose, setPurpose] = useState<string | null>(null);
  const [naturalness, setNaturalness] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [surveySubmitting, setSurveySubmitting] = useState(false);

  // 이메일 상태
  const [email, setEmail] = useState(
    typeof window !== "undefined" ? localStorage.getItem("userEmail") ?? "" : ""
  );
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState(false);

  const buildSurveys = () => [
    purpose ? { label: "면접 목적", value: purpose } : null,
    naturalness !== null ? { label: "면접 질문 만족도", value: `${naturalness}점` } : null,
    feedback.trim() ? { label: "개선 의견", value: feedback.trim() } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  // 1단계: 설문 제출
  const handleSurveySubmit = async () => {
    if (surveySubmitting) return;
    setSurveySubmitting(true);
    try {
      await fetch(`${BACKEND_URL}/email/send-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: null, questions: [], answers: [], surveys: buildSurveys() }),
      });
    } catch { /* ignore */ }
    finally { setSurveySubmitting(false); }
    setStep("email");
  };

  // 2단계: 이메일 전송
  const handleEmailSend = async () => {
    if (!email || !email.includes("@") || emailSending) return;
    setEmailSending(true);
    setEmailError(false);
    try {
      const res = await fetch(`${BACKEND_URL}/email/send-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, questions, answers, surveys: [] }),
      });
      const data = await res.json();
      if (data.ok) { setStep("done"); return; }
      setEmailError(true);
    } catch { setEmailError(true); }
    finally { setEmailSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">

        {/* 헤더 */}
        <div className="px-7 pt-6 pb-5 border-b border-[#e4e7ef]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#eef0fd] text-[#4f52e8] text-[11px] font-semibold mb-3">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
                {step === "survey" ? "면접 후 설문" : step === "email" ? "결과 이메일" : "완료"}
              </span>
              <h2 className="text-[20px] font-bold text-[#0d1035] leading-snug">
                {step === "survey" && "면접 수고하셨습니다!"}
                {step === "email" && "결과를 이메일로 받아보세요"}
                {step === "done" && "메일이 전송되었습니다!"}
              </h2>
              <p className="text-[12.5px] text-[#6b7280] mt-1.5">
                {step === "survey" && "리포트 작성 중에 잠깐 응답해주세요. 서비스 개선에 큰 도움이 됩니다."}
                {step === "email" && "오늘 주고받은 질문과 답변을 이메일로 보내드려요."}
                {step === "done" && `${email} 로 면접 결과를 보내드렸어요.`}
              </p>
            </div>
            <button onClick={onClose} className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#9ca3af] hover:text-[#374151] hover:bg-[#f3f4f6] transition-all mt-0.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* 스텝 인디케이터 */}
          {step !== "done" && (
            <div className="flex items-center gap-2 mt-4">
              {["survey", "email"].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    step === s ? "bg-[#4f52e8] text-white" :
                    (step === "email" && s === "survey") ? "bg-green-500 text-white" :
                    "bg-[#f0f2f8] text-[#c4c9d6]"
                  }`}>
                    {step === "email" && s === "survey"
                      ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      : i + 1}
                  </div>
                  <span className={`text-[11px] font-medium ${step === s ? "text-[#4f52e8]" : "text-[#c4c9d6]"}`}>
                    {s === "survey" ? "설문" : "이메일"}
                  </span>
                  {i === 0 && <div className="w-8 h-px bg-[#e4e7ef]" />}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1">

          {/* ── 1단계: 설문 ── */}
          {step === "survey" && (
            <div className="px-7 py-6 space-y-6">
              {/* Q1 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full bg-[#eef0fd] text-[#4f52e8] text-[10px] font-bold flex items-center justify-center flex-shrink-0">1</span>
                  <p className="text-[13px] font-semibold text-[#1f2937]">이번 면접의 목적은 무엇인가요?</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PURPOSE_OPTIONS.map((opt) => (
                    <button key={opt} onClick={() => setPurpose(p => p === opt ? null : opt)}
                      className={`px-4 py-1.5 rounded-lg text-[12.5px] font-medium border transition-all ${
                        purpose === opt ? "bg-[#4f52e8] text-white border-[#4f52e8] shadow-sm"
                        : "bg-white text-[#4b5563] border-[#e4e7ef] hover:border-[#4f52e8] hover:text-[#4f52e8]"
                      }`}>{opt}</button>
                  ))}
                </div>
              </div>

              {/* Q2 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full bg-[#eef0fd] text-[#4f52e8] text-[10px] font-bold flex items-center justify-center flex-shrink-0">2</span>
                  <p className="text-[13px] font-semibold text-[#1f2937]">생성된 면접 질문이 나에게 도움이 되었나요?</p>
                </div>
                <div className="flex gap-2">
                  {QUESTION_QUALITY_LEVELS.map(({ score, label }) => (
                    <button key={score} onClick={() => setNaturalness(n => n === score ? null : score)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border text-center transition-all ${
                        naturalness === score ? "bg-[#4f52e8] border-[#4f52e8] shadow-sm" : "bg-white border-[#e4e7ef] hover:border-[#4f52e8]"
                      }`}>
                      <span className={`text-[15px] font-bold ${naturalness === score ? "text-white" : "text-[#374151]"}`}>{score}</span>
                      <span className={`text-[9px] font-medium leading-tight whitespace-pre-line ${naturalness === score ? "text-white/80" : "text-[#9ca3af]"}`}>{label}</span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-1.5 px-1">
                  <span className="text-[10px] text-[#9ca3af]">전혀 도움 안됨</span>
                  <span className="text-[10px] text-[#9ca3af]">매우 도움됨</span>
                </div>
              </div>

              {/* Q3 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full bg-[#eef0fd] text-[#4f52e8] text-[10px] font-bold flex items-center justify-center flex-shrink-0">3</span>
                  <p className="text-[13px] font-semibold text-[#1f2937]">개선이 필요한 점이 있다면 알려주세요</p>
                </div>
                <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3}
                  placeholder="서비스 개선을 위한 의견을 자유롭게 남겨주세요. (선택)"
                  className="w-full px-4 py-3 rounded-xl border border-[#e4e7ef] text-[12.5px] text-[#374151] placeholder-[#c4c9d6] focus:outline-none focus:border-[#4f52e8] focus:ring-1 focus:ring-[#4f52e8] resize-none leading-relaxed transition-all"
                />
              </div>

              <div className="flex gap-2.5 pb-1">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#e4e7ef] text-[13px] font-medium text-[#6b7280] hover:bg-[#f9fafb] transition-colors">
                  건너뛰기
                </button>
                <button onClick={handleSurveySubmit} disabled={surveySubmitting}
                  className="flex-[2] py-2.5 rounded-xl bg-[#4f52e8] text-white text-[13px] font-semibold hover:bg-[#3e41d4] disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                  {surveySubmitting ? (
                    <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>저장 중...</>
                  ) : "설문 제출하기"}
                </button>
              </div>
            </div>
          )}

          {/* ── 2단계: 이메일 ── */}
          {step === "email" && (
            <div className="px-7 py-8 space-y-5">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p className="text-[12.5px] font-medium text-green-700">설문이 제출되었어요. 감사합니다!</p>
              </div>

              <div>
                <p className="text-[13px] font-semibold text-[#1f2937] mb-1.5">면접 결과를 이메일로 받아볼까요?</p>
                <p className="text-[12px] text-[#9ca3af] mb-4">다른 이메일로 받고 싶다면 수정해주세요. 계정 이메일은 변경되지 않습니다.</p>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="이메일 주소를 입력해주세요"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#e4e7ef] text-[13px] text-[#374151] placeholder-[#c4c9d6] focus:outline-none focus:border-[#4f52e8] focus:ring-1 focus:ring-[#4f52e8] transition-all"
                />
                {emailError && <p className="text-[11px] text-red-500 mt-1.5">전송에 실패했습니다. 다시 시도해주세요.</p>}
              </div>

              <div className="flex gap-2.5 pb-1">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#e4e7ef] text-[13px] font-medium text-[#6b7280] hover:bg-[#f9fafb] transition-colors">
                  건너뛰기
                </button>
                <button onClick={handleEmailSend} disabled={emailSending || !email || !email.includes("@")}
                  className="flex-[2] py-2.5 rounded-xl bg-[#4f52e8] text-white text-[13px] font-semibold hover:bg-[#3e41d4] disabled:opacity-60 transition-all flex items-center justify-center gap-2">
                  {emailSending ? (
                    <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>전송 중...</>
                  ) : <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                    이메일로 받기
                  </>}
                </button>
              </div>
            </div>
          )}

          {/* ── 완료 ── */}
          {step === "done" && (
            <div className="px-7 py-10 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 flex items-center justify-center">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p className="text-[16px] font-bold text-[#0d1035]">메일이 전송되었습니다!</p>
              <p className="text-[12.5px] text-[#6b7280]">
                <span className="font-medium text-[#374151]">{email}</span> 로 면접 결과를 보내드렸어요.
              </p>
              <button onClick={onClose} className="mt-3 px-8 py-2.5 rounded-xl bg-[#4f52e8] text-white text-[13px] font-semibold hover:bg-[#3e41d4] transition-colors">
                확인
              </button>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.28s ease-out both; }
      `}</style>
    </div>
  );
}
