"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { IconArrowRight, IconMic, IconSend } from "@/components/Icons";

const AI_BASE = "http://localhost:3003";
const TOTAL_Q = 8;
type ChatEntry = { role: string; content: string };
type Msg = { role: "ai" | "user"; text: string; time: string };

function now() {
  return new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

/* ── AI 아바타 ── */
function AIAvatar({ speaking }: { speaking: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 w-full h-full">
      <div className="relative">
        {speaking && (
          <div className="absolute inset-[-6px] rounded-full border-2 border-[#4f52e8]/30 animate-ping" />
        )}
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#4f52e8] to-[#818cf8] flex items-center justify-center shadow-lg shadow-[#4f52e8]/20">
          <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-2.16Z" />
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-2.16Z" />
          </svg>
        </div>
      </div>
      <div className="flex items-end gap-[3px] h-7">
        {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8, 0.4, 0.7, 1, 0.6, 0.5].map((h, i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all ${speaking ? "bg-[#4f52e8]" : "bg-[#d1d5db]"}`}
            style={{
              height: speaking ? `${h * 28}px` : "4px",
              animation: speaking ? `waveBar 0.8s ease-in-out ${i * 60}ms infinite alternate` : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── 준비 화면 ── */
function ReadyScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col">
      <header className="bg-white border-b border-[#e4e7ef] px-6 h-[60px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-semibold text-[14px] text-[#0d1035]">AI기반 맞춤 면접 도우미</span>
        </Link>
        <Link href="/upload" className="text-[13px] text-[#9ca3af] hover:text-[#374151] transition-colors flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          이전
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-2xl border border-[#e4e7ef] shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#eef0fd] border border-[#c7d2fe] flex items-center justify-center mx-auto mb-5">
              <svg className="w-6 h-6 text-[#4f52e8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14" />
                <rect x="1" y="6" width="14" height="12" rx="2" />
              </svg>
            </div>
            <h2 className="text-[22px] font-bold text-[#0d1035] mb-2">화상 면접 입장</h2>
            <p className="text-[13px] text-[#6b7280] mb-7 leading-relaxed">
              카메라와 마이크 권한이 필요합니다.<br />조용한 공간에서 시작해주세요.
            </p>
            <div className="bg-[#f8f9fc] rounded-xl border border-[#e4e7ef] p-4 mb-6 text-left space-y-3">
              {[
                { label: "준비된 질문", value: `${TOTAL_Q}개` },
                { label: "예상 소요 시간", value: "약 15분" },
                { label: "면접관 스타일", value: "부드러운" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between text-[13px]">
                  <span className="text-[#9ca3af]">{s.label}</span>
                  <span className="font-semibold text-[#374151]">{s.value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={onStart}
              className="w-full flex items-center justify-center gap-2 bg-[#4f52e8] hover:bg-[#3e41d4] text-white font-semibold py-3 rounded-xl transition-all text-[14px] shadow-md shadow-[#4f52e8]/20"
            >
              면접 입장하기 <IconArrowRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 메인 ── */
export default function InterviewPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<"ready" | "call" | "done">("ready");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [camError, setCamError] = useState(false);

  // AI 연동 상태
  const [resumeText, setResumeText] = useState("");
  const [commonQs, setCommonQs] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [interviewStage, setInterviewStage] = useState<"common" | "custom">("common");
  const [commonIdx, setCommonIdx] = useState(0);
  const [customPhase, setCustomPhase] = useState(1);
  const [commonHistory, setCommonHistory] = useState<ChatEntry[]>([]);
  const [customHistory, setCustomHistory] = useState<ChatEntry[]>([]);
  const [questionLoading, setQuestionLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setResumeText(sessionStorage.getItem("resumeText") ?? "");
  }, []);

  useEffect(() => {
    if (phase !== "call") return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startCam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCamError(true);
    }
  }, []);

  useEffect(() => {
    if (phase === "call" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [phase]);

  const showAIQuestion = (text: string) => {
    setCurrentQuestion(text);
    setTimeout(() => {
      setAiSpeaking(true);
      setMessages((prev) => [...prev, { role: "ai", text, time: now() }]);
      setTimeout(() => setAiSpeaking(false), 3000);
    }, 600);
  };

  const startCall = async () => {
    await startCam();
    setPhase("call");
    setQuestionLoading(true);
    try {
      const res = await fetch(`${AI_BASE}/api/interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText }),
      });
      const data = await res.json();
      const questions: string[] = data.commonQuestions.map((q: { question: string }) => q.question);
      setCommonQs(questions);
      showAIQuestion(questions[0]);
    } catch {
      const fallback = "안녕하세요. 간단한 자기소개 부탁드립니다.";
      setCommonQs([fallback]);
      showAIQuestion(fallback);
    }
    setQuestionLoading(false);
  };

  const fetchCustomQuestion = async (rText: string, common: ChatEntry[], custom: ChatEntry[], phase: number) => {
    setQuestionLoading(true);
    try {
      const res = await fetch(`${AI_BASE}/api/interview/question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: rText, commonHistory: common, chatHistory: custom, currentPhase: phase }),
      });
      const data = await res.json();
      showAIQuestion(data.data?.nextQuestion ?? "다음 질문을 불러올 수 없습니다.");
    } catch {
      showAIQuestion("다음 질문을 불러오는 중 오류가 발생했습니다.");
    }
    setQuestionLoading(false);
  };

  const submit = async () => {
    const text = input.trim();
    if (!text || questionLoading) return;

    setMessages((prev) => [...prev, { role: "user", text, time: now() }]);
    setInput("");

    if (interviewStage === "common") {
      const updatedCommon: ChatEntry[] = [
        ...commonHistory,
        { role: "assistant", content: currentQuestion },
        { role: "user", content: text },
      ];
      setCommonHistory(updatedCommon);

      const nextIdx = commonIdx + 1;
      if (nextIdx < commonQs.length) {
        setCommonIdx(nextIdx);
        showAIQuestion(commonQs[nextIdx]);
      } else {
        setInterviewStage("custom");
        setCustomPhase(1);
        await fetchCustomQuestion(resumeText, updatedCommon, [], 1);
      }
    } else {
      const updatedCustom: ChatEntry[] = [
        ...customHistory,
        { role: "assistant", content: currentQuestion },
        { role: "user", content: text },
      ];
      setCustomHistory(updatedCustom);

      if (customPhase < 5) {
        const nextPhase = customPhase + 1;
        setCustomPhase(nextPhase);
        await fetchCustomQuestion(resumeText, commonHistory, updatedCustom, nextPhase);
      } else {
        setQuestionLoading(true);
        try {
          const res = await fetch(`${AI_BASE}/api/interview/report`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resumeText, commonHistory, customHistory: updatedCustom }),
          });
          const data = await res.json();
          if (data.report) sessionStorage.setItem("interviewReport", JSON.stringify(data.report));
        } catch {
          console.error("리포트 생성 실패");
        }
        setQuestionLoading(false);
        setTimeout(() => {
          setAiSpeaking(true);
          setMessages((prev) => [...prev, { role: "ai", text: "모든 질문이 끝났습니다. 오늘 면접 정말 수고하셨습니다!", time: now() }]);
          setTimeout(() => setAiSpeaking(false), 3000);
          setPhase("done");
          streamRef.current?.getTracks().forEach((t) => t.stop());
        }, 600);
      }
    }
  };

  const endCall = async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (commonHistory.length + customHistory.length >= 2) {
      try {
        const res = await fetch(`${AI_BASE}/api/interview/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeText, commonHistory, customHistory }),
        });
        const data = await res.json();
        if (data.report) sessionStorage.setItem("interviewReport", JSON.stringify(data.report));
      } catch {}
    }
    setPhase("done");
  };

  const doneCount = interviewStage === "common" ? commonIdx : 3 + (customPhase - 1);
  const progress = Math.round((doneCount / TOTAL_Q) * 100);
  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const currentQ = questionLoading ? "질문 생성 중..." : currentQuestion;

  if (phase === "ready") return <ReadyScreen onStart={startCall} />;

  return (
    <>
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
      `}</style>

      <div className="h-screen bg-[#f0f2f8] flex flex-col overflow-hidden select-none">

        {/* ── 상단 바 ── */}
        <div className="flex-shrink-0 bg-white border-b border-[#e4e7ef] flex items-center justify-between px-5 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 mr-2">
              <span className="font-semibold text-[14px] text-[#0d1035]">AI기반 맞춤 면접 도우미</span>
            </Link>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              phase === "done"
                ? "bg-[#f8f9fc] text-[#9ca3af] border-[#e4e7ef]"
                : "bg-red-50 text-red-500 border-red-200"
            }`}>
              {phase !== "done" && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
              {phase === "done" ? "면접 종료" : "면접 진행 중"}
            </div>
            <span className="text-[#9ca3af] text-[12px] hidden sm:block">컴퓨터소프트웨어과 · 혼합 면접</span>
          </div>
          <div className="flex items-center gap-5">
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="w-28 h-1.5 bg-[#e4e7ef] rounded-full overflow-hidden">
                <div className="h-full bg-[#4f52e8] rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[11px] text-[#9ca3af] font-medium">{doneCount}/{TOTAL_Q}</span>
            </div>
            <span className="font-mono text-[13px] font-semibold text-[#374151]">{fmtTime(elapsed)}</span>
          </div>
        </div>

        {/* ── 메인 영역 ── */}
        <div className="flex-1 flex gap-3 p-3 min-h-0">

          {/* 면접관 타일 */}
          <div className="flex-1 relative rounded-2xl overflow-hidden bg-[#eef0fd] border border-[#c7d2fe] flex flex-col shadow-sm">
            <div className="flex-1 flex items-center justify-center">
              <AIAvatar speaking={aiSpeaking || questionLoading} />
            </div>
            {phase !== "done" && (
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-[#e4e7ef] shadow-sm">
                  <p className={`text-[13px] leading-relaxed text-center ${questionLoading ? "text-[#9ca3af] italic" : "text-[#374151]"}`}>
                    {currentQ}
                  </p>
                </div>
              </div>
            )}
            <div className="absolute top-3 left-3">
              <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-lg px-2.5 py-1 border border-[#e4e7ef] shadow-sm">
                {(aiSpeaking || questionLoading) && <span className="w-1.5 h-1.5 rounded-full bg-[#4f52e8] animate-pulse" />}
                <span className="text-[12px] text-[#374151] font-medium">AI 면접관</span>
              </div>
            </div>
          </div>

          {/* 지원자 타일 */}
          <div className="flex-1 relative rounded-2xl overflow-hidden bg-[#e8eaf0] border border-[#d1d5db] shadow-sm">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
            {camError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#f0f2f8]">
                <div className="w-16 h-16 rounded-full bg-white border border-[#e4e7ef] flex items-center justify-center shadow-sm">
                  <svg className="w-7 h-7 text-[#d1d5db]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <span className="text-[12px] text-[#9ca3af]">카메라를 사용할 수 없습니다</span>
              </div>
            )}
            <div className="absolute top-3 left-3">
              <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-lg px-2.5 py-1 border border-[#e4e7ef] shadow-sm">
                {recording && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                <span className="text-[12px] text-[#374151] font-medium">나 (지원자)</span>
              </div>
            </div>
            {!recording && phase !== "done" && (
              <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center border border-[#e4e7ef] shadow-sm">
                <svg className="w-4 h-4 text-[#9ca3af]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </div>
            )}
          </div>

          {/* 채팅 사이드패널 */}
          {showChat && (
            <div className="w-72 flex-shrink-0 flex flex-col bg-white rounded-2xl border border-[#e4e7ef] overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-[#e4e7ef] flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#374151]">면접 기록</span>
                <button onClick={() => setShowChat(false)} className="text-[#9ca3af] hover:text-[#374151] transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#f8f9fc]">
                {messages.map((m, i) => (
                  <div key={i} className={`flex flex-col gap-0.5 ${m.role === "user" ? "items-end" : "items-start"}`}>
                    <span className="text-[10px] text-[#9ca3af] px-1">{m.role === "ai" ? "AI 면접관" : "나"} · {m.time}</span>
                    <div className={`max-w-[90%] rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
                      m.role === "ai" ? "bg-[#eef0fd] text-[#374151] border border-[#c7d2fe]" : "bg-[#4f52e8] text-white"
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>
            </div>
          )}
        </div>

        {/* ── 컨트롤 바 ── */}
        <div className="flex-shrink-0 bg-white border-t border-[#e4e7ef] px-5 py-3 shadow-[0_-1px_8px_rgba(0,0,0,0.04)]">
          {phase === "done" ? (
            <div className="flex flex-col items-center gap-3 py-1">
              <p className="text-[13px] text-[#6b7280]">면접이 종료되었습니다. 수고하셨습니다!</p>
              <button
                onClick={() => router.push("/report")}
                className="inline-flex items-center gap-2 bg-[#4f52e8] hover:bg-[#3e41d4] text-white font-semibold px-8 py-2.5 rounded-xl transition-colors text-[14px]"
              >
                결과 리포트 보기 <IconArrowRight />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                  disabled={questionLoading}
                  placeholder={questionLoading ? "AI가 질문을 생성하고 있습니다..." : "답변을 입력하고 Enter 또는 전송 버튼을 누르세요"}
                  className="w-full bg-[#f8f9fc] border border-[#e4e7ef] text-[#0d1035] placeholder-[#c4c9d6] rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:border-[#4f52e8] focus:ring-1 focus:ring-[#4f52e8]/20 transition-colors disabled:opacity-50"
                />
              </div>
              <button
                onClick={submit}
                disabled={!input.trim() || questionLoading}
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                  input.trim() && !questionLoading ? "bg-[#4f52e8] hover:bg-[#3e41d4] text-white shadow-sm" : "bg-[#f0f2f8] text-[#c4c9d6] cursor-not-allowed"
                }`}
              >
                <IconSend />
              </button>
              <div className="w-px h-6 bg-[#e4e7ef] flex-shrink-0" />
              <button
                onClick={() => setRecording((r) => !r)}
                title={recording ? "마이크 끄기" : "마이크 켜기"}
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all border ${
                  recording ? "bg-red-50 border-red-300 text-red-500" : "bg-[#f8f9fc] border-[#e4e7ef] text-[#6b7280] hover:border-[#4f52e8]/40 hover:text-[#4f52e8]"
                }`}
              >
                <IconMic className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowChat((v) => !v)}
                title="면접 기록"
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all border ${
                  showChat ? "bg-[#eef0fd] border-[#c7d2fe] text-[#4f52e8]" : "bg-[#f8f9fc] border-[#e4e7ef] text-[#6b7280] hover:border-[#4f52e8]/40 hover:text-[#4f52e8]"
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </button>
              <button
                onClick={endCall}
                title="면접 종료"
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-red-500 hover:bg-red-600 text-white transition-all shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07C9.44 17.42 8.5 16.5 7.77 15.5" />
                  <path d="M13.73 4a2 2 0 0 1 1.93 1.47 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L14.64 11.6" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
