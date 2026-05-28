"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Navbar, authFetch } from "@/components/Navbar";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

type QFeedback = {
  appropriateness: number;
  lengthEval: string;
  improvedAnswer: string;
  followUpQuestions: string[];
  comment: string;
};

type FullReport = {
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

type Report = {
  id: number;
  title: string;
  overallScore: number;
  scores: Record<string, number>;
  questions: { q: string; answer: string; comment?: string; tags?: string[] }[];
  fullReport?: FullReport | null;
  createdAt: string;
};

function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = (size / 2) - 5;
  const c = 2 * Math.PI * r;
  const fill = (score / 100) * c;
  const color = score >= 80 ? "#059669" : score >= 65 ? "#d97706" : "#dc2626";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0f2f8" strokeWidth="4"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${fill} ${c}`} strokeLinecap="round"/>
    </svg>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    setUserName(localStorage.getItem("userName") ?? "");
    setUserEmail(localStorage.getItem("userEmail") ?? "");
  }, []);

  useEffect(() => {
    if (!userEmail) return;
    authFetch(`${BACKEND_URL}/reports?email=${encodeURIComponent(userEmail)}`)
      .then((r) => r.json())
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingReports(false));
  }, [userEmail]);

  const handleViewReport = (r: Report) => {
    const data = r.fullReport ?? {
      overallScore: r.overallScore,
      scores: r.scores,
      strengths: [],
      weaknesses: [],
      precautions: [],
      fitScores: { job: 0, org: 0, company: 0 },
      fitComments: { job: "", org: "", company: "" },
      questionFeedback: r.questions.map((q) => ({
        appropriateness: 0,
        lengthEval: "적절",
        improvedAnswer: "",
        followUpQuestions: q.tags ?? [],
        comment: q.comment ?? "",
      })),
      questions: r.questions.map((q) => q.q),
      answers: r.questions.map((q) => q.answer),
    };
    sessionStorage.setItem("interviewReport", JSON.stringify(data));
    sessionStorage.setItem("interviewSettings", JSON.stringify({ interviewType: "", department: "", style: "" }));
    router.push("/report?from=profile");
  };

  const handleDeleteReport = async (id: number) => {
    await authFetch(`${BACKEND_URL}/reports/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail }),
    });
    setReports((prev) => prev.filter((r) => r.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const handleLogout = () => {
    ["isLoggedIn", "userName", "userEmail", "userRole", "sessionToken"].forEach((k) => localStorage.removeItem(k));
    router.push("/");
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) { setDeleteError("비밀번호를 입력해주세요."); return; }
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`${BACKEND_URL}/auth/user`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error ?? "탈퇴에 실패했습니다."); return; }
      localStorage.clear();
      router.push("/");
    } catch {
      setDeleteError("서버에 연결할 수 없습니다.");
    } finally {
      setDeleting(false);
    }
  };

  const scoreColor = (s: number) => s >= 80 ? "#059669" : s >= 65 ? "#d97706" : "#dc2626";
  const scoreLabel = (s: number) => s >= 80 ? "우수" : s >= 65 ? "보통" : "미흡";
  const scoreBg = (s: number) => s >= 80 ? "#d1fae5" : s >= 65 ? "#fef3c7" : "#fee2e2";
  const avgScore = reports.length > 0 ? Math.round(reports.reduce((a, r) => a + r.overallScore, 0) / reports.length) : null;
  const bestScore = reports.length > 0 ? Math.max(...reports.map(r => r.overallScore)) : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fc]">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10 space-y-6">

        {/* 프로필 헤더 */}
        <div className="bg-white rounded-2xl border border-[#e4e7ef] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-7 py-6">
          <div className="flex items-center gap-5">
            <div className="w-[54px] h-[54px] rounded-2xl bg-[#eef0fd] flex items-center justify-center text-[#4f52e8] text-[22px] font-black flex-shrink-0 select-none">
              {userName.slice(0, 1)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[19px] font-bold text-[#0d1035] leading-tight">{userName}</h1>
              <p className="text-[13px] text-[#9ca3af] mt-0.5 truncate">{userEmail}</p>
            </div>
            {reports.length > 0 && (
              <div className="hidden sm:flex items-center gap-5 flex-shrink-0 pr-1">
                {[
                  { label: "면접", value: `${reports.length}회` },
                  { label: "평균", value: avgScore !== null ? `${avgScore}점` : "—" },
                  { label: "최고", value: bestScore !== null ? `${bestScore}점` : "—" },
                ].map((s, i) => (
                  <div key={s.label} className={`text-center ${i > 0 ? "pl-5 border-l border-[#f0f2f8]" : ""}`}>
                    <div className="text-[17px] font-black text-[#0d1035]">{s.value}</div>
                    <div className="text-[11px] text-[#9ca3af] mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* 모바일 통계 */}
          {reports.length > 0 && (
            <div className="sm:hidden mt-5 grid grid-cols-3 gap-3 pt-5 border-t border-[#f0f2f8]">
              {[
                { label: "총 면접 횟수", value: `${reports.length}회` },
                { label: "평균 점수", value: avgScore !== null ? `${avgScore}점` : "—" },
                { label: "최고 점수", value: bestScore !== null ? `${bestScore}점` : "—" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-[17px] font-black text-[#0d1035]">{s.value}</div>
                  <div className="text-[11px] text-[#9ca3af] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 면접 기록 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-[#0d1035]">면접 기록</h2>
            {!loadingReports && reports.length > 0 && (
              <span className="text-[12px] text-[#9ca3af]">{reports.length}개</span>
            )}
          </div>

          {loadingReports ? (
            <div className="bg-white rounded-2xl border border-[#e4e7ef] flex items-center justify-center py-14 gap-2 text-[13px] text-[#c4c9d6]">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              불러오는 중
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-[#e4e7ef] py-14 text-center">
              <div className="w-11 h-11 rounded-2xl bg-[#f0f2f8] flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-[#c4c9d6]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <p className="text-[13px] text-[#9ca3af] mb-4">아직 저장된 면접 기록이 없습니다</p>
              <button onClick={() => router.push("/setup")}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-[#4f52e8] hover:bg-[#3e41d4] px-5 py-2.5 rounded-xl transition-colors shadow-sm shadow-[#4f52e8]/20">
                면접 시작하기 →
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {reports.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-[#e4e7ef] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(79,82,232,0.08)] hover:border-[#c7d2fe] transition-all">
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer group"
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  >
                    <div className="relative flex-shrink-0 w-[52px] h-[52px] flex items-center justify-center">
                      <ScoreRing score={r.overallScore} size={52} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[13px] font-black" style={{ color: scoreColor(r.overallScore) }}>{r.overallScore}</span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[14px] font-semibold text-[#0d1035] truncate">{r.title}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                          style={{ color: scoreColor(r.overallScore), background: scoreBg(r.overallScore) }}>
                          {scoreLabel(r.overallScore)}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#9ca3af]">
                        {new Date(r.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewReport(r); }}
                        className="text-[11px] font-medium text-[#4f52e8] bg-[#eef0fd] hover:bg-[#e0e3fb] px-2.5 py-1 rounded-lg transition-all flex-shrink-0"
                      >
                        상세 보기
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteReport(r.id); }}
                        className="w-7 h-7 rounded-lg text-[#e4e7ef] hover:text-rose-400 hover:bg-rose-50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>
                        </svg>
                      </button>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${expandedId === r.id ? "bg-[#eef0fd] text-[#4f52e8]" : "text-[#c4c9d6]"}`}>
                        <svg className={`w-4 h-4 transition-transform duration-200 ${expandedId === r.id ? "rotate-180" : ""}`}
                          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {expandedId === r.id && (
                    <div className="border-t border-[#f0f2f8] bg-[#fafbff] px-5 py-5 space-y-5">
                      {/* 영역별 점수 */}
                      <div>
                        <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">영역별 점수</p>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {[
                            { key: "content", label: "답변 내용" },
                            { key: "logic", label: "논리 구조" },
                            { key: "delivery", label: "전달력" },
                            { key: "reliability", label: "신뢰도" },
                            { key: "likability", label: "호감도" },
                          ].map(({ key, label }) => {
                            const score = (r.fullReport?.scores as Record<string, number>)?.[key] ?? r.scores[key] ?? r.scores[label] ?? 0;
                            return (
                              <div key={key} className="bg-white rounded-xl border border-[#e4e7ef] p-3 text-center">
                                <div className="text-[18px] font-black mb-0.5" style={{ color: scoreColor(score) }}>{score}</div>
                                <div className="text-[10px] text-[#9ca3af]">{label}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 강점 / 약점 */}
                      {r.fullReport && (r.fullReport.strengths?.length > 0 || r.fullReport.weaknesses?.length > 0) && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white rounded-xl border border-[#e4e7ef] p-4">
                            <p className="text-[11px] font-semibold text-emerald-600 mb-2">나의 강점</p>
                            <div className="space-y-1.5">
                              {r.fullReport.strengths.map((s, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                                  <span className="text-[12px] text-[#374151] leading-relaxed">{s}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="bg-white rounded-xl border border-[#e4e7ef] p-4">
                            <p className="text-[11px] font-semibold text-rose-500 mb-2">보완할 점</p>
                            <div className="space-y-1.5">
                              {r.fullReport.weaknesses.map((w, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-600 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                                  <span className="text-[12px] text-[#374151] leading-relaxed">{w}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 주의사항 */}
                      {(r.fullReport?.precautions?.length ?? 0) > 0 && (
                        <div className="bg-white rounded-xl border border-[#e4e7ef] p-4">
                          <p className="text-[11px] font-semibold text-amber-600 mb-2">실제 면접 시 주의사항</p>
                          <div className="space-y-1.5">
                            {r.fullReport!.precautions.map((p, i) => (
                              <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                <span className="text-[10px] font-bold text-amber-600 flex-shrink-0">0{i + 1}</span>
                                <span className="text-[12px] text-[#374151] leading-relaxed">{p}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 적합도 평가 */}
                      {r.fullReport?.fitScores && (
                        <div className="bg-white rounded-xl border border-[#e4e7ef] p-4">
                          <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">적합도 평가</p>
                          <div className="grid grid-cols-3 gap-4">
                            {([
                              { key: "job", label: "직무 적합도", color: "#4f52e8" },
                              { key: "org", label: "조직 적합도", color: "#059669" },
                              { key: "company", label: "기업 적합도", color: "#f59e0b" },
                            ] as const).map((f) => {
                              const score = r.fullReport!.fitScores[f.key] ?? 0;
                              return (
                                <div key={f.key}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[11px] font-semibold text-[#374151]">{f.label}</span>
                                    <span className="text-[11px] font-bold" style={{ color: f.color }}>{score}점</span>
                                  </div>
                                  <div className="w-full h-2 bg-[#f0f2f8] rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${score}%`, background: f.color }} />
                                  </div>
                                  {r.fullReport!.fitComments[f.key] && (
                                    <p className="text-[11px] text-[#6b7280] mt-1.5 leading-relaxed">{r.fullReport!.fitComments[f.key]}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 질문별 상세 피드백 */}
                      <div>
                        <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">질문별 상세 피드백</p>
                        <div className="space-y-3">
                          {(r.fullReport?.questions ?? r.questions.map(q => q.q)).map((question, i) => {
                            const answer = r.fullReport?.answers[i] ?? r.questions[i]?.answer ?? "";
                            const fb = r.fullReport?.questionFeedback[i];
                            return (
                              <div key={i} className="bg-white rounded-xl border border-[#e4e7ef] px-4 py-4">
                                <div className="flex gap-2 mb-2">
                                  <span className="text-[10px] font-bold text-[#4f52e8] bg-[#eef0fd] px-1.5 py-0.5 rounded-md flex-shrink-0 h-fit mt-0.5">Q{i + 1}</span>
                                  <p className="text-[13px] font-medium text-[#0d1035] leading-snug">{question}</p>
                                </div>
                                <blockquote className="ml-7 pl-3 border-l-2 border-[#e4e7ef] text-[12px] italic text-[#6b7280] mb-3 leading-relaxed">
                                  {answer ? `"${answer}"` : <span className="text-[#c4c9d6]">답변 없음</span>}
                                </blockquote>
                                {fb && (
                                  <div className="ml-7 space-y-2">
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] text-[#9ca3af]">답변 적절성</span>
                                        <span className="text-[11px] font-bold text-[#4f52e8]">{fb.appropriateness}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] text-[#9ca3af]">답변 길이</span>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                          fb.lengthEval === "적절" ? "bg-emerald-100 text-emerald-700" :
                                          fb.lengthEval === "짧음" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                                        }`}>{fb.lengthEval}</span>
                                      </div>
                                    </div>
                                    {fb.comment && <p className="text-[12px] text-[#374151] leading-relaxed">{fb.comment}</p>}
                                    {fb.improvedAnswer && (
                                      <div className="bg-[#eef0fd] border border-[#c7d2fe] rounded-lg px-3 py-2">
                                        <p className="text-[10px] font-semibold text-[#4f52e8] mb-1">개선된 답변 예시</p>
                                        <p className="text-[12px] text-[#374151] leading-relaxed">{fb.improvedAnswer}</p>
                                      </div>
                                    )}
                                    {fb.followUpQuestions?.length > 0 && (
                                      <div>
                                        <p className="text-[10px] text-[#9ca3af] mb-1.5">나올 수 있는 꼬리 질문</p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {fb.followUpQuestions.map((fq, j) => (
                                            <span key={j} className="text-[11px] text-[#374151] bg-[#f8f9fc] border border-[#e4e7ef] px-2.5 py-1 rounded-full">{fq}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 계정 설정 */}
        <div className="bg-white rounded-2xl border border-[#e4e7ef] overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <div className="px-6 py-4 border-b border-[#f8f9fc]">
            <h2 className="text-[14px] font-bold text-[#0d1035]">계정 설정</h2>
          </div>
          <div className="divide-y divide-[#f8f9fc]">
            <div className="flex items-center justify-between px-6 py-3.5">
              <span className="text-[13px] text-[#9ca3af]">이름</span>
              <span className="text-[13px] font-medium text-[#374151]">{userName}</span>
            </div>
            <div className="flex items-center justify-between px-6 py-3.5">
              <span className="text-[13px] text-[#9ca3af]">이메일</span>
              <span className="text-[13px] font-medium text-[#374151]">{userEmail}</span>
            </div>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-between px-6 py-3.5 text-[13px] text-[#c4c9d6] hover:text-rose-400 hover:bg-rose-50 transition-colors"
              >
                <span>회원탈퇴</span>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            ) : (
              <div className="px-6 py-5 bg-[#fff8f8]">
                <p className="text-[13px] font-semibold text-[#0d1035] mb-1">계정을 삭제하시겠습니까?</p>
                <p className="text-[12px] text-[#9ca3af] mb-4 leading-relaxed">모든 면접 기록과 계정 정보가 즉시 삭제됩니다.</p>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(""); }}
                  placeholder="비밀번호 확인"
                  className="w-full px-3.5 py-2.5 bg-white border border-rose-200 rounded-xl text-[13px] focus:outline-none focus:border-rose-400 mb-2 transition-colors"
                />
                {deleteError && <p className="text-[12px] text-rose-500 mb-3">{deleteError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeletePassword(""); setDeleteError(""); }}
                    className="flex-1 py-2.5 rounded-xl border border-[#e4e7ef] text-[13px] font-medium text-[#6b7280] hover:bg-white transition-colors"
                  >취소</button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-[13px] font-semibold text-white transition-colors"
                  >{deleting ? "삭제 중..." : "삭제하기"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="pb-4" />
      </main>

      {/* 메인과 동일한 Footer */}
      <footer className="bg-[#0d1035] text-white/40 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-white/60 text-[13px] font-medium">AI기반 맞춤 면접 도우미</span>
          <p className="text-[13px]">© 2025 AI기반 맞춤 면접 도우미. All rights reserved.</p>
          <div className="flex items-center gap-5 text-[13px]">
            <a href="#" className="hover:text-white/70 transition-colors">개인정보처리방침</a>
            <a href="#" className="hover:text-white/70 transition-colors">이용약관</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
