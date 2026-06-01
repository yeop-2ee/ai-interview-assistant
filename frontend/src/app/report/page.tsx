"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { IconArrowRight, IconCheck } from "@/components/Icons";
import { authFetch } from "@/lib/auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

const STYLE_LABEL: Record<string, string> = {
  friendly: "부드러운", pressure: "압박형", professor: "교수형",
  practical: "실무형", random: "랜덤",
};
const TYPE_LABEL: Record<string, string> = {
  personality: "인성 면접", major: "전공 면접", resume: "자소서 면접", mixed: "혼합 면접",
};

/* ── 애니메이션 훅 ── */
function useInView(threshold = 0.2) {
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

function useCountUp(target: number, duration = 1500, active = true, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    setValue(0);
    let raf: number;
    const timeout = setTimeout(() => {
      const startTime = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(target * eased));
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(timeout); cancelAnimationFrame(raf); };
  }, [target, duration, active, delay]);
  return value;
}

/* ── 점수 원형 ── */
function RadialScore({ score, color, delay = 0 }: { score: number; color: string; delay?: number }) {
  const { ref, inView } = useInView(0.3);
  const animated = useCountUp(score, 1500, inView, delay);
  const r = 28; const c = 2 * Math.PI * r;
  return (
    <div ref={ref}>
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#f0f2f8" strokeWidth="5" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${(animated / 100) * c} ${c}`}
          strokeLinecap="round" transform="rotate(-90 36 36)" />
        <text x="36" y="40" textAnchor="middle" fill={color} fontSize="14" fontWeight="700">{animated}</text>
      </svg>
    </div>
  );
}

/* ── 프로그레스 바 ── */
function ProgressBar({ value, color }: { value: number; color: string }) {
  const { ref, inView } = useInView(0.2);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setWidth(value), 80);
    return () => clearTimeout(t);
  }, [inView, value]);
  return (
    <div ref={ref} className="w-full h-2 bg-[#f0f2f8] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-[1200ms] ease-out" style={{ width: `${width}%`, background: color }} />
    </div>
  );
}

/* ── 적합도 게이지 ── */
function FitGauge({ score, color }: { score: number; color: string }) {
  const { ref, inView } = useInView(0.2);
  const animated = useCountUp(score, 1400, inView);
  return (
    <div ref={ref}>
      <div className="flex justify-between text-[12px] mb-1.5">
        <span className="font-semibold" style={{ color }}>{animated}점</span>
      </div>
      <div className="w-full h-2.5 bg-[#f0f2f8] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-[1400ms] ease-out" style={{ width: `${inView ? score : 0}%`, background: color }} />
      </div>
    </div>
  );
}

/* ── 모델 출력 필드명 정규화 ── */
function normalizeReport(raw: Record<string, unknown>): Report {
  const scores = (raw.scores ?? raw.score ?? {}) as Record<string, number>;
  const fitScores = (raw.fitScores ?? raw.fitScore ?? {}) as Record<string, number>;
  const fitComments = (raw.fitComments ?? raw.fitComment ?? {}) as Record<string, string>;
  const rawFeedback = (raw.questionFeedback ?? raw.question_feedback ?? []) as Record<string, unknown>[];

  return {
    overallScore: Number(raw.overallScore ?? raw.overall_score ?? 0),
    scores: {
      content:     Number(scores.content     ?? scores.답변내용  ?? 0),
      logic:       Number(scores.logic       ?? scores.논리구조  ?? 0),
      delivery:    Number(scores.delivery    ?? scores.전달력    ?? 0),
      reliability: Number(scores.reliability ?? scores.신뢰도    ?? 0),
      likability:  Number(scores.likability  ?? scores.호감도    ?? 0),
    },
    strengths:   (raw.strengths   as string[]) ?? [],
    weaknesses:  (raw.weaknesses  as string[]) ?? [],
    precautions: (raw.precautions as string[]) ?? [],
    fitScores: {
      job:     Number(fitScores.job     ?? fitScores.직무 ?? 0),
      org:     Number(fitScores.org     ?? fitScores.조직 ?? 0),
      company: Number(fitScores.company ?? fitScores.기업 ?? 0),
    },
    fitComments: {
      job:     String(fitComments.job     ?? fitComments.직무 ?? ""),
      org:     String(fitComments.org     ?? fitComments.조직 ?? ""),
      company: String(fitComments.company ?? fitComments.기업 ?? ""),
    },
    questionFeedback: rawFeedback.map((f) => ({
      appropriateness: Number(f.appropriateness ?? f.approprate ?? f.적절성 ?? 0),
      lengthEval:      String(f.lengthEval ?? f.lengthenv ?? f.length_eval ?? f.답변길이 ?? "적절"),
      improvedAnswer:  String(f.improvedAnswer ?? f.improved_answer ?? f.개선답변 ?? ""),
      followUpQuestions: ((f.followUpQuestions ?? f.followUpQuestion ?? f.follow_up_questions ?? []) as string[]).filter(Boolean),
      comment:         String(f.comment ?? f.피드백 ?? ""),
    })),
    questions: (raw.questions as string[]) ?? [],
    answers:   (raw.answers   as string[]) ?? [],
  };
}

/* ── 리포트 타입 ── */
type QFeedback = {
  appropriateness: number;
  lengthEval: string;
  improvedAnswer: string;
  followUpQuestions: string[];
  comment: string;
};

type Report = {
  overallScore: number;
  scores: { content: number; logic: number; delivery: number; reliability: number; likability: number };
  strengths: string[];
  weaknesses: string[];
  precautions: string[];
  fitScores: { job: number; org: number; company: number };
  fitComments: { job: string; org: string; company: string };
  questionFeedback: QFeedback[];
  questions: string[];
  answers: string[];
};

const SCORE_ITEMS = [
  { key: "content",     label: "답변 내용",  color: "#4f52e8" },
  { key: "logic",       label: "논리 구조",  color: "#0ea5e9" },
  { key: "delivery",    label: "전달력",     color: "#059669" },
  { key: "reliability", label: "신뢰도",     color: "#8b5cf6" },
  { key: "likability",  label: "호감도",     color: "#f59e0b" },
] as const;

function ReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromProfile = searchParams.get("from") === "profile";
  const [report, setReport] = useState<Report | null>(null);
  const [subtitle, setSubtitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);
  const { ref: overallRef, inView: overallInView } = useInView(0.3);

  useEffect(() => {
    const settings = JSON.parse(sessionStorage.getItem("interviewSettings") || "{}");
    const dept = settings.department || "";
    const type = TYPE_LABEL[settings.interviewType] || "혼합 면접";
    const style = STYLE_LABEL[settings.style] || "";
    const date = new Date().toISOString().slice(0, 10);
    setSubtitle([dept, type, style && `${style} 면접관`, date].filter(Boolean).join(" · "));

    const raw = sessionStorage.getItem("interviewReport");
    if (raw) {
      try { setReport(normalizeReport(JSON.parse(raw))); } catch { /* 무시 */ }
    }
  }, []);

  const overall = report?.overallScore ?? 0;
  const overallColor = overall >= 80 ? "#059669" : overall >= 65 ? "#d97706" : "#dc2626";
  const animatedOverall = useCountUp(overall, 2000, overallInView && overall > 0);

  const handleSave = async () => {
    const email = localStorage.getItem("userEmail");
    if (!email) { router.push("/login"); return; }
    const settings = JSON.parse(sessionStorage.getItem("interviewSettings") || "{}");
    setSaving(true);
    try {
      const res = await authFetch(`${BACKEND_URL}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          title: TYPE_LABEL[settings.interviewType] || "혼합 면접",
          overallScore: overall,
          scores: report?.scores ?? {},
          questions: report ? report.questions.map((q, i) => ({
            q,
            answer: report.answers[i] ?? "",
            comment: report.questionFeedback[i]?.comment ?? "",
            tags: report.questionFeedback[i]?.followUpQuestions ?? [],
          })) : [],
          fullReport: report ?? null,
        }),
      });
      if (res.ok) setSaved(true);
    } finally { setSaving(false); }
  };

  const handleDownload = async () => {
    if (!mainRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { default: jsPDF } = await import("jspdf");

      const node = mainRef.current;

      // PDF에서 제외할 요소 숨김
      const hiddenEls = node.querySelectorAll<HTMLElement>(".pdf-hidden");
      hiddenEls.forEach((el) => { el.style.visibility = "hidden"; });

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#f8f9fc",
        logging: false,
        width: node.scrollWidth,
        height: node.scrollHeight,
        windowWidth: node.scrollWidth,
        windowHeight: node.scrollHeight,
        ignoreElements: (el) => el.classList.contains("pdf-hidden"),
      });

      // 숨긴 요소 복원
      hiddenEls.forEach((el) => { el.style.visibility = ""; });

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();   // 210mm
      const pageH = pdf.internal.pageSize.getHeight();  // 297mm

      // scale=2이므로 실제 px은 2배
      const imgW = canvas.width;
      const imgH = canvas.height;
      const mmPerPx = pageW / imgW;
      const pxPerPage = Math.round(pageH / mmPerPx);
      const pageCount = Math.ceil(imgH / pxPerPage);

      for (let i = 0; i < pageCount; i++) {
        const srcY = i * pxPerPage;
        const srcH = Math.min(pxPerPage, imgH - srcY);
        if (srcH < pxPerPage * 0.05) break;

        if (i > 0) pdf.addPage();

        const slice = document.createElement("canvas");
        slice.width = imgW;
        slice.height = srcH;
        const ctx = slice.getContext("2d")!;
        ctx.fillStyle = "#f8f9fc";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, srcY, imgW, srcH, 0, 0, imgW, srcH);

        const destH_mm = srcH * mmPerPx;
        pdf.addImage(slice.toDataURL("image/png"), "PNG", 0, 0, pageW, destH_mm);
      }

      pdf.save(`면접_리포트_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error("PDF 생성 실패:", e);
    } finally {
      setDownloading(false);
    }
  };

  if (!report) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-[#4f52e8]/30 border-t-[#4f52e8] animate-spin mx-auto mb-4" />
          <p className="text-[14px] text-[#6b7280]">리포트 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      {/* Header */}
      <header className="bg-white border-b border-[#e4e7ef] sticky top-0 z-50 print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-[60px] flex items-center justify-between gap-2">
          <Link href="/" className="font-semibold text-[14px] tracking-tight text-[#0d1035] flex-shrink-0">AI기반 맞춤 면접 도우미</Link>
          <div className="flex items-center gap-1 sm:gap-2">
            {fromProfile ? (
              <button onClick={() => router.push("/profile")}
                className="text-[12px] sm:text-[13px] border border-[#e4e7ef] text-[#374151] hover:border-[#a5a7f3] px-2.5 sm:px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5">
                ← 뒤로
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving || saved}
                className={`text-[12px] sm:text-[13px] border px-2.5 sm:px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${saved ? "border-emerald-300 text-emerald-600 bg-emerald-50" : "text-[#374151] border-[#e4e7ef] hover:border-[#a5a7f3]"}`}>
                {saving ? <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg><span className="hidden sm:inline">저장 중</span></> : saved ? <><IconCheck className="w-3.5 h-3.5" /><span className="hidden sm:inline">저장됨</span></> : <><span className="hidden sm:inline">리포트 </span>저장</>}
              </button>
            )}
            <button onClick={handleDownload} disabled={downloading}
              className="text-[12px] sm:text-[13px] border border-[#e4e7ef] text-[#374151] hover:border-[#a5a7f3] disabled:opacity-50 px-2.5 sm:px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5">
              {downloading
                ? <><svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg><span className="hidden sm:inline">변환 중...</span></>
                : <><svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span className="hidden sm:inline">PDF 다운로드</span></>
              }
            </button>
            <button onClick={() => router.push("/setup")}
              className="text-[12px] sm:text-[13px] font-medium bg-[#4f52e8] hover:bg-[#3e41d4] text-white px-2.5 sm:px-4 py-1.5 rounded-lg flex items-center gap-1.5 flex-shrink-0">
              <span className="hidden sm:inline">다시 연습</span><span className="sm:hidden">재시작</span> <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main ref={mainRef} className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-4 sm:space-y-6">
        {/* 타이틀 + 종합 점수 */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
          <div>
            <h1 className="text-[22px] sm:text-[26px] font-bold text-[#0d1035] mb-1">면접 결과 리포트</h1>
            <p className="text-[12px] sm:text-[13px] text-[#9ca3af]">{subtitle}</p>
          </div>
          <div ref={overallRef} className="flex-shrink-0 bg-white rounded-2xl border border-[#e4e7ef] px-6 py-4 text-center shadow-[0_1px_4px_rgba(0,0,0,0.06)] self-start sm:self-auto">
            <div className="text-[44px] font-black leading-none mb-1" style={{ color: overallColor }}>{animatedOverall}</div>
            <div className="text-[11px] text-[#9ca3af] uppercase tracking-wide font-medium">종합 점수</div>
          </div>
        </div>

        {/* 5개 점수 카드 */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
          {SCORE_ITEMS.map((s, i) => (
            <div key={s.key} className="bg-white rounded-2xl border border-[#e4e7ef] p-4 flex flex-col items-center text-center shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <RadialScore score={report.scores[s.key] ?? 0} color={s.color} delay={i * 150} />
              <div className="text-[12px] font-medium text-[#374151] mt-2">{s.label}</div>
            </div>
          ))}
        </div>

        {/* 강점 / 약점 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl border border-[#e4e7ef] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="font-semibold text-[14px] text-[#0d1035]">나의 강점</span>
            </div>
            <div className="space-y-2">
              {report.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-[13px] text-[#374151] leading-relaxed">{s}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#e4e7ef] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <span className="font-semibold text-[14px] text-[#0d1035]">보완할 점</span>
            </div>
            <div className="space-y-2">
              {report.weaknesses.map((w, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-[13px] text-[#374151] leading-relaxed">{w}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 적합도 평가 */}
        <div className="bg-white rounded-2xl border border-[#e4e7ef] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg bg-[#eef0fd] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[#4f52e8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span className="font-semibold text-[15px] text-[#0d1035]">적합도 평가</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {([
              { key: "job",     label: "직무 적합도", color: "#4f52e8" },
              { key: "org",     label: "조직 적합도", color: "#059669" },
              { key: "company", label: "기업 적합도", color: "#f59e0b" },
            ] as const).map((f) => (
              <div key={f.key}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold text-[#374151]">{f.label}</span>
                </div>
                <FitGauge score={report.fitScores[f.key] ?? 0} color={f.color} />
                <p className="text-[12px] text-[#6b7280] mt-2 leading-relaxed">{report.fitComments[f.key]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 실제 면접 주의사항 */}
        <div className="bg-white rounded-2xl border border-[#e4e7ef] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <span className="font-semibold text-[14px] text-[#0d1035]">실제 면접 시 주의사항</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {report.precautions.map((p, i) => (
              <div key={i} className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                <span className="text-[11px] font-bold text-amber-600 mt-0.5 flex-shrink-0">0{i + 1}</span>
                <span className="text-[13px] text-[#374151] leading-relaxed">{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 질문별 상세 피드백 */}
        <div className="bg-white rounded-2xl border border-[#e4e7ef] shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <div className="px-6 py-4 border-b border-[#f0f2f8]">
            <h2 className="font-semibold text-[16px] text-[#0d1035]">질문별 상세 피드백</h2>
          </div>
          <div className="divide-y divide-[#f0f2f8]">
            {report.questions.map((q, i) => {
              const fb = report.questionFeedback[i] ?? null;
              const isCommon = i < 5;
              return (
                <div key={i} className="px-4 sm:px-6 py-5 sm:py-6">
                  {/* 질문 */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                      <span className="text-[11px] font-bold text-[#9ca3af] bg-[#f8f9fc] border border-[#e4e7ef] rounded-md px-1.5 py-0.5">Q{i + 1}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isCommon ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"}`}>
                        {isCommon ? "공통" : "추가"}
                      </span>
                    </div>
                    <p className="text-[14px] font-medium text-[#0d1035] leading-snug">{q}</p>
                  </div>

                  {/* 답변 */}
                  <blockquote className="ml-4 sm:ml-8 mb-4 pl-3 border-l-2 border-[#e4e7ef] text-[13px] italic text-[#6b7280] leading-relaxed">
                    {report.answers[i]
                      ? `"${report.answers[i]}"`
                      : <span className="text-[#c4c9d6]">답변이 기록되지 않았습니다.</span>}
                  </blockquote>

                  {/* 점수 바 + 답변 길이 */}
                  {fb && (
                    <div className="ml-4 sm:ml-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                      <div>
                        <div className="flex justify-between text-[11px] mb-1.5">
                          <span className="text-[#9ca3af]">답변 적절성</span>
                          <span className="font-semibold text-[#374151]">{fb.appropriateness}</span>
                        </div>
                        <ProgressBar value={fb.appropriateness} color="#4f52e8" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#9ca3af]">답변 길이</span>
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                          fb.lengthEval === "적절" ? "bg-emerald-100 text-emerald-700" :
                          fb.lengthEval === "짧음" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                        }`}>{fb.lengthEval}</span>
                      </div>
                    </div>
                  )}

                  {/* 종합 피드백 */}
                  {fb?.comment && (
                    <p className="ml-4 sm:ml-8 text-[13px] text-[#374151] leading-relaxed mb-4">{fb.comment}</p>
                  )}

                  {/* 개선 답변 */}
                  {fb?.improvedAnswer && (
                    <div className="ml-4 sm:ml-8 bg-[#eef0fd] border border-[#c7d2fe] rounded-xl p-4 mb-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <svg className="w-3.5 h-3.5 text-[#4f52e8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                        <span className="text-[11px] font-semibold text-[#4f52e8]">개선된 답변 예시</span>
                      </div>
                      <p className="text-[13px] text-[#374151] leading-relaxed">{fb.improvedAnswer}</p>
                    </div>
                  )}

                  {/* 꼬리 질문 */}
                  {fb?.followUpQuestions?.length > 0 && (
                    <div className="ml-4 sm:ml-8">
                      <span className="text-[11px] text-[#9ca3af] font-medium block mb-2">나올 수 있는 꼬리 질문</span>
                      <div className="flex flex-wrap gap-2">
                        {fb.followUpQuestions.filter(Boolean).map((fq, j) => (
                          <span key={j} className="text-[12px] text-[#374151] bg-[#f8f9fc] border border-[#e4e7ef] px-3 py-1 rounded-full">
                            {fq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-[#0d1035] rounded-2xl p-8 text-white print:hidden pdf-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h3 className="text-[20px] font-bold mb-1.5">계속 연습할수록 나아집니다</h3>
              <p className="text-white/50 text-[14px]">오늘 부족했던 부분을 중심으로 다시 도전해보세요.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <button onClick={() => router.push("/setup")}
                className="inline-flex items-center gap-2 bg-[#4f52e8] hover:bg-[#3e41d4] text-white font-semibold px-6 py-2.5 rounded-xl text-[14px]">
                새 면접 시작 <IconArrowRight />
              </button>
              <button onClick={() => router.push("/interview")}
                className="inline-flex items-center gap-2 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.12] text-white font-medium px-6 py-2.5 rounded-xl text-[14px]">
                약점 집중 연습
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense>
      <ReportContent />
    </Suspense>
  );
}
