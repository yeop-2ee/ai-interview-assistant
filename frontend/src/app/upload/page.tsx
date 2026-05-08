"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { StepNavbar } from "@/components/Navbar";
import { IconUpload, IconArrowRight, IconCheck, IconX } from "@/components/Icons";
import { parseSSE } from "@/lib/sseStream";

type FileStatus = "idle" | "loading" | "ok" | "error";

type FileState = {
  file: File | null;
  status: FileStatus;
  error?: string;
};

type Summary = {
  name: string;
  oneLiner?: string;
  oneLine?: string;
  skills: string[];
  experience: string;
  education: string;
  projects: string[];
  strengths: string[];
  isRelevant?: boolean;
  relevanceReason?: string | null;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

async function uploadAndExtract(file: File): Promise<{ ok: boolean; extractedText?: string; error?: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["pdf", "docx"].includes(ext)) {
    return { ok: false, error: "PDF 또는 DOCX 파일만 업로드 가능합니다." };
  }
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BACKEND_URL}/upload/resume`, { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.message ?? "파일 처리 중 오류가 발생했습니다." };
  return { ok: true, extractedText: data.extractedText };
}

function DropZone({ label, state, onChange, onRemove }: {
  label: string;
  state: FileState;
  onChange: (f: File) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const borderClass =
    state.status === "ok"      ? "border-emerald-300 bg-emerald-50/60" :
    state.status === "error"   ? "border-rose-300 bg-rose-50/60" :
    drag                       ? "border-[#4f52e8] bg-[#eef0fd]" :
    "border-[#e4e7ef] bg-[#f8f9fc] hover:border-[#a5a7f3] hover:bg-white";

  return (
    <div
      className={`rounded-2xl border-2 border-dashed transition-all cursor-pointer p-6 ${borderClass}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onChange(f); }}
      onClick={() => ref.current?.click()}
    >
      <input ref={ref} type="file" accept=".pdf,.docx" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = ""; }} />

      <div className="flex flex-col items-center text-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          state.status === "ok"    ? "bg-emerald-100 text-emerald-600" :
          state.status === "error" ? "bg-rose-100 text-rose-500" :
          state.status === "loading" ? "bg-[#eef0fd] text-[#4f52e8]" :
          "bg-white border border-[#e4e7ef] text-[#9ca3af]"
        }`}>
          {state.status === "ok"      ? <IconCheck className="w-5 h-5" /> :
           state.status === "error"   ? <IconX className="w-5 h-5" /> :
           state.status === "loading" ? (
             <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
             </svg>
           ) : <IconUpload className="w-5 h-5" />}
        </div>

        <div>
          <div className="font-medium text-[14px] text-[#374151] mb-0.5">{label}</div>
          {state.file ? (
            <div className="flex items-center gap-1.5 justify-center">
              <span className="text-[12px] text-[#6b7280]">{state.file.name}</span>
              {state.status !== "loading" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(); }}
                  className="w-4 h-4 rounded-full bg-[#d1d5db] hover:bg-rose-400 text-white flex items-center justify-center flex-shrink-0 transition-colors"
                >
                  <IconX className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="text-[12px] text-[#9ca3af]">PDF, DOCX 지원</div>
          )}
        </div>

        {state.status === "loading" && (
          <span className="text-[11px] text-[#4f52e8] font-medium">텍스트 추출 중...</span>
        )}
        {state.status === "ok" && (
          <span className="text-[11px] text-emerald-600 font-medium">내용 추출 완료</span>
        )}
        {state.status === "error" && state.error && (
          <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{state.error}</p>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ summary, loading, progress, relevanceLoading, relevanceMismatch, relevanceReason }: {
  summary: Summary | null;
  loading: boolean;
  progress: number;
  relevanceLoading?: boolean;
  relevanceMismatch?: boolean;
  relevanceReason?: string;
}) {
  if (loading) {
    const stepLabel = progress < 40 ? "내용 분석 중..." : progress < 80 ? "핵심 정보 추출 중..." : "마무리 중...";

    return (
      <div className="bg-white rounded-2xl border border-[#e4e7ef] p-6 mb-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#eef0fd] flex items-center justify-center">
            <svg className="animate-spin w-4 h-4 text-[#4f52e8]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <div className="text-[14px] font-semibold text-[#0d1035]">AI 분석 중</div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#9ca3af]">약 1~2분 소요 예상</span>
                <span className="text-[13px] font-semibold text-[#4f52e8]">{progress}%</span>
              </div>
            </div>
            <div className="text-[12px] text-[#9ca3af]">{stepLabel}</div>
          </div>
        </div>
        <div className="w-full h-1.5 bg-[#e4e7ef] rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-[#4f52e8] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="space-y-3">
          {[70, 50, 85, 60].map((w, i) => (
            <div key={i} className="h-3 rounded-full bg-[#f3f4f6] animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#e4e7ef] shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden mb-6">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-[#4f52e8] to-[#7c7ff5] px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-white/70 text-[11px] font-medium uppercase tracking-wider mb-1">AI 분석 결과</div>
            <div className="text-white text-[18px] font-bold">{summary.name}</div>
            <div className="text-white/80 text-[13px] mt-1">{summary.oneLiner ?? summary.oneLine}</div>
          </div>
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>
        </div>
      </div>

      {/* 관련성 검사 중 */}
      {relevanceLoading && (
        <div className="mx-6 mt-5 flex items-center gap-2.5 bg-[#f8f9fc] border border-[#e4e7ef] rounded-xl px-4 py-3">
          <svg className="animate-spin w-4 h-4 text-[#4f52e8] flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p className="text-[13px] text-[#6b7280]">학과 관련성 검사 중...</p>
        </div>
      )}

      {/* 관련성 경고 */}
      {!relevanceLoading && relevanceMismatch && relevanceReason && (
        <div className="mx-6 mt-5 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-[13px] text-red-700 font-medium leading-relaxed">{relevanceReason}</p>
        </div>
      )}

      <div className="p-6 space-y-5">
        {/* 기술 스택 */}
        {summary.skills?.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">기술 스택</div>
            <div className="flex flex-wrap gap-1.5">
              {summary.skills.map((s, i) => (
                <span key={i} className="px-2.5 py-1 rounded-lg text-[12px] font-medium bg-[#eef0fd] text-[#4f52e8]">{s}</span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* 경력 */}
          {summary.experience && (
            <div>
              <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">경력</div>
              <div className="text-[13px] text-[#374151] leading-relaxed">{summary.experience}</div>
            </div>
          )}

          {/* 학력 */}
          {summary.education && (
            <div>
              <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-1.5">학력</div>
              <div className="text-[13px] text-[#374151] leading-relaxed">{summary.education}</div>
            </div>
          )}
        </div>

        {/* 주요 프로젝트 */}
        {summary.projects?.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">주요 프로젝트</div>
            <ul className="space-y-1.5">
              {summary.projects.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-[#374151]">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#4f52e8] flex-shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 강점 */}
        {summary.strengths?.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-2">핵심 강점</div>
            <div className="flex flex-wrap gap-2">
              {summary.strengths.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UploadPage() {
  const router = useRouter();
  const [resume, setResume] = useState<FileState>({ file: null, status: "idle" });
  const [cover, setCover] = useState<FileState>({ file: null, status: "idle" });
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryProgress, setSummaryProgress] = useState(0);
  const [department, setDepartment] = useState("");
  const [relevanceLoading, setRelevanceLoading] = useState(false);
  const [relevanceMismatch, setRelevanceMismatch] = useState(false);
  const [relevanceReason, setRelevanceReason] = useState("");

  const resumeTextRef = useRef<string>("");
  const coverTextRef = useRef<string>("");
  const summaryAbortRef = useRef<AbortController | null>(null);
  const lastSummaryRef = useRef<Summary | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 3000);
    fetch(`${BACKEND_URL}/`, { signal: ctrl.signal })
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false))
      .finally(() => clearTimeout(tid));
  }, []);

  useEffect(() => {
    const settings = JSON.parse(sessionStorage.getItem("interviewSettings") || "{}");
    if (settings.department) setDepartment(settings.department);
  }, []);

  const runRelevanceCheck = async (resumeText: string, coverText: string) => {
    const settings = JSON.parse(sessionStorage.getItem("interviewSettings") || "{}");
    const dept = settings.department || "";
    console.log("[relevance] dept:", dept, "| resumeLen:", resumeText.length);
    if (!dept) { console.log("[relevance] dept 없음 → 스킵"); return; }

    setRelevanceMismatch(false);
    setRelevanceReason("");
    setRelevanceLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/ai/relevance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, coverText, department: dept }),
      });
      const data = await res.json();
      console.log("[relevance] 응답:", data);
      if (data.isRelevant === false) {
        setRelevanceMismatch(true);
        setRelevanceReason(data.reason || `선택한 학과(${dept})와 관련 없는 이력서입니다.`);
      }
    } catch (e) { console.error("[relevance] 오류:", e); }
    finally { setRelevanceLoading(false); }
  };

  const triggerSummary = async (resumeText: string, coverText: string) => {
    summaryAbortRef.current?.abort();
    const ctrl = new AbortController();
    summaryAbortRef.current = ctrl;

    setSummaryLoading(true);
    setSummaryProgress(0);
    try {
      const res = await fetch(`${BACKEND_URL}/ai/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, coverText }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) return;

      let received = false;
      for await (const event of parseSSE(res)) {
        if (event.type === "progress") {
          setSummaryProgress(event.progress as number);
        } else if (event.type === "done") {
          received = true;
          setSummaryProgress(100);
          lastSummaryRef.current = event.data as Summary;
          setSummary(event.data as Summary);
        }
      }
      // done 이벤트 없이 스트림이 끝난 경우 이전 summary 유지
      if (!received && lastSummaryRef.current) {
        setSummary(lastSummaryRef.current);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      // 오류 시 이전 summary 유지
      if (lastSummaryRef.current) setSummary(lastSummaryRef.current);
    } finally {
      if (summaryAbortRef.current === ctrl) {
        setTimeout(() => setSummaryLoading(false), 300);
      }
    }
  };

  const handleFile = async (
    file: File,
    set: React.Dispatch<React.SetStateAction<FileState>>,
    storageKey: "resumeText" | "coverText"
  ) => {
    set({ file, status: "loading" });
    const { ok, extractedText, error } = await uploadAndExtract(file);
    if (ok && extractedText) {
      sessionStorage.setItem(storageKey, extractedText);
      set({ file, status: "ok" });

      if (storageKey === "resumeText") resumeTextRef.current = extractedText;
      else coverTextRef.current = extractedText;

      // 요약 먼저 완료 후 관련성 검사 (동시 실행 시 Ollama 충돌 방지)
      await triggerSummary(resumeTextRef.current, coverTextRef.current);
      await runRelevanceCheck(resumeTextRef.current, coverTextRef.current);
    } else {
      set({ file, status: "error", error });
    }
  };

  const handleRemove = (
    set: React.Dispatch<React.SetStateAction<FileState>>,
    storageKey: "resumeText" | "coverText"
  ) => {
    set({ file: null, status: "idle" });
    sessionStorage.removeItem(storageKey);

    if (storageKey === "resumeText") resumeTextRef.current = "";
    else coverTextRef.current = "";

    setRelevanceMismatch(false);
    setRelevanceReason("");
    const remaining = storageKey === "resumeText" ? coverTextRef.current : resumeTextRef.current;
    if (remaining) {
      triggerSummary(resumeTextRef.current, coverTextRef.current)
        .then(() => runRelevanceCheck(resumeTextRef.current, coverTextRef.current));
    } else {
      summaryAbortRef.current?.abort();
      lastSummaryRef.current = null;
      setSummary(null);
      setSummaryLoading(false);
    }
  };

  const hasFile = resume.status === "ok" || cover.status === "ok";
  const canProceed = hasFile && !summaryLoading && !relevanceLoading && !relevanceMismatch;

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <StepNavbar />

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-[28px] font-bold text-[#0d1035] mb-2">자료 업로드</h1>
          <p className="text-[14px] text-[#6b7280] leading-relaxed">
            이력서나 자소서를 업로드하면 텍스트를 추출해 AI 면접 질문 생성에 활용합니다.
            파일은 텍스트 추출 즉시 삭제되며 서버에 저장되지 않습니다.
          </p>
        </div>

        {/* 백엔드 연결 오류 배너 */}
        {backendOk === false && (
          <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-[13px] text-red-600">서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.</p>
          </div>
        )}

        {/* Drop zones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-2 uppercase tracking-wide">이력서</label>
            <DropZone
              label="이력서를 여기에 놓거나 클릭"
              state={resume}
              onChange={(f) => handleFile(f, setResume, "resumeText")}
              onRemove={() => handleRemove(setResume, "resumeText")}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-2 uppercase tracking-wide">자기소개서</label>
            <DropZone
              label="자소서를 여기에 놓거나 클릭"
              state={cover}
              onChange={(f) => handleFile(f, setCover, "coverText")}
              onRemove={() => handleRemove(setCover, "coverText")}
            />
          </div>
        </div>

        {/* AI 요약 카드 */}
        {hasFile && <SummaryCard summary={summary} loading={summaryLoading} progress={summaryProgress} relevanceLoading={relevanceLoading} relevanceMismatch={relevanceMismatch} relevanceReason={relevanceReason} />}

        {/* 건너뛰기 */}
        {!hasFile && (
          <div className="bg-white rounded-2xl border border-[#e4e7ef] p-5 mb-8 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[14px] font-medium text-[#374151] mb-0.5">자료 없이 진행하기</div>
                <div className="text-[12px] text-[#9ca3af]">학과·면접 유형에 맞는 기본 질문으로 시작합니다.</div>
              </div>
              <button
                onClick={() => router.push("/interview")}
                className="flex-shrink-0 text-[13px] font-medium text-[#4f52e8] hover:bg-[#eef0fd] px-4 py-2 rounded-lg transition-colors border border-[#c7d2fe]"
              >
                건너뛰기
              </button>
            </div>
          </div>
        )}

        {/* 하단 네비게이션 */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Link href="/setup" className="text-[13px] text-[#9ca3af] hover:text-[#374151] transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              이전 단계
            </Link>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => canProceed && router.push("/interview")}
                disabled={!canProceed}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-[14px] transition-all ${
                  canProceed
                    ? "bg-[#4f52e8] hover:bg-[#3e41d4] text-white shadow-md shadow-[#4f52e8]/20"
                    : "bg-[#e4e7ef] text-[#9ca3af] cursor-not-allowed"
                }`}
              >
                다음 <IconArrowRight />
              </button>
              <button
                onClick={() => canProceed && router.push("/interview/text")}
                disabled={!canProceed}
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
                  canProceed
                    ? "border-[#4f52e8]/40 text-[#4f52e8] hover:bg-[#4f52e8]/5"
                    : "border-[#e4e7ef] text-[#9ca3af] cursor-not-allowed"
                }`}
              >
                텍스트로 테스트
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
