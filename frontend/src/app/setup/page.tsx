"use client";

import { useState, useEffect } from "react";
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

const DEPT_ROLES: Record<string, string[]> = {
  // 스마트ICT계열
  "컴퓨터소프트웨어과": ["백엔드 개발자", "프론트엔드 개발자", "풀스택 개발자", "모바일 개발자", "AI/ML 엔지니어", "데이터 엔지니어", "DevOps 엔지니어", "보안 엔지니어", "QA 엔지니어", "임베디드 개발자"],
  "전자공학과": ["하드웨어 엔지니어", "임베디드 개발자", "회로 설계 엔지니어", "RF 엔지니어", "반도체 엔지니어", "제어 시스템 엔지니어", "IoT 개발자", "전자 설계 자동화(EDA) 엔지니어"],
  "정보통신과": ["네트워크 엔지니어", "통신 시스템 엔지니어", "무선통신 엔지니어", "보안 엔지니어", "클라우드 인프라 엔지니어", "IT 컨설턴트", "기술 영업"],
  "전기과": ["전기 엔지니어", "전력 시스템 엔지니어", "전기 설계 엔지니어", "배전 엔지니어", "신재생에너지 엔지니어", "자동화 엔지니어", "PLC 프로그래머"],
  // 라이프디자인계열
  "건축과": ["건축 설계사", "현장 감리원", "인테리어 디자이너", "도시계획가", "BIM 엔지니어", "건축 시공 관리자", "부동산 개발 기획자"],
  "실내건축과": ["실내 건축 디자이너", "인테리어 플래너", "공간 디자이너", "VM 디자이너", "전시 디자이너", "무대 디자이너"],
  "패션디자인비즈니스과": ["패션 디자이너", "MD(머천다이저)", "패션 바이어", "스타일리스트", "비주얼 머천다이저", "패션 마케터", "브랜드 매니저"],
  "뷰티스타일리스트과": ["헤어 스타일리스트", "메이크업 아티스트", "피부관리사", "네일 아티스트", "뷰티 크리에이터", "뷰티 MD", "방송 분장사"],
  // 문화콘텐츠계열
  "게임콘텐츠과": ["게임 클라이언트 개발자", "게임 서버 개발자", "게임 기획자", "게임 아티스트", "레벨 디자이너", "UI/UX 디자이너", "QA 테스터"],
  "웹툰만화콘텐츠과": ["웹툰 작가", "만화 스토리 작가", "콘텐츠 기획자", "디지털 일러스트레이터", "웹툰 PD", "IP 사업 기획자"],
  "영상콘텐츠과": ["영상 PD", "영상 편집자", "촬영 감독", "콘텐츠 기획자", "유튜브 크리에이터", "영화 감독", "방송 작가", "VFX 아티스트"],
  "시각디자인과": ["그래픽 디자이너", "UI/UX 디자이너", "브랜드 디자이너", "광고 디자이너", "모션 그래픽 디자이너", "패키지 디자이너", "영상 디자이너"],
  "K-POP과": ["가수·아이돌", "안무가", "음악 프로듀서", "엔터테인먼트 기획자", "아티스트 매니저", "무대 연출가", "음악 마케터"],
  // 사회경영계열
  "유통물류과": ["물류 관리자", "SCM 전문가", "유통 MD", "구매 담당자", "무역 전문가", "물류 IT 시스템 기획자", "창고 운영 관리자"],
  "경영학과": ["경영 기획자", "전략 컨설턴트", "마케터", "인사 담당자(HR)", "재무 분석가", "사업 개발 매니저", "스타트업 창업가"],
  "세무회계과": ["세무사", "공인회계사(CPA)", "재무 회계 담당자", "원가 분석가", "세무 컨설턴트", "관세사", "금융 분석가"],
  "군사학과": ["직업군인(장교)", "부사관", "군 행정 전문가", "방산 기업 종사자", "안보 정책 연구원", "군 교육 훈련 담당자"],
  "경찰경호보안과": ["경찰관", "경호원", "보안 전문가", "사설 경비원", "범죄 분석가", "소방관", "교정직 공무원"],
  // 보건복지교육계열
  "보건의료행정과": ["병원 행정직", "의료 코디네이터", "건강보험 심사원", "의료 기획·홍보", "공공 보건 행정직", "의무기록사"],
  "식품영양학과": ["영양사", "식품 연구원", "급식 관리자", "식품 MD", "식품 안전 관리자", "보건 교사", "식품 마케터"],
  "반려동물보건과": ["동물보건사", "수의 테크니션", "애견 훈련사", "반려동물 미용사", "동물원 사육사", "펫 케어 매니저"],
  "스포츠재활과": ["물리치료사", "스포츠 재활 트레이너", "운동처방사", "퍼스널 트레이너", "스포츠 팀 트레이너", "재활 코치"],
  "유아특수재활과": ["특수교사", "언어치료사", "작업치료사", "아동발달 전문가", "장애인 복지사", "보육교사"],
  "사회복지과": ["사회복지사", "사례 관리사", "노인복지 전문가", "아동복지 전문가", "장애인 복지사", "지역사회 복지 기획자"],
  "사회복지경영과": ["복지시설 운영 관리자", "사회복지 행정직", "비영리 단체 기획자", "사회적 기업 경영자", "후원 개발 담당자"],
  "유아교육과": ["유치원 교사", "어린이집 보육교사", "아동 상담사", "놀이치료사", "유아 교육 콘텐츠 기획자"],
  // 관광조리계열
  "항공서비스과": ["객실 승무원", "지상직 항공사 직원", "여행사 컨설턴트", "공항 운영 관리자", "항공사 마케터", "관광 MD"],
  "관광과": ["호텔 프론트 데스크", "관광 가이드", "여행 상품 기획자", "MICE 기획자", "관광 마케터", "컨벤션 플래너"],
  "호텔외식조리과": ["호텔 셰프", "레스토랑 셰프", "파티시에", "바리스타", "F&B 매니저", "식음료 운영 관리자", "케이터링 전문가"],
};

const companyTypes = [
  { id: "startup",    label: "스타트업",      desc: "빠른 적응·자기주도 중심" },
  { id: "smb",        label: "중소기업",      desc: "다재다능·실무 즉시 투입" },
  { id: "midsize",    label: "중견기업",      desc: "성장성·안정성 균형" },
  { id: "large",      label: "대기업·그룹사", desc: "체계·직무전문성 중심" },
  { id: "public",     label: "공기업·공공기관", desc: "규정 준수·공익 마인드" },
  { id: "foreign",    label: "외국계 기업",   desc: "글로벌 역량·영어 소통" },
];

const experienceLevels = [
  { id: "newcomer", label: "신입",      sub: "0년",     desc: "기초 역량·학습 의지·성장 가능성 중심 질문" },
  { id: "junior",   label: "주니어",    sub: "1~3년",   desc: "실무 경험·문제 해결 방식 중심 질문" },
  { id: "mid",      label: "미드레벨",  sub: "3~5년",   desc: "주도적 프로젝트 경험·기술 깊이 중심 질문" },
  { id: "senior",   label: "시니어",    sub: "5년 이상", desc: "리더십·아키텍처 설계·멘토링 역량 중심 질문" },
];


const interviewerStyles = [
  { id: "friendly",  label: "부드러운", desc: "편안하게 유도하는 스타일" },
  { id: "pressure",  label: "압박형",   desc: "날카로운 반론과 재질문" },
  { id: "professor", label: "교수형",   desc: "개념을 깊게 파고드는 스타일" },
  { id: "practical", label: "실무형",   desc: "실제 업무 연계 현실적 질문" },
];

function SectionTitle({ num, title, hint }: { num: string; title: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-[11px] font-bold text-[#4f52e8] bg-[#eef0fd] px-2 py-0.5 rounded-md">{num}</span>
      <h2 className="font-semibold text-[16px] text-[#0d1035]">{title}</h2>
      {hint && <span className="text-[12px] text-[#9ca3af]">{hint}</span>}
    </div>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const [dept, setDept] = useState("");
  const [style, setStyle] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [jobRoleInput, setJobRoleInput] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [showErrorToast, setShowErrorToast] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("questionGenerationError") === "true") {
      sessionStorage.removeItem("questionGenerationError");
      setShowErrorToast(true);
      const t = setTimeout(() => setShowErrorToast(false), 6000);
      return () => clearTimeout(t);
    }
  }, []);

  const deptRoles = dept ? (DEPT_ROLES[dept] ?? []) : [];

  const canProceed = !!dept && !!jobRole && !!companyType && !!experienceLevel;

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <StepNavbar />

      {/* 질문 생성 오류 토스트 */}
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${showErrorToast ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        <div className="flex items-center gap-3 bg-white border border-red-200 rounded-2xl shadow-lg px-5 py-3.5 min-w-[320px]">
          <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-[#0d1035]">질문 생성 중 오류가 발생했습니다</p>
            <p className="text-[11.5px] text-[#6b7280] mt-0.5">설정을 확인하고 다시 시도해주세요.</p>
          </div>
          <button onClick={() => setShowErrorToast(false)} className="text-[#c4c9d6] hover:text-[#6b7280] transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h1 className="text-[28px] font-bold text-[#0d1035] mb-2">면접 설정</h1>
          <p className="text-[14px] text-[#6b7280]">학과와 면접관 스타일을 고르면 AI가 맞춤 질문을 준비합니다.</p>
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
                  onClick={() => {
                    if (!d.enabled) return;
                    if (dept === d.name) { setDept(""); setJobRole(""); setJobRoleInput(""); }
                    else { setDept(d.name); setJobRole(""); setJobRoleInput(""); }
                  }}
                  className={`relative px-4 py-2 rounded-lg border text-[13px] font-medium transition-all ${
                    d.enabled
                      ? dept === d.name
                        ? "border-[#4f52e8] bg-[#eef0fd] text-[#4f52e8]"
                        : "border-[#e4e7ef] bg-white text-[#374151] hover:border-[#a5a7f3] hover:bg-[#f8f9fc]"
                      : "border-[#e4e7ef] bg-[#f8f9fc] text-[#c4c9d6] cursor-not-allowed"
                  }`}
                >
                  {d.name}
                  {!d.enabled && (
                    <span className="ml-1.5 text-[10px] text-[#d1d5db]">준비 중</span>
                  )}
                  {d.enabled && dept === d.name && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#4f52e8] bg-white rounded-md px-1.5 py-0.5 border border-[#c7d2fe]">
                      <IconCheck className="w-2.5 h-2.5" /> 선택됨
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Job Role */}
          <div className={`bg-white rounded-2xl border p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all ${
            dept ? "border-[#e4e7ef]" : "border-[#e4e7ef] opacity-50 pointer-events-none"
          }`}>
            <SectionTitle num="02" title="희망 직무" />
            {!dept ? (
              <p className="text-[13px] text-[#c4c9d6]">먼저 학과를 선택해주세요.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  {deptRoles.map((role) => (
                    <button
                      key={role}
                      onClick={() => {
                        if (jobRole === role) { setJobRole(""); setJobRoleInput(""); }
                        else { setJobRole(role); setJobRoleInput(role); }
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all ${
                        jobRole === role
                          ? "border-[#4f52e8] bg-[#eef0fd] text-[#4f52e8]"
                          : "border-[#e4e7ef] bg-white text-[#374151] hover:border-[#a5a7f3] hover:bg-[#f8f9fc]"
                      }`}
                    >
                      {role}
                      {jobRole === role && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#4f52e8] bg-white rounded-md px-1.5 py-0.5 border border-[#c7d2fe]">
                          <IconCheck className="w-2.5 h-2.5" /> 선택됨
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="직접 입력 (목록에 없으면 여기에 입력)"
                    value={jobRoleInput}
                    onChange={(e) => {
                      setJobRoleInput(e.target.value);
                      setJobRole(e.target.value.trim());
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#e4e7ef] text-[13px] text-[#374151] placeholder-[#c4c9d6] focus:outline-none focus:border-[#4f52e8] focus:ring-2 focus:ring-[#4f52e8]/10 transition-all bg-[#f8f9fc]"
                  />
                  {jobRoleInput && (
                    <button
                      onClick={() => { setJobRole(""); setJobRoleInput(""); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c4c9d6] hover:text-[#6b7280] text-[16px] leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Company Type */}
          <div className="bg-white rounded-2xl border border-[#e4e7ef] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <SectionTitle num="03" title="회사 유형" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {companyTypes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCompanyType(companyType === c.id ? "" : c.id)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    companyType === c.id
                      ? "border-[#4f52e8] bg-[#eef0fd]"
                      : "border-[#e4e7ef] bg-[#f8f9fc] hover:border-[#a5a7f3]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[14px] font-semibold ${companyType === c.id ? "text-[#4f52e8]" : "text-[#0d1035]"}`}>{c.label}</span>
                    {companyType === c.id && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#4f52e8] bg-white rounded-md px-1.5 py-0.5 border border-[#c7d2fe]">
                        <IconCheck className="w-2.5 h-2.5" /> 선택됨
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#9ca3af] leading-tight">{c.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Experience Level */}
          <div className="bg-white rounded-2xl border border-[#e4e7ef] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <SectionTitle num="04" title="경력" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {experienceLevels.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setExperienceLevel(experienceLevel === e.id ? "" : e.id)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    experienceLevel === e.id
                      ? "border-[#4f52e8] bg-[#eef0fd]"
                      : "border-[#e4e7ef] bg-[#f8f9fc] hover:border-[#a5a7f3]"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[14px] font-semibold ${experienceLevel === e.id ? "text-[#4f52e8]" : "text-[#0d1035]"}`}>{e.label}</span>
                    {experienceLevel === e.id && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#4f52e8] bg-white rounded-md px-1.5 py-0.5 border border-[#c7d2fe]">
                        <IconCheck className="w-2.5 h-2.5" /> 선택됨
                      </span>
                    )}
                  </div>
                  <div className={`text-[11px] font-medium mb-1 ${experienceLevel === e.id ? "text-[#818cf8]" : "text-[#c4c9d6]"}`}>
                    {e.sub}
                  </div>
                  <div className="text-[11px] text-[#9ca3af] leading-tight">{e.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div className="bg-white rounded-2xl border border-[#e4e7ef] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <SectionTitle num="05" title="면접관 스타일" hint="선택하지 않으면 랜덤으로 설정됩니다" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {interviewerStyles.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(style === s.id ? "" : s.id)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    style === s.id
                      ? "border-[#4f52e8] bg-[#eef0fd]"
                      : "border-[#e4e7ef] bg-[#f8f9fc] hover:border-[#a5a7f3]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[14px] font-semibold ${style === s.id ? "text-[#4f52e8]" : "text-[#0d1035]"}`}>{s.label}</span>
                    {style === s.id && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#4f52e8] bg-white rounded-md px-1.5 py-0.5 border border-[#c7d2fe]">
                        <IconCheck className="w-2.5 h-2.5" /> 선택됨
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#9ca3af] leading-tight">{s.desc}</div>
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
              <span className="text-[12px] text-[#9ca3af]">모든 항목을 선택해주세요</span>
            )}
            <button
              onClick={() => {
                if (!canProceed) return;
                sessionStorage.setItem("interviewSettings", JSON.stringify({
                  department: dept,
                  jobRole,
                  companyType,
                  experienceLevel,
                  interviewType: "mixed",
                  style: style || "random",
                }));
                router.push("/upload");
              }}
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
