"use client";

import { useState, useEffect } from "react";
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

export default function AdminPage() {
  const router = useRouter();
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [content, setContent] = useState("");
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    const email = localStorage.getItem("userEmail");
    if (!email || role !== "admin") {
      router.replace("/");
      return;
    }
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
      setContent("");
      setSelectedSubject("");
    } catch {
      // network error or JSON parse failure — silently ignore
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: number) => {
    await fetch(`${BACKEND_URL}/knowledge/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail }),
    });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-[#e4e7ef] sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="flex items-center gap-2 text-[#0d1035] hover:opacity-70 transition-opacity">
              <span className="font-semibold text-[15px] tracking-tight">AI기반 맞춤 면접 도우미</span>
            </button>
            <span className="text-[#d1d5db] text-sm">/</span>
            <span className="text-[13px] text-[#6b7280]">관리자</span>
          </div>
          <button
            onClick={() => router.push("/")}
            className="text-[13px] text-[#6b7280] hover:text-[#374151] px-3 py-1.5 rounded-lg hover:bg-[#f0f2f8] transition-all"
          >
            나가기
          </button>
        </div>
      </header>

      <div className="flex flex-1 max-w-6xl mx-auto w-full px-6 py-8 gap-8">
        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 hidden lg:block">
          <nav className="space-y-0.5">
            <p className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-widest px-3 mb-3">콘텐츠 관리</p>
            <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#eef0fd] text-[#4f52e8] text-[13px] font-semibold text-left">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              전공지식 관리
            </button>
            <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[#6b7280] hover:bg-[#f0f2f8] text-[13px] font-medium text-left transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              사용자 관리
            </button>
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 space-y-5">
          {/* Page title */}
          <div>
            <h1 className="text-[22px] font-bold text-[#0d1035] tracking-tight">전공지식 관리</h1>
            <p className="text-[13px] text-[#9ca3af] mt-0.5">학과별 전공지식을 등록하고 면접 질문 생성에 활용합니다.</p>
          </div>

          {/* Step 1 — 학과 선택 */}
          <div className="bg-white rounded-2xl border border-[#e4e7ef] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#f0f2f8] flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-[#0d1035] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">1</span>
              <span className="text-[14px] font-semibold text-[#0d1035]">학과 선택</span>
              {selectedDept && (
                <span className="ml-auto text-[12px] font-medium text-[#4f52e8] bg-[#eef0fd] px-2.5 py-0.5 rounded-full">{selectedDept}</span>
              )}
            </div>
            <div className="px-6 py-5">
              <div className="flex flex-wrap gap-2">
                {DEPARTMENTS.map((dept) => (
                  <button
                    key={dept.name}
                    onClick={() => dept.enabled && setSelectedDept(selectedDept === dept.name ? "" : dept.name)}
                    disabled={!dept.enabled}
                    className={`px-3.5 py-2 rounded-xl text-[13px] font-medium border transition-all ${
                      !dept.enabled
                        ? "bg-[#f8f9fc] text-[#c4c9d6] border-[#f0f2f8] cursor-not-allowed"
                        : selectedDept === dept.name
                        ? "bg-[#0d1035] text-white border-[#0d1035]"
                        : "bg-white text-[#374151] border-[#e4e7ef] hover:border-[#0d1035]/30 hover:text-[#0d1035]"
                    }`}
                  >
                    {dept.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step 2 — 전공지식 입력 */}
          <div className={`bg-white rounded-2xl border border-[#e4e7ef] overflow-hidden transition-opacity ${!selectedDept ? "opacity-40 pointer-events-none" : ""}`}>
            <div className="px-6 py-4 border-b border-[#f0f2f8] flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-[#0d1035] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">2</span>
              <span className="text-[14px] font-semibold text-[#0d1035]">전공지식 입력</span>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div>
                <p className="text-[12px] font-medium text-[#6b7280] mb-2.5">과목</p>
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_LIST.map((subj) => (
                    <button
                      key={subj}
                      onClick={() => setSelectedSubject(selectedSubject === subj ? "" : subj)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                        selectedSubject === subj
                          ? "bg-[#4f52e8] text-white border-[#4f52e8]"
                          : "bg-white text-[#374151] border-[#e4e7ef] hover:border-[#4f52e8]/40 hover:text-[#4f52e8]"
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[12px] font-medium text-[#6b7280] mb-2.5">내용</p>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="개념 설명, 예상 질문, 핵심 키워드 등을 입력하세요."
                  rows={4}
                  className="w-full px-4 py-3 bg-[#f8f9fc] border border-[#e4e7ef] rounded-xl text-[13px] text-[#0d1035] placeholder-[#c4c9d6] focus:outline-none focus:border-[#4f52e8] focus:bg-white transition-all resize-none"
                />
                <div className="flex items-center justify-between mt-3">
                  <p className="text-[11px] text-[#9ca3af]">{content.length}자</p>
                  <button
                    onClick={handleAdd}
                    disabled={!selectedSubject || !content.trim() || adding}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                      selectedSubject && content.trim() && !adding
                        ? "bg-[#4f52e8] hover:bg-[#3e41d4] text-white shadow-sm"
                        : "bg-[#f0f2f8] text-[#c4c9d6] cursor-not-allowed"
                    }`}
                  >
                    {adding ? "등록 중..." : "목록에 추가"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 — 등록 목록 */}
          <div className={`bg-white rounded-2xl border border-[#e4e7ef] overflow-hidden transition-opacity ${!selectedDept ? "opacity-40 pointer-events-none" : ""}`}>
            <div className="px-6 py-4 border-b border-[#f0f2f8] flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-[#0d1035] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">3</span>
              <span className="text-[14px] font-semibold text-[#0d1035]">등록 목록</span>
              {entries.length > 0 && (
                <span className="text-[12px] text-[#9ca3af]">{entries.length}개</span>
              )}
            </div>

            <div
              className="divide-y divide-[#f8f9fc] overflow-y-scroll"
              style={{ maxHeight: "480px" }}
            >
              {loadingEntries ? (
                <div className="px-6 py-8 text-center text-[13px] text-[#c4c9d6]">불러오는 중...</div>
              ) : entries.length === 0 ? (
                <div className="px-6 py-8 text-center text-[13px] text-[#c4c9d6]">등록된 항목이 없습니다.</div>
              ) : (
                entries.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-4 px-6 py-4 hover:bg-[#fafbff] transition-colors group">
                    <span className="mt-0.5 text-[11px] font-semibold px-2 py-0.5 bg-[#eef0fd] text-[#4f52e8] rounded-md flex-shrink-0">{entry.subject}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#374151] leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                      <p className="text-[11px] text-[#c4c9d6] mt-1">
                        {entry.registeredBy || "관리자"} · {new Date(entry.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(entry.id)}
                      className="flex-shrink-0 w-6 h-6 rounded-lg bg-transparent hover:bg-rose-50 text-[#c4c9d6] hover:text-rose-400 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <IconX className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
