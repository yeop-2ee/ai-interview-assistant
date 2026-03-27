"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { StepNavbar } from "@/components/Navbar";
import { IconUpload, IconArrowRight, IconCheck, IconX, IconShield } from "@/components/Icons";

type CheckStatus = "idle" | "checking" | "ok" | "error";

type FileState = {
  file: File | null;
  status: CheckStatus;
  error?: string;
};

const SENSITIVE = [
  { label: "주민등록번호", re: /\d{6}-[1-4]\d{6}/ },
  { label: "전화번호", re: /010-?\d{4}-?\d{4}/ },
];

async function checkFile(file: File): Promise<string | null> {
  // Only try to read as text for text-based files
  if (!file.type.startsWith("text") && !file.name.endsWith(".txt")) return null;
  try {
    const text = await file.text();
    for (const p of SENSITIVE) {
      if (p.re.test(text)) return `${p.label}가 감지되었습니다. 해당 정보를 제거 후 다시 업로드해주세요.`;
    }
  } catch {}
  return null;
}

function StatusBadge({ status }: { status: CheckStatus }) {
  if (status === "idle") return null;
  if (status === "checking") return (
    <span className="flex items-center gap-1.5 text-[11px] text-amber-600 font-medium">
      <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      개인정보 검사 중
    </span>
  );
  if (status === "ok") return (
    <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
      <IconCheck className="w-3 h-3" /> 안전한 파일
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[11px] text-rose-600 font-medium">
      <IconX className="w-3 h-3" /> 민감정보 감지
    </span>
  );
}

function DropZone({
  label,
  hint,
  state,
  onChange,
}: {
  label: string;
  hint: string;
  state: FileState;
  onChange: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const borderClass =
    state.status === "ok" ? "border-emerald-300 bg-emerald-50/50" :
    state.status === "error" ? "border-rose-300 bg-rose-50/50" :
    drag ? "border-[#4f52e8] bg-[#eef0fd]" :
    "border-[#e4e7ef] bg-[#f8f9fc] hover:border-[#a5a7f3] hover:bg-white";

  return (
    <div
      className={`rounded-2xl border-2 border-dashed transition-all cursor-pointer p-6 ${borderClass}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onChange(f); }}
      onClick={() => ref.current?.click()}
    >
      <input ref={ref} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); }} />

      <div className="flex flex-col items-center text-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          state.status === "ok" ? "bg-emerald-100 text-emerald-600" :
          state.status === "error" ? "bg-rose-100 text-rose-500" :
          "bg-white border border-[#e4e7ef] text-[#9ca3af]"
        }`}>
          {state.status === "ok" ? <IconCheck className="w-5 h-5" /> :
           state.status === "error" ? <IconX className="w-5 h-5" /> :
           <IconUpload className="w-5 h-5" />}
        </div>

        <div>
          <div className="font-medium text-[14px] text-[#374151] mb-0.5">{label}</div>
          {state.file ? (
            <div className="text-[12px] text-[#6b7280] font-medium">{state.file.name}</div>
          ) : (
            <div className="text-[12px] text-[#9ca3af]">{hint}</div>
          )}
        </div>

        <StatusBadge status={state.status} />

        {state.status === "error" && state.error && (
          <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 leading-relaxed">
            {state.error}
          </p>
        )}
      </div>
    </div>
  );
}

export default function UploadPage() {
  const router = useRouter();
  const [resume, setResume] = useState<FileState>({ file: null, status: "idle" });
  const [cover, setCover] = useState<FileState>({ file: null, status: "idle" });

  const handleFile = async (file: File, set: React.Dispatch<React.SetStateAction<FileState>>) => {
    set({ file, status: "checking" });
    await new Promise((r) => setTimeout(r, 700));
    const err = await checkFile(file);
    set({ file, status: err ? "error" : "ok", error: err ?? undefined });
  };

  const canProceed = resume.status === "ok" || cover.status === "ok";

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <StepNavbar />

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-[28px] font-bold text-[#0d1035] mb-2">자료 업로드</h1>
          <p className="text-[14px] text-[#6b7280]">이력서나 자소서를 올리면 AI가 내용을 분석해 맞춤 면접 질문을 생성합니다. 둘 다 없어도 진행할 수 있습니다.</p>
        </div>

        {/* Privacy notice */}
        <div className="flex gap-3 bg-white border border-[#e4e7ef] rounded-2xl p-4 mb-7 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <div className="w-8 h-8 rounded-lg bg-[#eef0fd] text-[#4f52e8] flex items-center justify-center flex-shrink-0">
            <IconShield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[#374151] mb-0.5">개인정보 자동 검사</div>
            <div className="text-[12px] text-[#6b7280] leading-relaxed">
              업로드 시 주민번호·전화번호 등 민감정보가 자동으로 감지됩니다. 파일은 분석 후 즉시 삭제됩니다.
            </div>
          </div>
        </div>

        {/* Drop zones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-2 uppercase tracking-wide">이력서</label>
            <DropZone
              label="이력서를 여기에 놓거나 클릭"
              hint="PDF, DOCX, TXT 지원"
              state={resume}
              onChange={(f) => handleFile(f, setResume)}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-2 uppercase tracking-wide">자기소개서</label>
            <DropZone
              label="자소서를 여기에 놓거나 클릭"
              hint="PDF, DOCX, TXT 지원"
              state={cover}
              onChange={(f) => handleFile(f, setCover)}
            />
          </div>
        </div>

        {/* Skip option */}
        <div className="bg-white rounded-2xl border border-[#e4e7ef] p-5 mb-8 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px] font-medium text-[#374151] mb-0.5">자료 없이 진행하기</div>
              <div className="text-[12px] text-[#9ca3af]">선택한 학과와 면접 유형에 맞는 기본 질문으로 면접을 시작합니다.</div>
            </div>
            <button
              onClick={() => router.push("/interview")}
              className="flex-shrink-0 text-[13px] font-medium text-[#4f52e8] hover:bg-[#eef0fd] px-4 py-2 rounded-lg transition-colors border border-[#c7d2fe]"
            >
              건너뛰기
            </button>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="flex items-center justify-between">
          <Link href="/setup" className="text-[13px] text-[#9ca3af] hover:text-[#374151] transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            이전 단계
          </Link>
          <button
            onClick={() => canProceed && router.push("/interview")}
            disabled={!canProceed}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-[14px] transition-all ${
              canProceed
                ? "bg-[#4f52e8] hover:bg-[#3e41d4] text-white shadow-md shadow-[#4f52e8]/20"
                : "bg-[#e4e7ef] text-[#9ca3af] cursor-not-allowed"
            }`}
          >
            AI 분석 시작 <IconArrowRight />
          </button>
        </div>
      </main>
    </div>
  );
}
