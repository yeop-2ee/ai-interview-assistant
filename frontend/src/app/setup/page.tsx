"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StepNavbar } from "@/components/Navbar";
import { IconArrowRight, IconCheck } from "@/components/Icons";

const departments = [
  // 스마트ICT계열
  { name: "컴퓨터소프트웨어과", enabled: true },
  { name: "전자공학과", enabled: false },
  { name: "정보통신과", enabled: false },
  { name: "전기과", enabled: false },
  // 라이프디자인계열
  { name: "건축과", enabled: false },
  { name: "실내건축과", enabled: false },
  { name: "패션디자인비즈니스과", enabled: false },
  { name: "뷰티스타일리스트과", enabled: false },
  // 문화콘텐츠계열
  { name: "게임콘텐츠과", enabled: false },
  { name: "웹툰만화콘텐츠과", enabled: false },
  { name: "영상콘텐츠과", enabled: false },
  { name: "시각디자인과", enabled: false },
  { name: "K-POP과", enabled: false },
  // 사회경영계열
  { name: "유통물류과", enabled: false },
  { name: "경영학과", enabled: false },
  { name: "세무회계과", enabled: false },
  { name: "군사학과", enabled: false },
  { name: "경찰경호보안과", enabled: false },
  // 보건복지교육계열
  { name: "보건의료행정과", enabled: false },
  { name: "식품영양학과", enabled: false },
  { name: "반려동물보건과", enabled: false },
  { name: "스포츠재활과", enabled: false },
  { name: "유아특수재활과", enabled: false },
  { name: "사회복지과", enabled: false },
  { name: "사회복지경영과", enabled: false },
  { name: "유아교육과", enabled: false },
  // 관광조리계열
  { name: "항공서비스과", enabled: false },
  { name: "관광과", enabled: false },
  { name: "호텔외식조리과", enabled: false },
];

const interviewTypes = [
  { id: "personality", label: "인성 면접", sub: "가치관·팀워크·성격 중심" },
  { id: "major", label: "전공 면접", sub: "CS 개념·전공 지식 중심" },
  { id: "resume", label: "자소서 기반", sub: "경험·프로젝트·기술 중심" },
  { id: "mixed", label: "혼합 면접", sub: "인성 + 전공 + 자소서 통합" },
];

const interviewerStyles = [
  { id: "friendly", label: "부드러운", desc: "편안하게 유도하는 스타일" },
  { id: "pressure", label: "압박형", desc: "날카로운 반론과 재질문" },
  { id: "professor", label: "교수형", desc: "개념을 깊게 파고드는 스타일" },
  { id: "practical", label: "실무형", desc: "실제 업무 연계 현실적 질문" },
  { id: "random", label: "랜덤", desc: "매 면접마다 다른 스타일" },
];

const difficulties = [
  { id: "easy", label: "기초", desc: "입문자 수준의 질문 위주" },
  { id: "medium", label: "중급", desc: "일반적인 면접 난이도" },
  { id: "hard", label: "심화", desc: "심층적인 개념과 경험 질문" },
];

function SelectChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2 rounded-lg border text-[13px] font-medium transition-all ${
        selected
          ? "border-[#4f52e8] bg-[#eef0fd] text-[#4f52e8]"
          : "border-[#e4e7ef] bg-white text-[#374151] hover:border-[#a5a7f3] hover:bg-[#f8f9fc]"
      }`}
    >
      {selected && (
        <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#4f52e8] flex items-center justify-center">
          <IconCheck className="w-2 h-2 text-white" />
        </span>
      )}
      {children}
    </button>
  );
}

function SectionTitle({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-[11px] font-bold text-[#4f52e8] bg-[#eef0fd] px-2 py-0.5 rounded-md">{num}</span>
      <h2 className="font-semibold text-[16px] text-[#0d1035]">{title}</h2>
    </div>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const [dept, setDept] = useState("");
  const [type, setType] = useState("");
  const [style, setStyle] = useState("");
  const [difficulty, setDifficulty] = useState("medium");

  const canProceed = !!dept && !!type && !!style;

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <StepNavbar />

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h1 className="text-[28px] font-bold text-[#0d1035] mb-2">면접 설정</h1>
          <p className="text-[14px] text-[#6b7280]">학과, 유형, 면접관 스타일을 고르면 AI가 맞춤 질문을 준비합니다.</p>
        </div>

        <div className="space-y-6">
          {/* Department */}
          <div className="bg-white rounded-2xl border border-[#e4e7ef] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <SectionTitle num="01" title="학과 선택" />
            <div className="flex flex-wrap gap-2">
              {departments.map((d) => (
                <button
                  key={d.name}
                  disabled={!d.enabled}
                  onClick={() => d.enabled && setDept(d.name)}
                  className={`relative px-4 py-2 rounded-lg border text-[13px] font-medium transition-all ${
                    d.enabled
                      ? dept === d.name
                        ? "border-[#4f52e8] bg-[#eef0fd] text-[#4f52e8]"
                        : "border-[#e4e7ef] bg-white text-[#374151] hover:border-[#a5a7f3] hover:bg-[#f8f9fc]"
                      : "border-[#e4e7ef] bg-[#f8f9fc] text-[#c4c9d6] cursor-not-allowed"
                  }`}
                >
                  {d.enabled && dept === d.name && (
                    <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#4f52e8] flex items-center justify-center">
                      <IconCheck className="w-2 h-2 text-white" />
                    </span>
                  )}
                  {d.name}
                  {!d.enabled && (
                    <span className="ml-1.5 text-[10px] text-[#d1d5db]">준비 중</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Interview type */}
          <div className="bg-white rounded-2xl border border-[#e4e7ef] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <SectionTitle num="02" title="면접 유형" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {interviewTypes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    type === t.id
                      ? "border-[#4f52e8] bg-[#eef0fd]"
                      : "border-[#e4e7ef] bg-[#f8f9fc] hover:border-[#a5a7f3]"
                  }`}
                >
                  <div className={`text-[15px] font-semibold mb-1 ${type === t.id ? "text-[#4f52e8]" : "text-[#0d1035]"}`}>
                    {t.label}
                  </div>
                  <div className="text-[12px] text-[#9ca3af] leading-tight">{t.sub}</div>
                  {type === t.id && (
                    <div className="mt-2.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#4f52e8] bg-white rounded-md px-1.5 py-0.5 border border-[#c7d2fe]">
                        <IconCheck className="w-2.5 h-2.5" /> 선택됨
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div className="bg-white rounded-2xl border border-[#e4e7ef] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <SectionTitle num="03" title="면접관 스타일" />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {interviewerStyles.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    style === s.id
                      ? "border-[#4f52e8] bg-[#eef0fd]"
                      : "border-[#e4e7ef] bg-[#f8f9fc] hover:border-[#a5a7f3]"
                  }`}
                >
                  <div className={`text-[14px] font-semibold mb-1 ${style === s.id ? "text-[#4f52e8]" : "text-[#0d1035]"}`}>
                    {s.label}
                  </div>
                  <div className="text-[11px] text-[#9ca3af] leading-tight">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="bg-white rounded-2xl border border-[#e4e7ef] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <SectionTitle num="04" title="난이도" />
            <div className="flex gap-3">
              {difficulties.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`flex-1 text-left p-4 rounded-xl border transition-all ${
                    difficulty === d.id
                      ? d.id === "easy"
                        ? "border-emerald-300 bg-emerald-50"
                        : d.id === "medium"
                        ? "border-[#4f52e8] bg-[#eef0fd]"
                        : "border-rose-300 bg-rose-50"
                      : "border-[#e4e7ef] bg-[#f8f9fc] hover:border-[#d1d5db]"
                  }`}
                >
                  <div className={`font-semibold text-[14px] mb-0.5 ${
                    difficulty === d.id
                      ? d.id === "easy" ? "text-emerald-700" : d.id === "medium" ? "text-[#4f52e8]" : "text-rose-700"
                      : "text-[#374151]"
                  }`}>
                    {d.label}
                  </div>
                  <div className="text-[12px] text-[#9ca3af]">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="mt-8 flex items-center justify-between">
          <Link href="/" className="text-[13px] text-[#9ca3af] hover:text-[#374151] transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            홈으로
          </Link>

          <div className="flex items-center gap-4">
            {!canProceed && (
              <span className="text-[12px] text-[#9ca3af]">학과, 유형, 스타일을 모두 선택해주세요</span>
            )}
            <button
              onClick={() => canProceed && router.push("/upload")}
              disabled={!canProceed}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-[14px] transition-all ${
                canProceed
                  ? "bg-[#4f52e8] hover:bg-[#3e41d4] text-white shadow-md shadow-[#4f52e8]/20"
                  : "bg-[#e4e7ef] text-[#9ca3af] cursor-not-allowed"
              }`}
            >
              다음 단계 <IconArrowRight />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
