"use client";

interface Props {
  onClose: () => void;
}

const STEPS = [
  {
    num: "01",
    title: "면접 입장",
    desc: "카메라·마이크 상태를 확인하고\n면접 입장하기를 누르세요",
    color: "bg-[#eef0fd] text-[#4f52e8]",
  },
  {
    num: "02",
    title: "AI 질문",
    desc: "AI 면접관이 영상과 음성으로\n질문을 드립니다",
    color: "bg-[#f3f0ff] text-[#7c3aed]",
  },
  {
    num: "03",
    title: "음성 답변",
    desc: "마이크 버튼을 눌러 답변을 녹음하고\n내용을 확인한 뒤 제출하세요",
    color: "bg-[#ecfdf5] text-[#059669]",
  },
  {
    num: "04",
    title: "리포트 확인",
    desc: "면접 종료 후 질문별 상세\n피드백 리포트를 받아보세요",
    color: "bg-[#fffbeb] text-[#d97706]",
  },
];

const TIPS = [
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    ),
    text: "조용한 환경에서 진행해주세요",
  },
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      </svg>
    ),
    text: "카메라를 정면으로 응시해주세요",
  },
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    text: "자연스럽게 대화하듯 답변하세요",
  },
  {
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    text: "질문당 약 4~5분을 사용할 수 있어요",
  },
];

export default function InterviewGuideModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0">
      {/* 반투명 배경 */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* 카드 */}
      <div className="relative w-full max-w-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up">

        {/* 상단 헤더 */}
        <div className="bg-gradient-to-r from-[#0d1035] to-[#4f52e8] px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold text-white/50 tracking-widest uppercase mb-1">Interview Guide</p>
              <h2 className="text-[18px] font-bold text-white leading-snug">면접, 이렇게 진행돼요</h2>
              <p className="text-[12px] text-white/60 mt-0.5">질문을 생성하는 동안 확인해주세요</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-white/40 hover:text-white transition-colors mt-0.5"
              aria-label="닫기"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* 진행 흐름 */}
          <div>
            <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">진행 흐름</p>
            <div className="grid grid-cols-4 gap-2">
              {STEPS.map((s, i) => (
                <div key={i} className="flex flex-col items-center text-center gap-1.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold ${s.color}`}>
                    {s.num}
                  </div>
                  <p className="text-[11px] font-semibold text-[#374151] leading-tight">{s.title}</p>
                  <p className="text-[10px] text-[#9ca3af] leading-tight whitespace-pre-line">{s.desc}</p>
                  {i < STEPS.length - 1 && (
                    <div className="hidden" />
                  )}
                </div>
              ))}
            </div>
            {/* 연결 화살표 */}
            <div className="flex items-center justify-between px-[18px] mt-1 -mb-3">
              {[0, 1, 2].map((i) => (
                <svg key={i} width="20" height="8" viewBox="0 0 20 8" fill="none" className="text-[#d1d5db]">
                  <path d="M0 4h16M13 1l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ))}
            </div>
          </div>

          {/* 구분선 */}
          <div className="border-t border-[#f3f4f6]" />

          {/* 답변 방법 */}
          <div>
            <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">답변 방법</p>
            <div className="flex flex-col gap-2.5">
              {[
                { step: "1", text: "AI 면접관의 질문을 듣습니다" },
                { step: "2", text: "하단 마이크 버튼을 눌러 답변을 녹음합니다" },
                { step: "3", text: "인식된 텍스트를 확인·수정 후 제출합니다" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#4f52e8] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {item.step}
                  </span>
                  <span className="text-[12.5px] text-[#374151] leading-relaxed">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 구분선 */}
          <div className="border-t border-[#f3f4f6]" />

          {/* 유의사항 */}
          <div>
            <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">유의사항</p>
            <div className="grid grid-cols-2 gap-2">
              {TIPS.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 bg-[#f8f9fc] rounded-xl px-3 py-2.5">
                  <span className="text-[#6b7280] flex-shrink-0 mt-0.5">{tip.icon}</span>
                  <span className="text-[11.5px] text-[#4b5563] leading-snug">{tip.text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* 하단 버튼 */}
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#4f52e8] hover:bg-[#3e41d4] text-white text-[13px] font-semibold transition-colors"
          >
            확인했어요
          </button>
        </div>

      </div>

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.28s ease-out both; }
      `}</style>
    </div>
  );
}
