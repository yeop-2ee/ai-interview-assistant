"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { IconArrowRight, IconCheck } from "@/components/Icons";

function useInView(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCountUp(target: number, duration = 1800, active = true, delay = 0, from = 0) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (!active) return;
    setValue(from);
    let raf: number;
    const timeout = setTimeout(() => {
      const startTime = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(from + (target - from) * eased));
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(timeout); cancelAnimationFrame(raf); };
  }, [target, duration, active, delay, from]);
  return value;
}

const overview = [
  { label: "답변 내용", score: 82, color: "#4f52e8", bg: "#eef0fd" },
  { label: "논리 구조", score: 75, color: "#0ea5e9", bg: "#e0f2fe" },
  { label: "전공 지식", score: 68, color: "#8b5cf6", bg: "#ede9fe" },
  { label: "전달력", score: 88, color: "#059669", bg: "#d1fae5" },
];

const voiceData = [
  { label: "말하기 속도", value: "142 WPM", ok: true, note: "적정 범위 (130–160 WPM)" },
  { label: "무음 구간", value: "8회", ok: false, note: "다소 많음 (권장 5회 이하)" },
  { label: "필러어", value: "\"음...\" 5회", ok: false, note: "보통 (권장 3회 이하)" },
  { label: "답변 시작 지연", value: "평균 2.1초", ok: true, note: "양호 (3초 이하)" },
];

const eyeData = [
  { label: "정면 응시", value: "62%", ok: false, note: "70% 이상 권장" },
  { label: "표정 변화", value: "낮음", ok: false, note: "자연스러운 미소 권장" },
  { label: "자세 안정성", value: "양호", ok: true, note: "전반적으로 안정적" },
];

const qFeedback = [
  {
    q: "자기소개를 1분 이내로 해주세요.",
    answer: "안녕하세요. 저는 컴퓨터공학과를 졸업한 홍길동이라고 합니다...",
    scores: { content: 78, logic: 80 },
    comment: "구조는 명확했습니다. 다만 지원 직무와의 연관성을 더 직접적으로 언급하면 설득력이 높아집니다.",
    tags: ["자기소개 구조화", "직무 연관성"],
  },
  {
    q: "가장 자신 있는 기술 스택과 프로젝트 경험을 말씀해주세요.",
    answer: "저는 React와 Node.js를 주로 사용하며, 최근에는 팀 프로젝트에서...",
    scores: { content: 85, logic: 72 },
    comment: "기술 스택 설명은 좋았으나 프로젝트 성과를 수치로 제시했다면 더 인상적이었을 것입니다.",
    tags: ["성과 수치화", "STAR 기법"],
  },
  {
    q: "팀 갈등 상황을 어떻게 해결하셨나요?",
    answer: "팀원 간 의견 충돌 시 저는 먼저 각자의 입장을 충분히 들으려 했습니다...",
    scores: { content: 70, logic: 68 },
    comment: "해결 과정 묘사는 좋았지만 본인의 구체적인 기여와 그 결과를 명확하게 제시하는 것이 필요합니다.",
    tags: ["구체적 사례", "본인 역할 강조"],
  },
];

const weakConcepts = [
  "운영체제 — 프로세스 vs 스레드",
  "네트워크 — TCP 3-Way Handshake",
  "자료구조 — 해시 충돌 해결 방법",
  "DB — 트랜잭션 ACID 속성",
];

function RadialScore({ score, color, delay = 0 }: { score: number; color: string; delay?: number }) {
  const { ref, inView } = useInView(0.5);
  const animated = useCountUp(score, 1800, inView, delay, 0);
  const r = 28;
  const c = 2 * Math.PI * r;
  const fill = (animated / 100) * c;
  return (
    <div ref={ref}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#f0f2f8" strokeWidth="5" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={`${fill} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
        <text x="36" y="40" textAnchor="middle" fill={color} fontSize="14" fontWeight="700">{animated}</text>
      </svg>
    </div>
  );
}

function MiniBar({ value, color }: { value: number; color: string }) {
  const { ref, inView } = useInView(0.5);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setWidth(value), 50);
    return () => clearTimeout(t);
  }, [inView, value]);
  return (
    <div ref={ref} className="w-full h-1.5 bg-[#f0f2f8] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-[1400ms] ease-out" style={{ width: `${width}%`, background: color }} />
    </div>
  );
}

const overall = Math.round(overview.reduce((s, x) => s + x.score, 0) / overview.length);
const overallColor = overall >= 80 ? "#059669" : overall >= 65 ? "#d97706" : "#dc2626";

export default function ReportPage() {
  const router = useRouter();
  const { ref: overallRef, inView: overallInView } = useInView(0.5);
  const animatedOverall = useCountUp(overall, 2000, overallInView, 0, 100);
  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      {/* Header */}
      <header className="bg-white border-b border-[#e4e7ef] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-[60px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
<span className="font-semibold text-[14px] tracking-tight text-[#0d1035]">AI기반 맞춤 면접 도우미</span>
          </Link>
          <div className="flex items-center gap-2">
            <button className="text-[13px] text-[#374151] border border-[#e4e7ef] hover:border-[#a5a7f3] hover:bg-[#f8f9fc] px-4 py-1.5 rounded-lg transition-all">
              리포트 저장
            </button>
            <button
              onClick={() => router.push("/setup")}
              className="text-[13px] font-medium bg-[#4f52e8] hover:bg-[#3e41d4] text-white px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              다시 연습 <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Title row */}
        <div className="flex items-start justify-between mb-8 gap-6">
          <div>
            <h1 className="text-[26px] font-bold text-[#0d1035] mb-1">면접 결과 리포트</h1>
            <p className="text-[13px] text-[#9ca3af]">컴퓨터공학과 · 혼합 면접 · 부드러운 면접관 · 2025-03-23</p>
          </div>
          <div ref={overallRef} className="flex-shrink-0 bg-white rounded-2xl border border-[#e4e7ef] px-6 py-4 text-center shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="text-[44px] font-black leading-none mb-1" style={{ color: overallColor }}>{animatedOverall}</div>
            <div className="text-[11px] text-[#9ca3af] uppercase tracking-wide font-medium">종합 점수</div>
          </div>
        </div>

        {/* Score cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
          {overview.map((s, i) => (
            <div key={s.label} className="bg-white rounded-2xl border border-[#e4e7ef] p-5 flex flex-col items-center text-center shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <RadialScore score={s.score} color={s.color} delay={i * 250} />
              <div className="text-[13px] font-medium text-[#374151] mt-2">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Analysis grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-7">
          {/* Voice */}
          <div className="bg-white rounded-2xl border border-[#e4e7ef] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg bg-[#eef0fd] flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[#4f52e8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                </svg>
              </div>
              <span className="font-semibold text-[14px] text-[#0d1035]">음성 분석</span>
            </div>
            <div className="space-y-4">
              {voiceData.map((v) => (
                <div key={v.label}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[12px] text-[#6b7280]">{v.label}</span>
                    <span className="text-[12px] font-semibold text-[#374151]">{v.value}</span>
                  </div>
                  <div className={`text-[11px] ${v.ok ? "text-emerald-600" : "text-amber-600"}`}>
                    {v.ok ? "✓" : "△"} {v.note}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Eye / Face */}
          <div className="bg-white rounded-2xl border border-[#e4e7ef] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg bg-[#ede9fe] flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[#8b5cf6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <span className="font-semibold text-[14px] text-[#0d1035]">표정·시선 관찰</span>
            </div>
            <div className="space-y-4">
              {eyeData.map((v) => (
                <div key={v.label}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[12px] text-[#6b7280]">{v.label}</span>
                    <span className="text-[12px] font-semibold text-[#374151]">{v.value}</span>
                  </div>
                  <div className={`text-[11px] ${v.ok ? "text-emerald-600" : "text-amber-600"}`}>
                    {v.ok ? "✓" : "△"} {v.note}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[#f0f2f8] text-[11px] text-[#9ca3af] leading-relaxed">
              관찰 기반 피드백입니다. 개인적 판단이 아닌 전달력 관점의 수치입니다.
            </div>
          </div>

          {/* Weak concepts */}
          <div className="bg-white rounded-2xl border border-[#e4e7ef] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg bg-[#fef3c7] flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[#d97706]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <span className="font-semibold text-[14px] text-[#0d1035]">보완 개념 추천</span>
            </div>
            <p className="text-[12px] text-[#9ca3af] mb-4">답변에서 부족했던 CS·전공 개념입니다.</p>
            <div className="space-y-2.5">
              {weakConcepts.map((c, i) => (
                <div key={c} className="flex items-start gap-2.5">
                  <span className="text-[10px] font-bold text-[#9ca3af] mt-0.5 flex-shrink-0 w-4">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[13px] text-[#374151] leading-tight">{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Per question */}
        <div className="bg-white rounded-2xl border border-[#e4e7ef] shadow-[0_1px_4px_rgba(0,0,0,0.04)] mb-7">
          <div className="px-6 py-4 border-b border-[#f0f2f8]">
            <h2 className="font-semibold text-[16px] text-[#0d1035]">질문별 피드백</h2>
          </div>
          <div className="divide-y divide-[#f0f2f8]">
            {qFeedback.map((f, i) => (
              <div key={i} className="px-6 py-5">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-[11px] font-bold text-[#9ca3af] bg-[#f8f9fc] border border-[#e4e7ef] rounded-md px-1.5 py-0.5 flex-shrink-0 mt-0.5">Q{i + 1}</span>
                  <p className="text-[14px] font-medium text-[#0d1035] leading-snug">{f.q}</p>
                </div>

                <blockquote className="ml-8 mb-3 pl-3 border-l-2 border-[#e4e7ef] text-[13px] text-[#6b7280] italic leading-relaxed">
                  &ldquo;{f.answer}&rdquo;
                </blockquote>

                <div className="ml-8 grid grid-cols-2 gap-4 mb-3 max-w-xs">
                  {[
                    { label: "내용", val: f.scores.content, color: "#4f52e8" },
                    { label: "논리성", val: f.scores.logic, color: "#0ea5e9" },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[#9ca3af]">{s.label}</span>
                        <span className="font-semibold text-[#374151]">{s.val}</span>
                      </div>
                      <MiniBar value={s.val} color={s.color} />
                    </div>
                  ))}
                </div>

                <p className="ml-8 text-[13px] text-[#374151] mb-2.5 leading-relaxed">{f.comment}</p>

                <div className="ml-8 flex flex-wrap gap-1.5">
                  {f.tags.map((t) => (
                    <span key={t} className="text-[11px] font-medium text-[#6b7280] bg-[#f8f9fc] border border-[#e4e7ef] px-2.5 py-0.5 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-[#0d1035] rounded-2xl p-8 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h3 className="text-[20px] font-bold mb-1.5">계속 연습할수록 나아집니다</h3>
              <p className="text-white/50 text-[14px]">오늘 부족했던 개념을 중심으로 다시 도전해보세요.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <button
                onClick={() => router.push("/setup")}
                className="inline-flex items-center gap-2 bg-[#4f52e8] hover:bg-[#3e41d4] text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-[14px]"
              >
                새 면접 시작 <IconArrowRight />
              </button>
              <button
                onClick={() => router.push("/interview")}
                className="inline-flex items-center gap-2 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.12] text-white font-medium px-6 py-2.5 rounded-xl transition-colors text-[14px]"
              >
                약점 집중 연습
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
