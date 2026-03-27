import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { StartButton } from "@/components/StartButton";
import { IconMic, IconBrain, IconFileText, IconBarChart, IconArrowRight, IconCheck } from "@/components/Icons";
import { TypewriterText } from "@/components/TypewriterText";
import { ScrollReveal } from "@/components/ScrollReveal";

const features = [
  {
    icon: <IconFileText className="w-5 h-5" />,
    title: "이력서 기반 질문 생성",
    desc: "업로드한 이력서와 자소서를 분석해 경험·기술·프로젝트에 맞는 질문을 자동 생성합니다.",
  },
  {
    icon: <IconMic className="w-5 h-5" />,
    title: "실시간 음성 면접",
    desc: "AI 면접관의 TTS 음성 질문에 직접 말로 답변하며 실전과 같은 환경을 경험합니다.",
  },
  {
    icon: <IconBrain className="w-5 h-5" />,
    title: "꼬리질문 자동 생성",
    desc: "이전 답변을 분석해 심화 꼬리질문을 즉시 생성, 깊이 있는 면접 연습이 가능합니다.",
  },
  {
    icon: <IconBarChart className="w-5 h-5" />,
    title: "다차원 결과 분석",
    desc: "답변 논리성, 말하기 속도, 시선 처리까지 면접관 관점의 상세한 피드백을 제공합니다.",
  },
];

const steps = [
  { num: "01", label: "면접 설정", desc: "학과, 면접 유형, 면접관 스타일을 선택합니다." },
  { num: "02", label: "자료 업로드", desc: "이력서·자소서를 업로드하면 AI가 분석합니다." },
  { num: "03", label: "실시간 면접", desc: "음성으로 실전처럼 면접을 진행합니다." },
  { num: "04", label: "결과 확인", desc: "영역별 점수와 개선 방향을 확인합니다." },
];

const planFeatures = [
  "무제한 면접 연습",
  "이력서·자소서 기반 맞춤 질문",
  "음성 분석 (속도·필러어·무음)",
  "표정·시선 관찰 피드백",
  "꼬리질문 자동 생성",
  "결과 리포트 저장 및 공유",
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1">
        {/* ─── Hero ─── */}
        <section className="relative overflow-hidden bg-[#0d1035] text-white">
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          {/* Glow */}
          <div className="absolute top-[-80px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#4f52e8] rounded-full blur-[120px] opacity-20 pointer-events-none" />

          <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-32 text-center">
            <div className="inline-flex items-center gap-2 bg-white/[0.08] border border-white/[0.12] text-white/80 text-[12px] font-medium px-3.5 py-1.5 rounded-full mb-8 tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              지금 바로 무료로 시작할 수 있습니다
            </div>

            <h1 className="text-[52px] sm:text-[64px] font-bold leading-[1.12] tracking-tight mb-6">
              <TypewriterText
                text="면접 준비,"
                speed={70}
                hideCursorAfter={1820}
              /><br />
              <TypewriterText
                text="더 이상 혼자 고민하지 마세요"
                speed={70}
                delay={1820}
                className="text-transparent bg-clip-text bg-gradient-to-r from-[#818cf8] to-[#67e8f9]"
              />
            </h1>

            <p className="text-[17px] text-white/60 max-w-xl mx-auto mb-10 leading-relaxed">
              이력서를 올리면 AI가 맞춤 질문을 만들고, 실시간 음성으로 실전 면접을 진행합니다.
              끝나면 상세한 피드백 리포트까지.
            </p>

            <div className="flex justify-center">
              <StartButton />
            </div>

            {/* Stats */}
            <div className="mt-16 pt-10 border-t border-white/[0.08] grid grid-cols-3 gap-8 max-w-sm mx-auto">
              {[
                { num: "", label: "면접 진행 횟수" },
                { num: "", label: "사용자 만족도" },
                { num: "", label: "목표 달성 연습" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-[22px] font-bold text-white mb-0.5">{s.num}</div>
                  <div className="text-[11px] text-white/40 leading-tight">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Features ─── */}
        <section id="features" className="py-24 px-6 bg-[#f8f9fc]">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <ScrollReveal>
                <p className="text-[12px] font-semibold text-[#4f52e8] uppercase tracking-widest mb-4">핵심 기능</p>
                <h2 className="text-[36px] font-bold leading-tight text-[#0d1035] mb-5">
                  면접 준비에<br />필요한 모든 것
                </h2>
                <p className="text-[15px] text-[#6b7280] leading-relaxed mb-8">
                  단순한 질문 생성기가 아닙니다. 이력서 분석부터 실시간 음성 면접,
                  표정·음성 분석까지 실전 면접의 전 과정을 커버합니다.
                </p>
                <Link
                  href="/setup"
                  className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#4f52e8] hover:gap-3 transition-all"
                >
                  지금 체험해보기 <IconArrowRight className="w-4 h-4" />
                </Link>
              </ScrollReveal>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {features.map((f, i) => (
                  <ScrollReveal key={f.title} delay={i * 100}>
                    <div className="bg-white rounded-2xl border border-[#e4e7ef] p-5 hover:border-[#4f52e8]/30 hover:shadow-[0_4px_20px_rgba(79,82,232,0.08)] transition-all">
                      <div className="w-9 h-9 rounded-xl bg-[#eef0fd] text-[#4f52e8] flex items-center justify-center mb-3.5">
                        {f.icon}
                      </div>
                      <h3 className="font-semibold text-[14px] text-[#0d1035] mb-1.5">{f.title}</h3>
                      <p className="text-[13px] text-[#6b7280] leading-relaxed">{f.desc}</p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── How it works ─── */}
        <section id="how" className="py-24 px-6 bg-white">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal className="text-center mb-16">
              <p className="text-[12px] font-semibold text-[#4f52e8] uppercase tracking-widest mb-3">이용 방법</p>
              <h2 className="text-[36px] font-bold text-[#0d1035]">4단계면 충분합니다</h2>
            </ScrollReveal>

            <div className="space-y-0">
              {steps.map((s, i) => (
                <ScrollReveal key={s.num} delay={i * 120}>
                  <div className="flex gap-8 items-start group">
                    <div className="flex flex-col items-center">
                      <div className="w-11 h-11 rounded-2xl bg-[#eef0fd] group-hover:bg-[#4f52e8] transition-colors flex items-center justify-center">
                        <span className="text-[13px] font-bold text-[#4f52e8] group-hover:text-white transition-colors">{s.num}</span>
                      </div>
                      {i < steps.length - 1 && (
                        <div className="w-px h-10 bg-[#e4e7ef] mt-1" />
                      )}
                    </div>
                    <div className="pb-10">
                      <div className="font-semibold text-[16px] text-[#0d1035] mb-1">{s.label}</div>
                      <div className="text-[14px] text-[#6b7280]">{s.desc}</div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Plan / CTA ─── */}
        <section className="py-24 px-6 bg-[#f8f9fc]">
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal>
              <p className="text-[12px] font-semibold text-[#4f52e8] uppercase tracking-widest mb-4">완전 무료</p>
              <h2 className="text-[36px] font-bold text-[#0d1035] leading-tight mb-5">
                모든 기능을<br />무료로 이용하세요
              </h2>
              <p className="text-[15px] text-[#6b7280] mb-8 leading-relaxed">
                회원가입 없이도 바로 시작할 수 있습니다.
                더 많은 기능은 로그인 후 이용 가능합니다.
              </p>
              <Link
                href="/setup"
                className="inline-flex items-center gap-2 bg-[#0d1035] hover:bg-[#1a1f4e] text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-[15px]"
              >
                지금 시작하기 <IconArrowRight />
              </Link>
            </ScrollReveal>

            <ScrollReveal delay={150}>
              <div className="bg-white rounded-2xl border border-[#e4e7ef] p-7 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                <div className="text-[13px] font-semibold text-[#374151] mb-5">포함된 기능</div>
                <ul className="space-y-3">
                  {planFeatures.map((f, i) => (
                    <ScrollReveal key={f} delay={i * 80}>
                      <li className="flex items-center gap-3 text-[14px] text-[#374151]">
                        <span className="w-5 h-5 rounded-full bg-[#d1fae5] text-[#059669] flex items-center justify-center flex-shrink-0">
                          <IconCheck className="w-3 h-3" />
                        </span>
                        {f}
                      </li>
                    </ScrollReveal>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="bg-[#0d1035] text-white/40 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
<span className="text-white/60 text-[13px] font-medium">AI기반 맞춤 면접 도우미</span>
          </div>
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
