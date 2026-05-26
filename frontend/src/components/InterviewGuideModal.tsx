"use client";

interface Props {
  onClose: () => void;
}

const STEPS = [
  {
    num: "01",
    title: "면접 입장",
    desc: "카메라·마이크 상태 확인 후\n면접 입장하기 클릭",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
    ),
    accent: "text-[#4f52e8] bg-[#eef0fd]",
  },
  {
    num: "02",
    title: "AI 질문",
    desc: "AI 면접관이 영상·음성으로\n질문을 드립니다",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    accent: "text-[#7c3aed] bg-[#f3f0ff]",
  },
  {
    num: "03",
    title: "음성 답변",
    desc: "마이크 버튼으로 녹음 후\n텍스트 확인·제출",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      </svg>
    ),
    accent: "text-[#059669] bg-[#ecfdf5]",
  },
  {
    num: "04",
    title: "리포트",
    desc: "면접 종료 후 질문별\n상세 피드백 제공",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    accent: "text-[#d97706] bg-[#fffbeb]",
  },
];

const HOW_TO = [
  "AI 면접관의 질문을 끝까지 들으세요",
  "질문이 끝나면 자동으로 녹음이 시작됩니다",
  "최대 1분 30초 내에 답변하고 '답변 종료'를 누르세요",
  "인식된 텍스트를 확인·수정한 뒤 제출하세요",
];

const TIPS = [
  {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    text: "조용한 환경에서 진행해주세요",
  },
  {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" /><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      </svg>
    ),
    text: "카메라를 정면으로 응시해주세요",
  },
  {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    text: "답변 시간은 최대 1분 30초예요",
  },
  {
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    text: "자연스럽게 대화하듯 답변하세요",
  },
];

export default function InterviewGuideModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up">

        {/* 헤더 */}
        <div className="px-7 pt-6 pb-5 border-b border-[#e4e7ef]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#eef0fd] text-[#4f52e8] text-[11px] font-semibold mb-3">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                면접 안내
              </span>
              <h2 className="text-[20px] font-bold text-[#0d1035] leading-snug">면접, 이렇게 진행돼요</h2>
              <p className="text-[12.5px] text-[#6b7280] mt-1.5">질문을 생성하는 동안 잠깐 확인해주세요</p>
            </div>
            <button onClick={onClose} className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#9ca3af] hover:text-[#374151] hover:bg-[#f3f4f6] transition-all mt-0.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-7 py-6 space-y-6">

          {/* 진행 흐름 */}
          <div>
            <p className="text-[10.5px] font-bold text-[#9ca3af] tracking-widest uppercase mb-4">진행 흐름</p>
            <div className="flex items-start gap-0">
              {STEPS.map((s, i) => (
                <div key={i} className="flex-1 flex flex-col items-center relative">
                  {/* 연결선 */}
                  {i < STEPS.length - 1 && (
                    <div className="absolute top-5 left-1/2 w-full h-px bg-[#e4e7ef]" style={{ left: "50%" }} />
                  )}
                  <div className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center ${s.accent} mb-2.5`}>
                    {s.icon}
                  </div>
                  <p className="text-[11.5px] font-bold text-[#1f2937] text-center leading-tight mb-1">{s.title}</p>
                  <p className="text-[10px] text-[#9ca3af] text-center leading-snug whitespace-pre-line">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 구분선 */}
          <div className="border-t border-[#f3f4f6]" />

          {/* 답변 방법 + 유의사항 2-col */}
          <div className="grid grid-cols-2 gap-5">

            {/* 답변 방법 */}
            <div>
              <p className="text-[10.5px] font-bold text-[#9ca3af] tracking-widest uppercase mb-3.5">답변 방법</p>
              <div className="flex flex-col gap-2.5">
                {HOW_TO.map((text, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#4f52e8] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-[11.5px] text-[#374151] leading-relaxed">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 유의사항 */}
            <div>
              <p className="text-[10.5px] font-bold text-[#9ca3af] tracking-widest uppercase mb-3.5">유의사항</p>
              <div className="flex flex-col gap-2.5">
                {TIPS.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-lg bg-[#f8f9fc] border border-[#e4e7ef] flex items-center justify-center text-[#6b7280] mt-0.5">
                      {tip.icon}
                    </span>
                    <span className="text-[12px] text-[#4b5563] leading-relaxed">{tip.text}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* 하단 버튼 */}
        <div className="px-7 pb-6">
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
