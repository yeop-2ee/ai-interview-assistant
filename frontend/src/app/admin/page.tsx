"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { IconX } from "@/components/Icons";
import { authFetch } from "@/lib/auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

const DEPARTMENTS = [
  { name: "컴퓨터소프트웨어과", enabled: true },
  { name: "전자공학과", enabled: false },
  { name: "정보통신과", enabled: false },
  { name: "전기과", enabled: false },
  { name: "건축과", enabled: false },
  { name: "실내건축과", enabled: false },
  { name: "패션디자인비즈니스과", enabled: false },
  { name: "뷰티스타일리스트과", enabled: false },
  { name: "게임콘텐츠과", enabled: false },
  { name: "웹툰만화콘텐츠과", enabled: false },
  { name: "영상콘텐츠과", enabled: false },
  { name: "시각디자인과", enabled: false },
  { name: "K-POP과", enabled: false },
  { name: "유통물류과", enabled: false },
  { name: "경영학과", enabled: false },
  { name: "세무회계과", enabled: false },
  { name: "군사학과", enabled: false },
  { name: "경찰경호보안과", enabled: false },
  { name: "보건의료행정과", enabled: false },
  { name: "식품영양학과", enabled: false },
  { name: "반려동물보건과", enabled: false },
  { name: "스포츠재활과", enabled: false },
  { name: "유아특수재활과", enabled: false },
  { name: "사회복지과", enabled: false },
  { name: "사회복지경영과", enabled: false },
  { name: "유아교육과", enabled: false },
  { name: "항공서비스과", enabled: false },
  { name: "관광과", enabled: false },
  { name: "호텔외식조리과", enabled: false },
];
const SUBJECT_LIST = ["자료구조", "알고리즘", "운영체제", "데이터베이스", "네트워크", "웹프로그래밍", "Java", "C/C++", "Python", "기타"];

type KnowledgeEntry = { id: number; subject: string; content: string; registeredBy: string; createdAt: string };

type SurveyStats = {
  total: number;
  purposeMap: Record<string, number>;
  naturalnessMap: Record<number, number>;
  naturalnessAvg: number | null;
  feedbacks: { id: number; feedback: string | null; createdAt: string }[];
  daily: { date: string; count: number }[];
};

// 숫자 카운트업 애니메이션 카드
function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  const isNum = typeof value === "number";
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isNum) return;
    const target = value as number;
    const duration = 900;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplayed(Math.round(ease * target));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, isNum]);

  return (
    <div className="bg-white rounded-2xl border border-[#e4e7ef] px-4 sm:px-6 py-5 sm:py-6 flex flex-col gap-1 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{ background: `radial-gradient(circle at 80% 20%, ${accent ?? "#4f52e8"}, transparent 70%)` }} />
      <p className="text-[11px] sm:text-[11.5px] text-[#9ca3af] font-medium">{label}</p>
      <p className="text-[26px] sm:text-[32px] font-bold leading-none" style={{ color: accent ?? "#0d1035" }}>
        {isNum ? displayed.toLocaleString() : value}
      </p>
      {sub && <p className="text-[11px] sm:text-[11.5px] text-[#9ca3af] mt-0.5">{sub}</p>}
    </div>
  );
}

// 애니메이션 가로 바
function HBar({ label, count, total, color = "#4f52e8", delay = 0 }: { label: string; count: number; total: number; color?: string; delay?: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 80 + delay);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className="text-[11.5px] sm:text-[12.5px] text-[#374151] w-20 sm:w-28 flex-shrink-0 text-right font-medium leading-tight">{label}</span>
      <div className="flex-1 h-5 sm:h-6 bg-[#f3f4f6] rounded-lg overflow-hidden">
        <div className="h-full rounded-lg flex items-center transition-[width] duration-700 ease-out" style={{ width: `${w}%`, backgroundColor: color }}>
          {w >= 15 && <span className="text-[10px] sm:text-[11px] font-semibold text-white pl-2">{pct}%</span>}
        </div>
      </div>
      <span className="text-[12px] sm:text-[13px] font-bold text-[#0d1035] w-10 sm:w-12 flex-shrink-0 text-right">
        {count}<span className="text-[10px] sm:text-[11px] font-normal text-[#9ca3af]">건</span>
      </span>
    </div>
  );
}

// 도넛 차트
function DonutChart({ data, colors, total }: { data: { label: string; value: number }[]; colors: string[]; total: number }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t); }, []);

  const r = 52; const cx = 70; const cy = 70;
  const circ = 2 * Math.PI * r;
  let cumPct = 0;
  const segments = data.map((d, i) => {
    const pct = total > 0 ? d.value / total : 0;
    const len = animated ? pct * circ : 0;
    const gap = circ - len;
    const rotate = cumPct * 360 - 90;
    cumPct += pct;
    return { ...d, len, gap, rotate, color: colors[i % colors.length], pct: Math.round(pct * 100) };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
      <div className="relative flex-shrink-0">
        <svg width="140" height="140" viewBox="0 0 140 140">
          {total === 0 ? (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="18" />
          ) : (
            segments.map((s, i) => (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                stroke={s.color} strokeWidth="18"
                strokeDasharray={`${s.len} ${s.gap}`}
                transform={`rotate(${s.rotate} ${cx} ${cy})`}
                style={{ transition: `stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1) ${i * 0.12}s` }}
                strokeLinecap="round"
              />
            ))
          )}
          <text x={cx} y={cy - 7} textAnchor="middle" fontSize="22" fontWeight="800" fill="#0d1035">{total}</text>
          <text x={cx} y={cy + 11} textAnchor="middle" fontSize="11" fill="#9ca3af">총 응답</text>
        </svg>
      </div>
      <div className="flex flex-col gap-2 w-full">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-[12.5px] text-[#374151] flex-1 truncate">{s.label}</span>
            <span className="text-[12px] font-bold text-[#0d1035]">{s.value}<span className="font-normal text-[#9ca3af] text-[10.5px]">건</span></span>
            <span className="text-[11px] font-semibold rounded-full px-1.5 py-0.5 text-white" style={{ backgroundColor: s.color }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 라인 차트
function LineChart({ data, maxVal }: { data: { date: string; count: number }[]; maxVal: number }) {
  const [animated, setAnimated] = useState(false);
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLen, setPathLen] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 150); return () => clearTimeout(t); }, []);
  useEffect(() => { if (pathRef.current) setPathLen(pathRef.current.getTotalLength()); }, [data]);

  if (data.length === 0) return null;
  const W = 560; const H = 110;
  const padL = 28; const padR = 10; const padT = 10; const padB = 24;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const n = data.length;

  const px = (i: number) => padL + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);
  const py = (v: number) => padT + chartH - (maxVal > 0 ? (v / maxVal) * chartH : 0);

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${px(i).toFixed(1)} ${py(d.count).toFixed(1)}`).join(" ");
  const areaPath = linePath + ` L ${px(n - 1).toFixed(1)} ${(padT + chartH).toFixed(1)} L ${px(0).toFixed(1)} ${(padT + chartH).toFixed(1)} Z`;

  const yTicks = [0, Math.ceil(maxVal / 2), maxVal];
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="relative w-full" style={{ height: H }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="lgArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f52e8" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#4f52e8" stopOpacity="0" />
          </linearGradient>
          <clipPath id="lineClip">
            <rect x={padL} y={0} width={animated ? chartW + padR : 0} height={H}
              style={{ transition: "width 1.2s cubic-bezier(.4,0,.2,1)" }} />
          </clipPath>
        </defs>

        {/* y축 점선 */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={py(t)} y2={py(t)} stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4 3" />
            <text x={padL - 4} y={py(t) + 4} textAnchor="end" fontSize="9" fill="#c4c9d6">{t}</text>
          </g>
        ))}

        {/* 영역 */}
        <path d={areaPath} fill="url(#lgArea)" clipPath="url(#lineClip)" />

        {/* 라인 */}
        <path ref={pathRef} d={linePath} fill="none" stroke="#4f52e8" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" clipPath="url(#lineClip)" />

        {/* 데이터 포인트 */}
        {data.map((d, i) => (
          <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: "default" }}>
            <circle cx={px(i)} cy={py(d.count)} r="8" fill="transparent" />
            {d.count > 0 && (
              <circle cx={px(i)} cy={py(d.count)} r={hovered === i ? 5 : 3.5}
                fill={hovered === i ? "#fff" : "#4f52e8"}
                stroke="#4f52e8" strokeWidth="2"
                style={{ transition: "r 0.15s, fill 0.15s", opacity: animated ? 1 : 0 }}
              />
            )}
            {/* 툴팁 */}
            {hovered === i && (
              <g>
                <rect x={px(i) - 28} y={py(d.count) - 30} width="56" height="20" rx="6" fill="#0d1035" />
                <text x={px(i)} y={py(d.count) - 16} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#fff">
                  {d.date.slice(5)} · {d.count}건
                </text>
              </g>
            )}
          </g>
        ))}

        {/* x축 날짜 */}
        {[0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((n * 3) / 4), n - 1].map((i) => data[i] && (
          <text key={i} x={px(i)} y={H - 4} textAnchor="middle" fontSize="9" fill="#c4c9d6">{data[i].date.slice(5)}</text>
        ))}
      </svg>
    </div>
  );
}

const TABS = [
  {
    key: "knowledge" as const, label: "전공지식 관리",
    icon: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
  },
  {
    key: "users" as const, label: "사용자 관리",
    icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  },
  {
    key: "survey" as const, label: "설문 통계",
    icon: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  },
];

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"knowledge" | "users" | "survey">("knowledge");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  // knowledge tab state
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [content, setContent] = useState("");
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [adding, setAdding] = useState(false);

  // survey tab state
  const [surveyStats, setSurveyStats] = useState<SurveyStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // users tab state
  type UserRow = { id: number; name: string; email: string; role: string; createdAt: string; reportCount: number };
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    const email = localStorage.getItem("userEmail");
    if (!email || role !== "admin") { router.replace("/"); return; }
    setAdminName(localStorage.getItem("userName") ?? "관리자");
    setAdminEmail(email);
  }, [router]);

  useEffect(() => {
    if (!selectedDept) { setEntries([]); return; }
    setLoadingEntries(true);
    authFetch(`${BACKEND_URL}/knowledge?department=${encodeURIComponent(selectedDept)}`)
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoadingEntries(false));
  }, [selectedDept]);

  const fetchSurveyStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await authFetch(`${BACKEND_URL}/admin/surveys`);
      const data = await res.json();
      setSurveyStats(data);
    } catch { /* ignore */ }
    finally { setLoadingStats(false); }
  }, []);

  useEffect(() => {
    if (tab === "survey" && !surveyStats) fetchSurveyStats();
  }, [tab, surveyStats, fetchSurveyStats]);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await authFetch(`${BACKEND_URL}/admin/users`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setLoadingUsers(false); }
  }, []);

  useEffect(() => {
    if (tab === "users" && users.length === 0) fetchUsers();
  }, [tab, users.length, fetchUsers]);

  const handleRoleChange = async (id: number, newRole: string) => {
    try {
      const res = await authFetch(`${BACKEND_URL}/admin/users/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) return;
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
    } catch { /* ignore */ }
  };

  const handleDeleteUser = async (id: number, name: string) => {
    if (!confirm(`"${name}" 계정을 삭제하시겠습니까?\n연관된 면접 리포트도 함께 삭제됩니다.`)) return;
    try {
      await authFetch(`${BACKEND_URL}/admin/users/${id}`, { method: "DELETE" });
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch { /* ignore */ }
  };

  const handleAdd = async () => {
    if (!selectedDept || !selectedSubject || !content.trim() || adding) return;
    setAdding(true);
    try {
      const res = await authFetch(`${BACKEND_URL}/knowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department: selectedDept, subject: selectedSubject, content: content.trim(), registeredBy: adminName, email: adminEmail }),
      });
      if (!res.ok) return;
      const entry = await res.json();
      setEntries((prev) => [...prev, entry]);
      setContent(""); setSelectedSubject("");
    } catch { /* ignore */ }
    finally { setAdding(false); }
  };

  const handleRemove = async (id: number) => {
    await authFetch(`${BACKEND_URL}/knowledge/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail }),
    });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const purposeColors = ["#4f52e8", "#7c3aed", "#059669", "#d97706"];
  const purposeKeys = Object.keys(surveyStats?.purposeMap ?? {});
  const dailyMax = Math.max(...(surveyStats?.daily.map(d => d.count) ?? [1]), 1);

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-[#e4e7ef] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => router.push("/")} className="font-semibold text-[14px] sm:text-[15px] tracking-tight text-[#0d1035] hover:opacity-70 transition-opacity">
              AI기반 맞춤 면접 도우미
            </button>
            <span className="text-[#d1d5db]">/</span>
            <span className="text-[12px] sm:text-[13px] text-[#6b7280]">관리자</span>
          </div>
          <button onClick={() => router.push("/")} className="text-[13px] text-[#6b7280] hover:text-[#374151] px-3 py-1.5 rounded-lg hover:bg-[#f0f2f8] transition-all">
            나가기
          </button>
        </div>
      </header>

      {/* 모바일 탭 바 */}
      <div className="lg:hidden bg-white border-b border-[#e4e7ef] sticky top-[60px] z-40">
        <div className="flex px-4 gap-1 overflow-x-auto py-2" style={{ scrollbarWidth: "none" }}>
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                tab === key ? "bg-[#eef0fd] text-[#4f52e8] font-semibold" : "text-[#6b7280] hover:bg-[#f0f2f8]"
              }`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                {icon}
              </svg>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-8 gap-8">
        {/* 사이드바 (데스크톱만) */}
        <aside className="w-52 flex-shrink-0 hidden lg:block">
          <nav className="space-y-0.5">
            <p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-widest px-3 mb-3">관리 메뉴</p>
            {TABS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-left transition-colors ${
                  tab === key ? "bg-[#eef0fd] text-[#4f52e8] font-semibold" : "text-[#6b7280] hover:bg-[#f0f2f8]"
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  {icon}
                </svg>
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 min-w-0 space-y-4 sm:space-y-5">

          {/* ── 전공지식 관리 탭 ── */}
          {tab === "knowledge" && (
            <>
              <div>
                <h1 className="text-[20px] sm:text-[22px] font-bold text-[#0d1035] tracking-tight">전공지식 관리</h1>
                <p className="text-[12px] sm:text-[13px] text-[#9ca3af] mt-0.5">학과별 전공지식을 등록하고 면접 질문 생성에 활용합니다.</p>
              </div>

              {/* 학과 선택 */}
              <div className="bg-white rounded-2xl border border-[#e4e7ef] overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-[#f0f2f8] flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#0d1035] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">1</span>
                  <span className="text-[14px] font-semibold text-[#0d1035]">학과 선택</span>
                  {selectedDept && <span className="ml-auto text-[12px] font-medium text-[#4f52e8] bg-[#eef0fd] px-2.5 py-0.5 rounded-full">{selectedDept}</span>}
                </div>
                <div className="px-4 sm:px-6 py-4 sm:py-5 flex flex-wrap gap-2">
                  {DEPARTMENTS.map((dept) => (
                    <button key={dept.name} onClick={() => dept.enabled && setSelectedDept(selectedDept === dept.name ? "" : dept.name)} disabled={!dept.enabled}
                      className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[12px] sm:text-[13px] font-medium border transition-all ${
                        !dept.enabled ? "bg-[#f8f9fc] text-[#c4c9d6] border-[#f0f2f8] cursor-not-allowed"
                        : selectedDept === dept.name ? "bg-[#0d1035] text-white border-[#0d1035]"
                        : "bg-white text-[#374151] border-[#e4e7ef] hover:border-[#0d1035]/30 hover:text-[#0d1035]"
                      }`}>
                      {dept.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 전공지식 입력 */}
              <div className={`bg-white rounded-2xl border border-[#e4e7ef] overflow-hidden transition-opacity ${!selectedDept ? "opacity-40 pointer-events-none" : ""}`}>
                <div className="px-4 sm:px-6 py-4 border-b border-[#f0f2f8] flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#0d1035] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">2</span>
                  <span className="text-[14px] font-semibold text-[#0d1035]">전공지식 입력</span>
                </div>
                <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
                  <div>
                    <p className="text-[12px] font-medium text-[#6b7280] mb-2.5">과목</p>
                    <div className="flex flex-wrap gap-2">
                      {SUBJECT_LIST.map((subj) => (
                        <button key={subj} onClick={() => setSelectedSubject(selectedSubject === subj ? "" : subj)}
                          className={`px-3 py-1.5 rounded-lg text-[12px] sm:text-[13px] font-medium border transition-all ${
                            selectedSubject === subj ? "bg-[#4f52e8] text-white border-[#4f52e8]"
                            : "bg-white text-[#374151] border-[#e4e7ef] hover:border-[#4f52e8]/40 hover:text-[#4f52e8]"
                          }`}>
                          {subj}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-[#6b7280] mb-2.5">내용</p>
                    <textarea value={content} onChange={(e) => setContent(e.target.value)}
                      placeholder="개념 설명, 예상 질문, 핵심 키워드 등을 입력하세요." rows={4}
                      className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e4e7ef] rounded-xl text-[13px] text-[#0d1035] placeholder-[#c4c9d6] focus:outline-none focus:border-[#4f52e8] focus:bg-white transition-all resize-none"
                    />
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-[11px] text-[#9ca3af]">{content.length}자</p>
                      <button onClick={handleAdd} disabled={!selectedSubject || !content.trim() || adding}
                        className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                          selectedSubject && content.trim() && !adding
                            ? "bg-[#4f52e8] hover:bg-[#3e41d4] text-white shadow-sm"
                            : "bg-[#f0f2f8] text-[#c4c9d6] cursor-not-allowed"
                        }`}>
                        {adding ? "등록 중..." : "목록에 추가"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 등록 목록 */}
              <div className={`bg-white rounded-2xl border border-[#e4e7ef] overflow-hidden transition-opacity ${!selectedDept ? "opacity-40 pointer-events-none" : ""}`}>
                <div className="px-4 sm:px-6 py-4 border-b border-[#f0f2f8] flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#0d1035] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">3</span>
                  <span className="text-[14px] font-semibold text-[#0d1035]">등록 목록</span>
                  {entries.length > 0 && <span className="text-[12px] text-[#9ca3af]">{entries.length}개</span>}
                </div>
                <div className="divide-y divide-[#f8f9fc] overflow-y-auto" style={{ maxHeight: "480px" }}>
                  {loadingEntries ? (
                    <div className="px-6 py-8 text-center text-[13px] text-[#c4c9d6]">불러오는 중...</div>
                  ) : entries.length === 0 ? (
                    <div className="px-6 py-8 text-center text-[13px] text-[#c4c9d6]">등록된 항목이 없습니다.</div>
                  ) : entries.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 px-4 sm:px-6 py-4 hover:bg-[#fafbff] transition-colors">
                      <span className="mt-0.5 text-[11px] font-semibold px-2 py-0.5 bg-[#eef0fd] text-[#4f52e8] rounded-md flex-shrink-0">{entry.subject}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[#374151] leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                        <p className="text-[11px] text-[#c4c9d6] mt-1">
                          {entry.registeredBy || "관리자"} · {new Date(entry.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <button onClick={() => handleRemove(entry.id)}
                        className="flex-shrink-0 w-7 h-7 rounded-lg hover:bg-rose-50 text-[#c4c9d6] hover:text-rose-400 flex items-center justify-center transition-colors">
                        <IconX className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── 사용자 관리 탭 ── */}
          {tab === "users" && (
            <>
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-[20px] sm:text-[22px] font-bold text-[#0d1035] tracking-tight">사용자 관리</h1>
                  <p className="text-[12px] sm:text-[13px] text-[#9ca3af] mt-0.5">가입된 사용자 목록을 확인하고 역할을 관리합니다.</p>
                </div>
                <button onClick={fetchUsers} disabled={loadingUsers}
                  className="flex-shrink-0 flex items-center gap-1.5 text-[12px] text-[#6b7280] hover:text-[#374151] px-3 py-1.5 rounded-lg border border-[#e4e7ef] hover:bg-[#f8f9fc] transition-all disabled:opacity-50">
                  <svg className={`w-3.5 h-3.5 ${loadingUsers ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                  새로고침
                </button>
              </div>

              {/* 요약 카드 */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <StatCard label="전체 사용자" value={users.length} sub="가입 계정 수" />
                <StatCard label="일반 사용자" value={users.filter(u => u.role === "user").length} sub="role: user" />
                <StatCard label="관리자" value={users.filter(u => u.role === "admin").length} sub="role: admin" />
              </div>

              {/* 검색 */}
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c4c9d6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="이름 또는 이메일로 검색..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#e4e7ef] rounded-xl text-[13px] text-[#0d1035] placeholder-[#c4c9d6] focus:outline-none focus:border-[#4f52e8] transition-all"
                />
              </div>

              {loadingUsers ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 rounded-full border-2 border-[#4f52e8]/20 border-t-[#4f52e8] animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#e4e7ef] py-16 text-center text-[13px] text-[#c4c9d6]">등록된 사용자가 없습니다.</div>
              ) : (
                <>
                  {/* 데스크톱 테이블 */}
                  <div className="hidden sm:block bg-white rounded-2xl border border-[#e4e7ef] overflow-hidden">
                    <div className="grid grid-cols-[1fr_1fr_80px_60px_80px] gap-0 px-6 py-3 border-b border-[#f0f2f8] text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">
                      <span>이름 / 이메일</span>
                      <span>가입일</span>
                      <span className="text-center">리포트</span>
                      <span className="text-center">역할</span>
                      <span />
                    </div>
                    <div className="divide-y divide-[#f8f9fc] max-h-[520px] overflow-y-auto">
                      {filteredUsers.map(u => (
                        <div key={u.id} className="grid grid-cols-[1fr_1fr_80px_60px_80px] items-center gap-0 px-6 py-4 hover:bg-[#fafbff] transition-colors group">
                          <div>
                            <p className="text-[13px] font-semibold text-[#0d1035]">{u.name}</p>
                            <p className="text-[11.5px] text-[#9ca3af] mt-0.5">{u.email}</p>
                          </div>
                          <span className="text-[12px] text-[#6b7280]">
                            {new Date(u.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                          <span className="text-[13px] font-semibold text-[#374151] text-center">{u.reportCount}</span>
                          <div className="flex justify-center">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              u.role === "admin" ? "bg-[#eef0fd] text-[#4f52e8]" : "bg-[#f3f4f6] text-[#6b7280]"
                            }`}>
                              {u.role === "admin" ? "관리자" : "사용자"}
                            </span>
                          </div>
                          <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleRoleChange(u.id, u.role === "admin" ? "user" : "admin")}
                              title={u.role === "admin" ? "사용자로 변경" : "관리자로 변경"}
                              className="w-7 h-7 rounded-lg hover:bg-[#eef0fd] text-[#c4c9d6] hover:text-[#4f52e8] flex items-center justify-center transition-colors">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="17 11 21 7 17 3"/><line x1="21" y1="7" x2="9" y2="7"/>
                                <polyline points="7 21 3 17 7 13"/><line x1="3" y1="17" x2="15" y2="17"/>
                              </svg>
                            </button>
                            <button onClick={() => handleDeleteUser(u.id, u.name)} title="계정 삭제"
                              className="w-7 h-7 rounded-lg hover:bg-rose-50 text-[#c4c9d6] hover:text-rose-400 flex items-center justify-center transition-colors">
                              <IconX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 모바일 카드 리스트 */}
                  <div className="sm:hidden space-y-2">
                    {filteredUsers.map(u => (
                      <div key={u.id} className="bg-white rounded-2xl border border-[#e4e7ef] px-4 py-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-[#eef0fd] text-[#4f52e8] flex items-center justify-center text-[14px] font-bold flex-shrink-0">
                              {u.name.slice(0, 1)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[14px] font-semibold text-[#0d1035] truncate">{u.name}</p>
                              <p className="text-[11.5px] text-[#9ca3af] truncate">{u.email}</p>
                            </div>
                          </div>
                          <span className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            u.role === "admin" ? "bg-[#eef0fd] text-[#4f52e8]" : "bg-[#f3f4f6] text-[#6b7280]"
                          }`}>
                            {u.role === "admin" ? "관리자" : "사용자"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-[11.5px] text-[#9ca3af]">
                            <span>{new Date(u.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} 가입</span>
                            <span className="w-px h-3 bg-[#e4e7ef]" />
                            <span>리포트 <span className="font-semibold text-[#374151]">{u.reportCount}</span>개</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => handleRoleChange(u.id, u.role === "admin" ? "user" : "admin")}
                              title={u.role === "admin" ? "사용자로 변경" : "관리자로 변경"}
                              className="w-8 h-8 rounded-lg bg-[#f8f9fc] hover:bg-[#eef0fd] text-[#9ca3af] hover:text-[#4f52e8] flex items-center justify-center transition-colors">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="17 11 21 7 17 3"/><line x1="21" y1="7" x2="9" y2="7"/>
                                <polyline points="7 21 3 17 7 13"/><line x1="3" y1="17" x2="15" y2="17"/>
                              </svg>
                            </button>
                            <button onClick={() => handleDeleteUser(u.id, u.name)}
                              className="w-8 h-8 rounded-lg bg-[#f8f9fc] hover:bg-rose-50 text-[#9ca3af] hover:text-rose-400 flex items-center justify-center transition-colors">
                              <IconX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── 설문 통계 탭 ── */}
          {tab === "survey" && (
            <>
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-[20px] sm:text-[22px] font-bold text-[#0d1035] tracking-tight">설문 통계</h1>
                  <p className="text-[12px] sm:text-[13px] text-[#9ca3af] mt-0.5">면접 후 수집된 사용자 설문 응답 현황입니다.</p>
                </div>
                <button onClick={fetchSurveyStats} disabled={loadingStats}
                  className="flex-shrink-0 flex items-center gap-1.5 text-[12px] text-[#6b7280] hover:text-[#374151] px-3 py-1.5 rounded-lg border border-[#e4e7ef] hover:bg-[#f8f9fc] transition-all disabled:opacity-50">
                  <svg className={`w-3.5 h-3.5 ${loadingStats ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                  새로고침
                </button>
              </div>

              {loadingStats ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 rounded-full border-2 border-[#4f52e8]/20 border-t-[#4f52e8] animate-spin" />
                </div>
              ) : !surveyStats ? (
                <div className="py-20 text-center text-[13px] text-[#9ca3af]">데이터를 불러오지 못했습니다.</div>
              ) : (
                <>
                  {/* 요약 카드 */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <StatCard label="총 설문 응답" value={surveyStats.total} sub="누적 응답 수" accent="#4f52e8" />
                    <StatCard
                      label="질문 만족도 평균"
                      value={surveyStats.naturalnessAvg !== null ? `${surveyStats.naturalnessAvg}점` : "-"}
                      sub="5점 만점"
                      accent="#059669"
                    />
                    <StatCard label="개선 의견" value={surveyStats.feedbacks.length} sub="텍스트 피드백 수" accent="#7c3aed" />
                  </div>

                  {/* 차트 그리드 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    {/* 면접 목적 — 도넛 차트 */}
                    <div className="bg-white rounded-2xl border border-[#e4e7ef] p-5 sm:p-6">
                      <h2 className="text-[14px] font-semibold text-[#0d1035] mb-0.5">면접 목적</h2>
                      <p className="text-[11.5px] text-[#9ca3af] mb-5">응답자 목적 분포</p>
                      {purposeKeys.length === 0 ? (
                        <p className="text-[13px] text-[#c4c9d6] text-center py-8">응답 데이터 없음</p>
                      ) : (
                        <DonutChart
                          data={purposeKeys.map((k) => ({ label: k, value: surveyStats.purposeMap[k] }))}
                          colors={purposeColors}
                          total={surveyStats.total}
                        />
                      )}
                    </div>

                    {/* 질문 만족도 분포 */}
                    <div className="bg-white rounded-2xl border border-[#e4e7ef] p-5 sm:p-6">
                      <h2 className="text-[14px] font-semibold text-[#0d1035] mb-0.5">면접 질문 만족도</h2>
                      <p className="text-[11.5px] text-[#9ca3af] mb-5">1점 = 전혀 도움 안됨 · 5점 = 매우 도움됨</p>
                      <div className="space-y-3">
                        {[5, 4, 3, 2, 1].map((score, idx) => (
                          <HBar
                            key={score}
                            label={`${"★".repeat(score)}${"☆".repeat(5 - score)}`}
                            count={surveyStats.naturalnessMap[score] ?? 0}
                            total={Object.values(surveyStats.naturalnessMap).reduce((a, b) => a + b, 0)}
                            color={score >= 4 ? "#059669" : score === 3 ? "#d97706" : "#ef4444"}
                            delay={idx * 80}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 일별 응답 추이 — 라인 차트 */}
                  <div className="bg-white rounded-2xl border border-[#e4e7ef] p-5 sm:p-6">
                    <div className="flex items-start sm:items-center justify-between gap-2 mb-5">
                      <div>
                        <h2 className="text-[14px] font-semibold text-[#0d1035]">일별 응답 추이</h2>
                        <p className="text-[11.5px] text-[#9ca3af] mt-0.5">최근 30일 · 총 {surveyStats.total}건</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-[#9ca3af]">
                        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                          <circle cx="6" cy="6" r="5" stroke="#4f52e8" strokeWidth="1.5"/>
                          <text x="6" y="9" textAnchor="middle" fontSize="7" fill="#4f52e8" fontWeight="bold">i</text>
                        </svg>
                        <span className="hidden sm:inline">점 위에 마우스를 올리면 상세 확인</span>
                        <span className="text-[#4f52e8] font-semibold">최대 {dailyMax}건/일</span>
                      </div>
                    </div>
                    <LineChart data={surveyStats.daily} maxVal={dailyMax} />
                  </div>

                  {/* 개선 의견 목록 */}
                  <div className="bg-white rounded-2xl border border-[#e4e7ef] overflow-hidden">
                    <div className="px-4 sm:px-6 py-4 border-b border-[#f0f2f8] flex items-center justify-between">
                      <div>
                        <h2 className="text-[14px] font-semibold text-[#0d1035]">최근 개선 의견</h2>
                        <p className="text-[11.5px] text-[#9ca3af] mt-0.5">텍스트로 남긴 피드백</p>
                      </div>
                      <span className="text-[12px] font-semibold text-[#4f52e8] bg-[#eef0fd] px-2.5 py-0.5 rounded-full">{surveyStats.feedbacks.length}개</span>
                    </div>
                    {surveyStats.feedbacks.length === 0 ? (
                      <div className="px-6 py-10 text-center text-[13px] text-[#c4c9d6]">아직 개선 의견이 없습니다.</div>
                    ) : (
                      <div className="divide-y divide-[#f8f9fc] max-h-[400px] overflow-y-auto">
                        {surveyStats.feedbacks.map((f, i) => (
                          <div key={f.id} className="px-4 sm:px-6 py-4 flex gap-3 sm:gap-4"
                            style={{ animation: `fadeSlideIn 0.35s ease both`, animationDelay: `${i * 40}ms` }}>
                            <span className="text-[11px] font-bold text-white bg-[#4f52e8] w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px]">{i + 1}</span>
                            <div className="flex-1">
                              <p className="text-[13px] text-[#374151] leading-relaxed">{f.feedback}</p>
                              <p className="text-[11px] text-[#c4c9d6] mt-1.5">
                                {new Date(f.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

        </main>
      </div>
    </div>
  );
}
