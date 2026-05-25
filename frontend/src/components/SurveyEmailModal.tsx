"use client";

import { useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

type SurveyOption = { label: string; value: string };

interface Props {
  context: "questions" | "report";
  questions?: string[];
  answers?: string[];
  onClose: () => void;
}

const SURVEY_CONFIG = {
  questions: {
    title: "잠깐, 면접 가이드 안내",
    subtitle: "질문을 생성하는 동안 잠깐 응답해주세요 😊",
    surveyLabel: "이번 면접의 목적은 무엇인가요?",
    options: [
      { label: "취업 준비", value: "취업 준비" },
      { label: "이직 준비", value: "이직 준비" },
      { label: "면접 연습", value: "면접 연습" },
      { label: "스터디·과제", value: "스터디·과제" },
    ] as SurveyOption[],
    emailTitle: "면접 결과를 메일로 받아보세요",
    emailDesc: "면접이 끝나면 질문과 답변 전체를 메일로 보내드릴게요.",
  },
  report: {
    title: "면접 수고하셨습니다!",
    subtitle: "리포트를 작성하는 동안 잠깐 응답해주세요 😊",
    surveyLabel: "오늘 면접 난이도는 어떠셨나요?",
    options: [
      { label: "매우 쉬웠어요", value: "매우 쉬움" },
      { label: "쉬웠어요", value: "쉬움" },
      { label: "보통이었어요", value: "보통" },
      { label: "어려웠어요", value: "어려움" },
      { label: "매우 어려웠어요", value: "매우 어려움" },
    ] as SurveyOption[],
    emailTitle: "질문 & 답변을 메일로 받아보세요",
    emailDesc: "오늘 면접에서 주고받은 모든 질문과 답변을 메일로 보내드릴게요.",
  },
} as const;

export default function SurveyEmailModal({ context, questions = [], answers = [], onClose }: Props) {
  const config = SURVEY_CONFIG[context];

  const [selected, setSelected] = useState<string | null>(null);
  const [email, setEmail] = useState(
    typeof window !== "undefined" ? localStorage.getItem("userEmail") ?? "" : ""
  );
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const handleSubmit = async () => {
    if (!email || !email.includes("@")) {
      // 이메일 없으면 설문만 기록하고 닫기
      onClose();
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch(`${BACKEND_URL}/email/send-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          questions,
          answers,
          survey: selected
            ? { label: config.surveyLabel, value: selected }
            : undefined,
        }),
      });
      const data = await res.json();
      setStatus(data.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0">
      {/* 반투명 배경 */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* 카드 */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up">

        {/* 상단 컬러 헤더 */}
        <div className="bg-gradient-to-r from-[#4f52e8] to-[#7c3aed] px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-bold text-white leading-snug">{config.title}</h2>
              <p className="text-[12px] text-white/75 mt-0.5">{config.subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-white/60 hover:text-white transition-colors mt-0.5"
              aria-label="닫기"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* 완료 상태 */}
        {status === "done" ? (
          <div className="px-6 py-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-[#111827]">메일이 전송되었습니다!</p>
            <p className="text-[12px] text-[#6b7280]">{email} 로 전송했습니다.</p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2 rounded-xl bg-[#4f52e8] text-white text-[13px] font-semibold hover:bg-[#3e41d4] transition-colors"
            >
              확인
            </button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-5">

            {/* 설문 */}
            <div>
              <p className="text-[13px] font-semibold text-[#374151] mb-2.5">{config.surveyLabel}</p>
              <div className="flex flex-wrap gap-2">
                {config.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelected((prev) => (prev === opt.value ? null : opt.value))}
                    className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                      selected === opt.value
                        ? "bg-[#4f52e8] text-white border-[#4f52e8]"
                        : "bg-white text-[#374151] border-[#e4e7ef] hover:border-[#4f52e8] hover:text-[#4f52e8]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 이메일 */}
            <div>
              <p className="text-[13px] font-semibold text-[#374151] mb-0.5">{config.emailTitle}</p>
              <p className="text-[11.5px] text-[#9ca3af] mb-2.5">{config.emailDesc}</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="이메일 주소 입력"
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-[#e4e7ef] text-[13px] text-[#374151] placeholder-[#d1d5db] focus:outline-none focus:border-[#4f52e8] focus:ring-1 focus:ring-[#4f52e8] transition-all"
                />
              </div>
              {status === "error" && (
                <p className="text-[11px] text-red-500 mt-1.5">전송 실패. 다시 시도해주세요.</p>
              )}
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-[#e4e7ef] text-[13px] font-medium text-[#6b7280] hover:bg-[#f9fafb] transition-colors"
              >
                건너뛰기
              </button>
              <button
                onClick={handleSubmit}
                disabled={status === "sending"}
                className="flex-1 py-2.5 rounded-xl bg-[#4f52e8] text-white text-[13px] font-semibold hover:bg-[#3e41d4] disabled:opacity-60 transition-all flex items-center justify-center gap-2"
              >
                {status === "sending" ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    전송 중...
                  </>
                ) : "메일 받기"}
              </button>
            </div>
          </div>
        )}
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
