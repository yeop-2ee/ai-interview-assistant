"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { parseSSE } from "@/lib/sseStream";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
const INTRO_QUESTION = "안녕하세요. 간단한 자기소개 부탁드립니다.";

interface Message {
  role: "ai" | "user";
  text: string;
  isFollowup?: boolean;
}

export default function TextInterviewPage() {
  const router = useRouter();

  // 질문 생성 상태
  const [questions, setQuestions] = useState<string[]>([INTRO_QUESTION]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState("면접 질문 생성 중...");

  // 면접 진행 상태
  const [phase, setPhase] = useState<"loading" | "interview" | "done">("loading");
  const [messages, setMessages] = useState<Message[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [inputText, setInputText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [followupLoading, setFollowupLoading] = useState(false);

  const questionsRef = useRef<string[]>([INTRO_QUESTION]);
  const qIdxRef = useRef(0);
  const followupUsedRef = useRef<Set<string>>(new Set());
  const resolvedStyleRef = useRef("friendly");
  const settingsRef = useRef<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    qIdxRef.current = qIdx;
  }, [qIdx]);

  // 스크롤 하단 고정
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, followupLoading]);

  // 질문 생성
  useEffect(() => {
    const settings = JSON.parse(sessionStorage.getItem("interviewSettings") || "{}");
    settingsRef.current = settings;

    const resumeText = [
      sessionStorage.getItem("resumeText") || "",
      sessionStorage.getItem("coverText") || "",
    ].filter(Boolean).join("\n\n");

    const RANDOM_STYLES = ["friendly", "pressure", "professor", "practical"];
    const rawStyle = settings.style || "friendly";
    const resolved = rawStyle === "random"
      ? RANDOM_STYLES[Math.floor(Math.random() * RANDOM_STYLES.length)]
      : rawStyle;
    resolvedStyleRef.current = resolved;

    const body = {
      resumeText,
      department: settings.department || "",
      jobRole: settings.jobRole || "",
      companyType: settings.companyType || "",
      experienceLevel: settings.experienceLevel || "newcomer",
      interviewType: settings.interviewType || "mixed",
      style: resolved,
    };

    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/interview/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok || !res.body) throw new Error("질문 생성 실패");

        for await (const event of parseSSE(res)) {
          if (event.type === "progress") {
            setProgress((prev) => Math.max(prev, event.progress as number));
            setProgressStep((event.step as string) || "질문 생성 중...");
          } else if (event.type === "done") {
            const aiQs = event.questions as string[];
            if (Array.isArray(aiQs) && aiQs.length > 0) {
              const merged = [INTRO_QUESTION, ...aiQs];
              setQuestions(merged);
              questionsRef.current = merged;
            }
            setProgress(100);
            setProgressStep("완료!");
            setTimeout(() => {
              setPhase("interview");
              setLoading(false);
              setMessages([{ role: "ai", text: questionsRef.current[0] }]);
            }, 400);
          }
        }
      } catch {
        setProgress(100);
        setTimeout(() => {
          setPhase("interview");
          setLoading(false);
          setMessages([{ role: "ai", text: INTRO_QUESTION }]);
        }, 400);
      }
    })();
  }, []);

  const handleSubmit = async () => {
    const answer = inputText.trim();
    if (!answer || submitting) return;

    const currentQ = questionsRef.current[qIdxRef.current];
    setInputText("");
    setSubmitting(true);

    // 답변 메시지 추가
    setMessages((prev) => [...prev, { role: "user", text: answer }]);

    // 꼬리질문 생성
    setFollowupLoading(true);
    let followupQ: string | null = null;

    if (!followupUsedRef.current.has(currentQ)) {
      try {
        const settings = settingsRef.current;
        const fRes = await fetch(`${BACKEND_URL}/ai/followup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: currentQ,
            answer,
            department: settings.department || "",
            jobRole: settings.jobRole || "",
            companyType: settings.companyType || "",
            experienceLevel: settings.experienceLevel || "newcomer",
            style: resolvedStyleRef.current,
          }),
        });
        const fData = await fRes.json();
        followupQ = fData.followup || null;
      } catch { /* 꼬리질문 실패 무시 */ }
    }

    setFollowupLoading(false);

    if (followupQ && !followupUsedRef.current.has(currentQ)) {
      // 꼬리질문 삽입
      followupUsedRef.current.add(currentQ);
      const newQs = [...questionsRef.current];
      newQs.splice(qIdxRef.current + 1, 0, followupQ);
      questionsRef.current = newQs;
      setQuestions(newQs);
      setMessages((prev) => [...prev, { role: "ai", text: followupQ!, isFollowup: true }]);
      setQIdx((prev) => {
        const next = prev + 1;
        qIdxRef.current = next;
        return next;
      });
    } else {
      setQIdx((prev) => {
        const next = prev + 1;
        qIdxRef.current = next;
        if (next < questionsRef.current.length) {
          setMessages((msgs) => [...msgs, { role: "ai", text: questionsRef.current[next] }]);
        } else {
          setMessages((msgs) => [
            ...msgs,
            { role: "ai", text: "모든 질문이 끝났습니다. 오늘 면접 정말 수고하셨습니다!" },
          ]);
          setPhase("done");
        }
        return next;
      });
    }

    setSubmitting(false);
  };

  // 로딩 화면
  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-center">
          <p className="text-[#9ca3af] text-[13px] mb-2">{progressStep}</p>
          <p className="text-white text-2xl font-bold">{progress}%</p>
        </div>
        <div className="w-64 h-1.5 bg-[#1e2130] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#4f52e8] rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[#6b7280] text-[12px]">텍스트 면접 테스트 모드</p>
      </div>
    );
  }

  const currentQuestion = questionsRef.current[qIdx] ?? "";
  const totalQ = questionsRef.current.length;

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-[#1e2130]">
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-[14px]">텍스트 면접 테스트</span>
          {phase !== "done" && (
            <span className="text-[#6b7280] text-[12px]">
              {qIdx + 1} / {totalQ}
            </span>
          )}
        </div>
        <button
          onClick={() => router.push("/upload")}
          className="text-[#6b7280] hover:text-[#9ca3af] text-[12px] transition-colors"
        >
          나가기
        </button>
      </header>

      {/* 진행 바 */}
      {phase !== "done" && (
        <div className="h-0.5 bg-[#1e2130]">
          <div
            className="h-full bg-[#4f52e8] transition-all duration-500"
            style={{ width: `${((qIdx + 1) / totalQ) * 100}%` }}
          />
        </div>
      )}

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 max-w-2xl mx-auto w-full">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "ai" && (
              <div className="w-7 h-7 rounded-full bg-[#4f52e8]/20 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                <span className="text-[10px] text-[#4f52e8] font-bold">AI</span>
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                msg.role === "ai"
                  ? msg.isFollowup
                    ? "bg-[#1a1d2e] border border-[#4f52e8]/30 text-white"
                    : "bg-[#1e2130] text-white"
                  : "bg-[#4f52e8] text-white"
              }`}
            >
              {msg.isFollowup && (
                <span className="block text-[10px] text-[#4f52e8] mb-1 font-semibold">꼬리 질문</span>
              )}
              {msg.text}
            </div>
          </div>
        ))}

        {/* 꼬리질문 분석 중 */}
        {followupLoading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-[#4f52e8]/20 flex items-center justify-center mr-2 mt-0.5 shrink-0">
              <span className="text-[10px] text-[#4f52e8] font-bold">AI</span>
            </div>
            <div className="bg-[#1e2130] rounded-2xl px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[#4f52e8] animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span className="text-[#6b7280] text-[12px]">답변 분석 중...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      {phase === "interview" && (
        <div className="border-t border-[#1e2130] px-4 py-4 max-w-2xl mx-auto w-full">
          <div className="text-[11px] text-[#6b7280] mb-2 px-1">
            현재 질문: <span className="text-[#9ca3af]">{currentQuestion.length > 50 ? currentQuestion.slice(0, 50) + "..." : currentQuestion}</span>
          </div>
          <div className="flex gap-2 items-end">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="답변을 입력하세요... (Enter로 제출, Shift+Enter로 줄바꿈)"
              disabled={submitting || followupLoading}
              rows={3}
              className="flex-1 bg-[#1e2130] border border-[#2a2d3e] rounded-xl px-4 py-3 text-white text-[13px] placeholder-[#4b5563] resize-none focus:outline-none focus:border-[#4f52e8]/50 disabled:opacity-50 transition-colors leading-relaxed"
            />
            <button
              onClick={handleSubmit}
              disabled={!inputText.trim() || submitting || followupLoading}
              className="px-4 py-3 rounded-xl bg-[#4f52e8] hover:bg-[#3e41d4] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-semibold transition-all shrink-0"
            >
              제출
            </button>
          </div>
        </div>
      )}

      {/* 완료 화면 */}
      {phase === "done" && (
        <div className="border-t border-[#1e2130] px-4 py-6 flex flex-col items-center gap-3">
          <p className="text-[#9ca3af] text-[13px]">면접 테스트가 완료되었습니다.</p>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/upload")}
              className="px-5 py-2 rounded-xl border border-[#2a2d3e] text-[#9ca3af] hover:text-white text-[13px] transition-colors"
            >
              처음으로
            </button>
            <button
              onClick={() => router.push("/interview")}
              className="px-5 py-2 rounded-xl bg-[#4f52e8] hover:bg-[#3e41d4] text-white text-[13px] font-semibold transition-all"
            >
              화상 면접 시작
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
