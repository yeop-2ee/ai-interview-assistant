"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { IconX } from "@/components/Icons";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

const DEPARTMENTS = [
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

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#e4e7ef] px-6 py-5">
      <p className="text-[11.5px] text-[#9ca3af] mb-1">{label}</p>
      <p className="text-[28px] font-bold text-[#0d1035] leading-none">{value}</p>
      {sub && <p className="text-[11.5px] text-[#9ca3af] mt-1">{sub}</p>}
    </div>
  );
}

function HBar({ label, count, total, color = "#4f52e8" }: { label: string; count: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12.5px] text-[#374151] w-32 flex-shrink-0 text-right font-medium">{label}</span>
      <div className="flex-1 h-6 bg-[#f3f4f6] rounded-lg overflow-hidden relative">
        <div className="h-full rounded-lg transition-all duration-500 flex items-center" style={{ width: `${pct}%`, backgroundColor: color }}>
          {pct >= 12 && <span className="text-[11px] font-semibold text-white pl-2.5">{pct}%</span>}
        </div>
      </div>
      <span className="text-[13px] font-bold text-[#0d1035] w-12 flex-shrink-0 text-right">{count}<span className="text-[11px] font-normal text-[#9ca3af]">건</span></span>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"knowledge" | "survey" | "users">("knowledge");
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
    fetch(`${BACKEND_URL}/knowledge?department=${encodeURIComponent(selectedDept)}`)
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoadingEntries(false));
  }, [selectedDept]);

  const fetchSurveyStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${BACKEND_URL}/admin/surveys`);
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
      const res = await fetch(`${BACKEND_URL}/admin/users`);
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
      const res = await fetch(`${BACKEND_URL}/admin/users/${id}/role`, {
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
      await fetch(`${BACKEND_URL}/admin/users/${id}`, { method: "DELETE" });
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch { /* ignore */ }
  };

  const handleAdd = async () => {
    if (!selectedDept || !selectedSubject || !content.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch(`${BACKEND_URL}/knowledge`, {
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
    await fetch(`${BACKEND_URL}/knowledge/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail }),
    });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const purposeColors = ["#4f52e8", "#7c3aed", "#059669", "#d97706"];
  const purposeKeys = Object.keys(surveyStats?.purposeMap ?? {});
  const dailyMax = Math.max(...(surveyStats?.daily.map(d => d.count) ?? [1]), 1);

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-[#e4e7ef] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="font-semibold text-[15px] tracking-tight text-[#0d1035] hover:opacity-70 transition-opacity">
              AI기반 맞춤 면접 도우미
            </button>
            <span className="text-[#d1d5db]">/</span>
            <span className="text-[13px] text-[#6b7280]">관리자</span>
          </div>
          <button onClick={() => router.push("/")} className="text-[13px] text-[#6b7280] hover:text-[#374151] px-3 py-1.5 rounded-lg hover:bg-[#f0f2f8] transition-all">
            나가기
          </button>
        </div>
      </header>

      <div className="flex flex-1 max-w-6xl mx-auto w-full px-6 py-8 gap-8">
        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 hidden lg:block">
          <nav className="space-y-0.5">
            <p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-widest px-3 mb-3">관리 메뉴</p>
            {[
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
            ].map(({ key, label, icon }) => (
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

        {/* Main */}
        <main className="flex-1 min-w-0 space-y-5">

          {/* ── 전공지식 관리 탭 ── */}
          {tab === "knowledge" && (
            <>
              <div>
                <h1 className="text-[22px] font-bold text-[#0d1035] tracking-tight">전공지식 관리</h1>
                <p className="text-[13px] text-[#9ca3af] mt-0.5">학과별 전공지식을 등록하고 면접 질문 생성에 활용합니다.</p>
              </div>

              {/* 학과 선택 */}
              <div className="bg-white rounded-2xl border border-[#e4e7ef] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#f0f2f8] flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#0d1035] text-white text-[10px] font-bold flex items-center justify-center">1</span>
                  <span className="text-[14px] font-semibold text-[#0d1035]">학과 선택</span>
                  {selectedDept && <span className="ml-auto text-[12px] font-medium text-[#4f52e8] bg-[#eef0fd] px-2.5 py-0.5 rounded-full">{selectedDept}</span>}
                </div>
                <div className="px-6 py-5 flex flex-wrap gap-2">
                  {DEPARTMENTS.map((dept) => (
                    <button key={dept.name} onClick={() => dept.enabled && setSelectedDept(selectedDept === dept.name ? "" : dept.name)} disabled={!dept.enabled}
                      className={`px-3.5 py-2 rounded-xl text-[13px] font-medium border transition-all ${
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
                <div className="px-6 py-4 border-b border-[#f0f2f8] flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#0d1035] text-white text-[10px] font-bold flex items-center justify-center">2</span>
                  <span className="text-[14px] font-semibold text-[#0d1035]">전공지식 입력</span>
                </div>
                <div className="px-6 py-5 space-y-5">
                  <div>
                    <p className="text-[12px] font-medium text-[#6b7280] mb-2.5">과목</p>
                    <div className="flex flex-wrap gap-2">
                      {SUBJECT_LIST.map((subj) => (
                        <button key={subj} onClick={() => setSelectedSubject(selectedSubject === subj ? "" : subj)}
                          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
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
                <div className="px-6 py-4 border-b border-[#f0f2f8] flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#0d1035] text-white text-[10px] font-bold flex items-center justify-center">3</span>
                  <span className="text-[14px] font-semibold text-[#0d1035]">등록 목록</span>
                  {entries.length > 0 && <span className="text-[12px] text-[#9ca3af]">{entries.length}개</span>}
                </div>
                <div className="divide-y divide-[#f8f9fc] overflow-y-auto" style={{ maxHeight: "480px" }}>
                  {loadingEntries ? (
                    <div className="px-6 py-8 text-center text-[13px] text-[#c4c9d6]">불러오는 중...</div>
                  ) : entries.length === 0 ? (
                    <div className="px-6 py-8 text-center text-[13px] text-[#c4c9d6]">등록된 항목이 없습니다.</div>
                  ) : entries.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-4 px-6 py-4 hover:bg-[#fafbff] transition-colors group">
                      <span className="mt-0.5 text-[11px] font-semibold px-2 py-0.5 bg-[#eef0fd] text-[#4f52e8] rounded-md flex-shrink-0">{entry.subject}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[#374151] leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                        <p className="text-[11px] text-[#c4c9d6] mt-1">
                          {entry.registeredBy || "관리자"} · {new Date(entry.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <button onClick={() => handleRemove(entry.id)}
                        className="flex-shrink-0 w-6 h-6 rounded-lg hover:bg-rose-50 text-[#c4c9d6] hover:text-rose-400 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100">
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
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[22px] font-bold text-[#0d1035] tracking-tight">사용자 관리</h1>
                  <p className="text-[13px] text-[#9ca3af] mt-0.5">가입된 사용자 목록을 확인하고 역할을 관리합니다.</p>
                </div>
                <button onClick={fetchUsers} disabled={loadingUsers}
                  className="flex items-center gap-1.5 text-[12px] text-[#6b7280] hover:text-[#374151] px-3 py-1.5 rounded-lg border border-[#e4e7ef] hover:bg-[#f8f9fc] transition-all disabled:opacity-50">
                  <svg className={`w-3.5 h-3.5 ${loadingUsers ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                  새로고침
                </button>
              </div>

              {/* 요약 카드 */}
              <div className="grid grid-cols-3 gap-4">
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

              {/* 사용자 테이블 */}
              <div className="bg-white rounded-2xl border border-[#e4e7ef] overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_80px_60px_80px] gap-0 px-6 py-3 border-b border-[#f0f2f8] text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">
                  <span>이름 / 이메일</span>
                  <span>가입일</span>
                  <span className="text-center">리포트</span>
                  <span className="text-center">역할</span>
                  <span />
                </div>

                {loadingUsers ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 rounded-full border-2 border-[#4f52e8]/20 border-t-[#4f52e8] animate-spin" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="py-16 text-center text-[13px] text-[#c4c9d6]">등록된 사용자가 없습니다.</div>
                ) : (
                  <div className="divide-y divide-[#f8f9fc] max-h-[520px] overflow-y-auto">
                    {users
                      .filter(u =>
                        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.email.toLowerCase().includes(userSearch.toLowerCase())
                      )
                      .map(u => (
                        <div key={u.id} className="grid grid-cols-[1fr_1fr_80px_60px_80px] items-center gap-0 px-6 py-4 hover:bg-[#fafbff] transition-colors group">
                          {/* 이름 + 이메일 */}
                          <div>
                            <p className="text-[13px] font-semibold text-[#0d1035]">{u.name}</p>
                            <p className="text-[11.5px] text-[#9ca3af] mt-0.5">{u.email}</p>
                          </div>
                          {/* 가입일 */}
                          <span className="text-[12px] text-[#6b7280]">
                            {new Date(u.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                          {/* 리포트 수 */}
                          <span className="text-[13px] font-semibold text-[#374151] text-center">{u.reportCount}</span>
                          {/* 역할 배지 */}
                          <div className="flex justify-center">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              u.role === "admin" ? "bg-[#eef0fd] text-[#4f52e8]" : "bg-[#f3f4f6] text-[#6b7280]"
                            }`}>
                              {u.role === "admin" ? "관리자" : "사용자"}
                            </span>
                          </div>
                          {/* 액션 버튼 */}
                          <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleRoleChange(u.id, u.role === "admin" ? "user" : "admin")}
                              title={u.role === "admin" ? "사용자로 변경" : "관리자로 변경"}
                              className="w-7 h-7 rounded-lg hover:bg-[#eef0fd] text-[#c4c9d6] hover:text-[#4f52e8] flex items-center justify-center transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="17 11 21 7 17 3"/><line x1="21" y1="7" x2="9" y2="7"/>
                                <polyline points="7 21 3 17 7 13"/><line x1="3" y1="17" x2="15" y2="17"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              title="계정 삭제"
                              className="w-7 h-7 rounded-lg hover:bg-rose-50 text-[#c4c9d6] hover:text-rose-400 flex items-center justify-center transition-colors"
                            >
                              <IconX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── 설문 통계 탭 ── */}
          {tab === "survey" && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-[22px] font-bold text-[#0d1035] tracking-tight">설문 통계</h1>
                  <p className="text-[13px] text-[#9ca3af] mt-0.5">면접 후 수집된 사용자 설문 응답 현황입니다.</p>
                </div>
                <button onClick={fetchSurveyStats} disabled={loadingStats}
                  className="flex items-center gap-1.5 text-[12px] text-[#6b7280] hover:text-[#374151] px-3 py-1.5 rounded-lg border border-[#e4e7ef] hover:bg-[#f8f9fc] transition-all disabled:opacity-50">
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
                  <div className="grid grid-cols-3 gap-4">
                    <StatCard label="총 설문 응답" value={surveyStats.total} sub="누적 응답 수" />
                    <StatCard
                      label="질문 만족도 평균"
                      value={surveyStats.naturalnessAvg !== null ? `${surveyStats.naturalnessAvg}점` : "-"}
                      sub="5점 만점"
                    />
                    <StatCard
                      label="개선 의견"
                      value={surveyStats.feedbacks.length}
                      sub="텍스트 피드백 수"
                    />
                  </div>

                  {/* 차트 2단 그리드 */}
                  <div className="grid grid-cols-2 gap-5">
                    {/* 면접 목적 분포 */}
                    <div className="bg-white rounded-2xl border border-[#e4e7ef] p-6">
                      <h2 className="text-[14px] font-semibold text-[#0d1035] mb-1">면접 목적</h2>
                      <p className="text-[11.5px] text-[#9ca3af] mb-4">응답자 목적 분포</p>
                      {purposeKeys.length === 0 ? (
                        <p className="text-[13px] text-[#c4c9d6] text-center py-6">응답 데이터 없음</p>
                      ) : (
                        <div className="space-y-3.5">
                          {purposeKeys.map((key, i) => (
                            <HBar key={key} label={key} count={surveyStats.purposeMap[key]} total={surveyStats.total} color={purposeColors[i % purposeColors.length]} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 질문 만족도 분포 */}
                    <div className="bg-white rounded-2xl border border-[#e4e7ef] p-6">
                      <h2 className="text-[14px] font-semibold text-[#0d1035] mb-1">면접 질문 만족도</h2>
                      <p className="text-[11.5px] text-[#9ca3af] mb-4">1 = 전혀 도움 안됨 · 5 = 매우 도움됨</p>
                      <div className="space-y-3.5">
                        {[5, 4, 3, 2, 1].map((score) => (
                          <HBar
                            key={score}
                            label={score === 5 ? "5점 — 매우 도움" : score === 4 ? "4점 — 도움됨" : score === 3 ? "3점 — 보통" : score === 2 ? "2점 — 별로" : "1점 — 전혀 안됨"}
                            count={surveyStats.naturalnessMap[score] ?? 0}
                            total={Object.values(surveyStats.naturalnessMap).reduce((a, b) => a + b, 0)}
                            color={score >= 4 ? "#059669" : score === 3 ? "#d97706" : "#ef4444"}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 일별 응답 추이 */}
                  <div className="bg-white rounded-2xl border border-[#e4e7ef] p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h2 className="text-[14px] font-semibold text-[#0d1035]">일별 응답 추이</h2>
                        <p className="text-[11.5px] text-[#9ca3af] mt-0.5">최근 30일 · 총 {surveyStats.total}건</p>
                      </div>
                      <span className="text-[13px] font-bold text-[#4f52e8]">최대 {dailyMax}건/일</span>
                    </div>
                    <div className="flex items-end gap-[3px] h-32">
                      {surveyStats.daily.map((d) => (
                        <div key={d.date} className="flex-1 flex flex-col items-center group relative">
                          {/* 툴팁 */}
                          <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                            <div className="bg-[#0d1035] text-white text-[10px] font-semibold rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                              {d.date.slice(5)} · {d.count}건
                            </div>
                            <div className="w-1.5 h-1.5 bg-[#0d1035] rotate-45 -mt-[3px]" />
                          </div>
                          <div
                            className="w-full rounded-t-md transition-colors cursor-default"
                            style={{
                              height: `${Math.max((d.count / dailyMax) * 120, d.count > 0 ? 5 : 0)}px`,
                              backgroundColor: d.count > 0 ? "#4f52e8" : "#f3f4f6",
                              opacity: d.count > 0 ? 0.7 : 1,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 border-t border-[#f3f4f6] pt-2">
                      <span className="text-[10.5px] text-[#9ca3af]">{surveyStats.daily[0]?.date.slice(5)}</span>
                      <span className="text-[10.5px] text-[#9ca3af] text-center">막대 위에 마우스를 올리면 상세 확인</span>
                      <span className="text-[10.5px] text-[#9ca3af]">{surveyStats.daily[surveyStats.daily.length - 1]?.date.slice(5)}</span>
                    </div>
                  </div>

                  {/* 개선 의견 목록 */}
                  <div className="bg-white rounded-2xl border border-[#e4e7ef] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#f0f2f8] flex items-center justify-between">
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
                          <div key={f.id} className="px-6 py-4 flex gap-4">
                            <span className="text-[11px] font-bold text-[#9ca3af] w-5 flex-shrink-0 mt-0.5">#{i + 1}</span>
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
