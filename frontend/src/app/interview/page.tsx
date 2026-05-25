"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { IconArrowRight, IconMic } from "@/components/Icons";
import { useFaceAnalysis } from "@/hooks/useFaceAnalysis";
import { INTERVIEW_INTRO_QUESTION, useInterviewQuestions } from "@/hooks/useInterviewQuestions";
import { useCallMedia } from "@/hooks/useCallMedia";
import { parseSSE } from "@/lib/sseStream"
import SurveyEmailModal from "@/components/SurveyEmailModal"
import InterviewGuideModal from "@/components/InterviewGuideModal";

const MEDIA_API = process.env.NEXT_PUBLIC_MEDIA_API!;
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

function now() {
  return new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

type Msg = { id?: number; role: "ai" | "user"; text: string; time: string };

/* ── AI 아바타 ── */
function AIAvatar({ speaking, lipVideoSrc, onVideoEnded, onVideoMetadata, avatarSrc }: {
  speaking: boolean;
  lipVideoSrc: string | null;
  onVideoEnded: () => void;
  onVideoMetadata?: (durationMs: number) => void;
  avatarSrc?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // 영상이 예기치 않게 paused 상태가 되면 즉시 재생 재개 (플레이 버튼 오버레이 방지)
  const handlePause = () => {
    const v = videoRef.current;
    if (v && !v.ended) v.play().catch(() => {});
  };

  // 새 영상 src 설정 시 강제 재생
  useEffect(() => {
    const v = videoRef.current;
    if (v && lipVideoSrc) v.play().catch(() => {});
  }, [lipVideoSrc]);

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ userSelect: "none" }}>
      <img
        src={avatarSrc || "/avatar.png"}
        alt="AI 면접관"
        className="w-full h-full object-cover object-center"
        draggable={false}
      />
      {lipVideoSrc && (
        <video
          ref={videoRef}
          key={lipVideoSrc}
          src={lipVideoSrc}
          autoPlay
          playsInline
          muted={false}
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          onLoadedMetadata={() => { if (videoRef.current && onVideoMetadata) onVideoMetadata(videoRef.current.duration * 1000); }}
          onEnded={onVideoEnded}
          onError={onVideoEnded}
          onPause={handlePause}
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ pointerEvents: "none", WebkitMediaControls: "none" } as React.CSSProperties}
          {...{ "x-webkit-airplay": "deny", "controlsList": "nodownload nofullscreen noremoteplayback" } as object}
        />
      )}
      {/* 마우스 이벤트 완전 차단 오버레이 — 브라우저 hover/click 으로 인한 컨트롤 UI 차단 */}
      <div
        className="absolute inset-0"
        style={{ pointerEvents: "all", zIndex: 20, background: "transparent", cursor: "default" }}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}

// 카테고리 배지 스타일 맵
const CATEGORY_STYLE: Record<string, string> = {
  소개: "bg-gray-100 text-gray-500",
  공통: "bg-[#eef0fd] text-[#4f52e8]",
  직무: "bg-amber-50 text-amber-600",
  인성: "bg-green-50 text-green-600",
  전공: "bg-sky-50 text-sky-600",
  이력서: "bg-purple-50 text-purple-600",
};

/* ── 준비 화면 ── */
function ReadyScreen({
  onStart,
  layout,
  setLayout,
  splitRatio,
  setSplitRatio,
  questionsReady,
  questionsLoading,
  questionCount,
  questionsProgress,
  questionsStep,
  interviewStyle,
  questionList,
  questionCategories,
}: {
  onStart: () => void;
  layout: "split" | "pip" | "full";
  setLayout: (v: "split" | "pip" | "full") => void;
  splitRatio: "5:5" | "7:3" | "3:7";
  setSplitRatio: (v: "5:5" | "7:3" | "3:7") => void;
  questionsReady: boolean;
  questionsLoading: boolean;
  questionCount: number;
  questionsProgress: number;
  questionsStep: string;
  interviewStyle: string;
  questionList: string[];
  questionCategories: string[];
}) {
  const previewRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const previewAudioCtxRef = useRef<AudioContext | null>(null);
  const previewVadRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [camReady, setCamReady] = useState(false);
  const [camErr, setCamErr] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [micErr, setMicErr] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [mediaServerOk, setMediaServerOk] = useState<boolean | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamId, setSelectedCamId] = useState("");
  const [selectedMicId, setSelectedMicId] = useState("");
  const [selectedSpeakerId, setSelectedSpeakerId] = useState("");
  const [showDeviceModal, setShowDeviceModal] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 3000);
    fetch(`${MEDIA_API}/`, { signal: ctrl.signal })
      .then(() => setMediaServerOk(true))
      .catch(() => setMediaServerOk(false))
      .finally(() => clearTimeout(tid));
  }, []);

  const startPreviewStream = async (camId?: string, micId?: string) => {
    previewStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (previewVadRef.current) clearInterval(previewVadRef.current);
    previewAudioCtxRef.current?.close();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: camId ? { deviceId: { exact: camId } } : true,
        audio: micId ? { deviceId: { exact: micId } } : true,
      });
      previewStreamRef.current = stream;
      if (previewRef.current) previewRef.current.srcObject = stream;
      setCamReady(true); setCamErr(false);
      setMicReady(true); setMicErr(false);

      // 장치 목록 (권한 후 label 포함)
      const devices = await navigator.mediaDevices.enumerateDevices();
      setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
      setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
      setSpeakerDevices(devices.filter((d) => d.kind === "audiooutput"));

      // 현재 사용 중인 장치 ID 반영
      const vidTrack = stream.getVideoTracks()[0];
      const audTrack = stream.getAudioTracks()[0];
      if (vidTrack && !camId) setSelectedCamId(vidTrack.getSettings().deviceId ?? "");
      if (audTrack && !micId) setSelectedMicId(audTrack.getSettings().deviceId ?? "");

      // 마이크 레벨
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      audioCtx.createMediaStreamSource(new MediaStream(stream.getAudioTracks())).connect(analyser);
      previewAudioCtxRef.current = audioCtx;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      previewVadRef.current = setInterval(() => {
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        setMicLevel(Math.min(avg / 40, 1));
        setSpeaking(avg > 10);
      }, 80);
    } catch {
      setCamErr(true); setMicErr(true);
    }
  };

  useEffect(() => {
    startPreviewStream();
    return () => {
      previewStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (previewVadRef.current) clearInterval(previewVadRef.current);
      previewAudioCtxRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!questionsLoading) return;
    const t = setTimeout(() => setShowGuideModal(true), 4000);
    return () => clearTimeout(t);
  }, [questionsLoading]);

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex flex-col">
      <header className="bg-white border-b border-[#e4e7ef] px-6 h-[60px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-semibold text-[14px] text-[#0d1035]">AI기반 맞춤 면접 도우미</span>
        </Link>
        <Link href="/upload" className="text-[13px] text-[#9ca3af] hover:text-[#374151] transition-colors flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          이전
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center bg-[#f8f9fc] p-6">
        <div className="w-full max-w-3xl">
          <div className="bg-white rounded-2xl border border-[#e4e7ef] shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">

            {/* 카메라 + 레이아웃 설정 */}
            <div className="flex gap-4 border-b border-[#e4e7ef] p-5">
              {/* 카메라 미리보기 */}
              <div
                className={`relative w-[55%] aspect-video bg-[#1a1c2e] flex-shrink-0 rounded-xl overflow-hidden transition-all duration-200 ${
                  speaking ? "ring-2 ring-green-400 ring-offset-2 ring-offset-white" : ""
                }`}
              >
                <video ref={previewRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                {!camReady && !camErr && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                    <span className="text-white/40 text-[12px]">카메라 연결 중...</span>
                  </div>
                )}
                {camErr && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <svg className="w-7 h-7 text-white/25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14" /><rect x="1" y="6" width="14" height="12" rx="2" /><line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                    <span className="text-white/30 text-[12px]">카메라를 사용할 수 없습니다</span>
                  </div>
                )}

                {/* 하단 상태 레이블 */}
                <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
                  <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-md px-2 py-0.5">
                    {camReady && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                    <span className="text-[11px] text-white/80 font-medium">나 (지원자)</span>
                  </div>
                  {micReady && (
                    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-md px-2 py-0.5">
                      <svg className="w-3 h-3 text-white/70 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      </svg>
                      {speaking ? (
                        <div className="flex items-end gap-[2px] h-3">
                          {[0.5, 0.9, 0.7, 1, 0.6].map((base, i) => (
                            <div
                              key={i}
                              className="w-0.5 rounded-full bg-green-400 transition-all duration-75"
                              style={{ height: `${Math.max(2, micLevel * base * 12)}px` }}
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-white/60">마이크</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 말하는 중 표시 */}
                {speaking && (
                  <div className="absolute top-2.5 right-2.5">
                    <div className="flex items-center gap-1.5 bg-green-500/80 backdrop-blur-sm rounded-md px-2 py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span className="text-[11px] text-white font-medium">말하는 중</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 레이아웃 설정 (세로) */}
              <div className="flex-1 bg-[#f8f9fc] p-4 flex flex-col justify-center gap-3">
                <p className="text-[11px] text-[#9ca3af] font-medium">화면 레이아웃</p>
                <div className="flex flex-col gap-2">
                  {([
                    {
                      value: "split", title: "화면 분할",
                      icon: <><rect x="2" y="3" width="9" height="18" rx="1.5" /><rect x="13" y="3" width="9" height="18" rx="1.5" /></>,
                      preview: (
                        <svg viewBox="0 0 160 100" className="w-full h-full">
                          <rect width="160" height="100" fill="#f0f2f8" />
                          {/* 면접관 타일 */}
                          <rect x="4" y="4" width="74" height="92" rx="6" fill="#eef0fd" stroke="#c7d2fe" strokeWidth="1.5" />
                          <circle cx="41" cy="38" r="12" fill="#a5a7f3" />
                          <rect x="24" y="56" width="34" height="5" rx="2.5" fill="#c7d2fe" />
                          <rect x="29" y="65" width="24" height="3" rx="1.5" fill="#dde0fc" />
                          <rect x="12" y="88" width="28" height="4" rx="2" fill="#c7d2fe" />
                          {/* 지원자 타일 */}
                          <rect x="82" y="4" width="74" height="92" rx="6" fill="#e8eaf0" stroke="#d1d5db" strokeWidth="1.5" />
                          <circle cx="119" cy="38" r="12" fill="#9ca3af" />
                          <rect x="102" y="56" width="34" height="5" rx="2.5" fill="#d1d5db" />
                          <rect x="107" y="65" width="24" height="3" rx="1.5" fill="#e5e7eb" />
                          <rect x="90" y="88" width="28" height="4" rx="2" fill="#d1d5db" />
                          {/* 레이블 */}
                          <text x="41" y="97" textAnchor="middle" fontSize="6" fill="#6b7280">AI 면접관</text>
                          <text x="119" y="97" textAnchor="middle" fontSize="6" fill="#6b7280">나</text>
                        </svg>
                      ),
                    },
                    {
                      value: "pip", title: "PiP",
                      icon: <><rect x="2" y="3" width="20" height="18" rx="2" /><rect x="13" y="12" width="7" height="5" rx="1" fill="currentColor" stroke="none" /></>,
                      preview: (
                        <svg viewBox="0 0 160 100" className="w-full h-full">
                          <rect width="160" height="100" fill="#f0f2f8" />
                          {/* 면접관 전체 */}
                          <rect x="4" y="4" width="152" height="92" rx="6" fill="#eef0fd" stroke="#c7d2fe" strokeWidth="1.5" />
                          <circle cx="80" cy="38" r="16" fill="#a5a7f3" />
                          <rect x="56" y="62" width="48" height="6" rx="3" fill="#c7d2fe" />
                          <rect x="63" y="72" width="34" height="4" rx="2" fill="#dde0fc" />
                          <rect x="8" y="88" width="30" height="4" rx="2" fill="#c7d2fe" />
                          {/* PiP 지원자 */}
                          <rect x="108" y="60" width="42" height="30" rx="4" fill="#e8eaf0" stroke="white" strokeWidth="2" />
                          <circle cx="129" cy="72" r="7" fill="#9ca3af" />
                          <rect x="119" y="84" width="20" height="3" rx="1.5" fill="#d1d5db" />
                          {/* 레이블 */}
                          <text x="80" y="97" textAnchor="middle" fontSize="6" fill="#6b7280">AI 면접관</text>
                          <text x="129" y="97" textAnchor="middle" fontSize="5" fill="#6b7280">나</text>
                        </svg>
                      ),
                    },
                    {
                      value: "full", title: "면접관만",
                      icon: <rect x="2" y="3" width="20" height="18" rx="2" />,
                      preview: (
                        <svg viewBox="0 0 160 100" className="w-full h-full">
                          <rect width="160" height="100" fill="#f0f2f8" />
                          {/* 면접관 전체 */}
                          <rect x="4" y="4" width="152" height="92" rx="6" fill="#eef0fd" stroke="#c7d2fe" strokeWidth="1.5" />
                          <circle cx="80" cy="36" r="18" fill="#a5a7f3" />
                          <rect x="54" y="62" width="52" height="7" rx="3.5" fill="#c7d2fe" />
                          <rect x="62" y="73" width="36" height="4" rx="2" fill="#dde0fc" />
                          <rect x="8" y="88" width="30" height="4" rx="2" fill="#c7d2fe" />
                          {/* 레이블 */}
                          <text x="80" y="97" textAnchor="middle" fontSize="6" fill="#6b7280">AI 면접관</text>
                        </svg>
                      ),
                    },
                  ] as const).map((opt) => (
                    <div key={opt.value} className="relative group">
                      <button
                        onClick={() => setLayout(opt.value)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-[12px] font-medium transition-all ${
                          layout === opt.value
                            ? "border-[#4f52e8] bg-[#eef0fd] text-[#4f52e8]"
                            : "border-[#e4e7ef] bg-white text-[#6b7280] hover:border-[#a5a7f3]"
                        }`}
                      >
                        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          {opt.icon}
                        </svg>
                        {opt.title}
                      </button>
                      {/* 호버 미리보기 */}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2.5 z-50 hidden group-hover:block pointer-events-none">
                        <div className="bg-white rounded-xl border border-[#e4e7ef] shadow-lg p-2 w-40">
                          <div className="w-full aspect-video rounded-lg overflow-hidden">
                            {opt.preview}
                          </div>
                          <p className="text-center text-[10px] text-[#9ca3af] mt-1.5">{opt.title}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {layout === "split" && (
                  <div className="flex gap-1.5">
                    {(["7:3", "5:5", "3:7"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setSplitRatio(r)}
                        className={`flex-1 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                          splitRatio === r
                            ? "border-[#4f52e8] bg-[#eef0fd] text-[#4f52e8]"
                            : "border-[#e4e7ef] bg-white text-[#9ca3af] hover:border-[#a5a7f3]"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}

                {/* 장치 상태 + 설정 버튼 */}
                <div className="pt-3 border-t border-[#e4e7ef] flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${camReady ? "bg-green-400" : camErr ? "bg-red-400" : "bg-gray-300 animate-pulse"}`} />
                    <span className="text-[11px] text-[#6b7280]">
                      {camErr ? "카메라 오류" : camReady ? "카메라 정상" : "카메라 연결 중..."}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${micReady ? (speaking ? "bg-green-400 animate-pulse" : "bg-green-400") : micErr ? "bg-red-400" : "bg-gray-300 animate-pulse"}`} />
                    <span className="text-[11px] text-[#6b7280]">
                      {micErr ? "마이크 오류" : micReady ? (speaking ? "말하는 중" : "마이크 정상") : "마이크 연결 중..."}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${mediaServerOk === true ? "bg-green-400" : mediaServerOk === false ? "bg-red-400" : "bg-gray-300 animate-pulse"}`} />
                    <span className="text-[11px] text-[#6b7280]">
                      {mediaServerOk === false ? "서버 연결 불가" : mediaServerOk === true ? "서버 정상" : "서버 확인 중..."}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      onClick={() => setShowGuideModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e4e7ef] bg-white text-[11px] font-medium text-[#6b7280] hover:border-[#4f52e8] hover:text-[#4f52e8] transition-all"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      면접 안내
                    </button>
                    <button
                      onClick={() => setShowDeviceModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e4e7ef] bg-white text-[11px] font-medium text-[#6b7280] hover:border-[#4f52e8] hover:text-[#4f52e8] transition-all"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                      장치 설정
                    </button>
                  </div>
                </div>

                {/* 장치 설정 모달 */}
                {showDeviceModal && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowDeviceModal(false); }}
                  >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
                      {/* 모달 헤더 */}
                      <div className="flex items-center justify-between px-5 py-4 border-b border-[#e4e7ef]">
                        <h3 className="text-[15px] font-semibold text-[#0d1035]">장치 설정</h3>
                        <button
                          onClick={() => setShowDeviceModal(false)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151] transition-all"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>

                      {/* 모달 바디 */}
                      <div className="p-5 flex flex-col gap-4">
                        {/* 권한 요청 버튼 */}
                        <button
                          onClick={() => startPreviewStream(selectedCamId || undefined, selectedMicId || undefined)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#4f52e8] bg-[#eef0fd] text-[#4f52e8] text-[13px] font-medium hover:bg-[#e0e3fc] transition-all"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          </svg>
                          권한 요청 / 재연결
                        </button>

                        {/* 카메라 선택 */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[12px] font-medium text-[#374151] flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-[#6b7280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14" /><rect x="1" y="6" width="14" height="12" rx="2" />
                            </svg>
                            카메라
                          </label>
                          {videoDevices.length > 0 ? (
                            <select
                              value={selectedCamId}
                              onChange={(e) => {
                                setSelectedCamId(e.target.value);
                                startPreviewStream(e.target.value, selectedMicId);
                              }}
                              className="w-full text-[13px] text-[#374151] bg-white border border-[#e4e7ef] rounded-xl px-3 py-2 focus:outline-none focus:border-[#4f52e8] cursor-pointer"
                            >
                              {videoDevices.map((d) => (
                                <option key={d.deviceId} value={d.deviceId}>{d.label || `카메라 ${d.deviceId.slice(0, 6)}`}</option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-[12px] text-[#9ca3af] px-1">권한 요청 후 장치 목록이 표시됩니다.</p>
                          )}
                        </div>

                        {/* 마이크 선택 */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[12px] font-medium text-[#374151] flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-[#6b7280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            </svg>
                            마이크
                          </label>
                          {audioDevices.length > 0 ? (
                            <select
                              value={selectedMicId}
                              onChange={(e) => {
                                setSelectedMicId(e.target.value);
                                startPreviewStream(selectedCamId, e.target.value);
                              }}
                              className="w-full text-[13px] text-[#374151] bg-white border border-[#e4e7ef] rounded-xl px-3 py-2 focus:outline-none focus:border-[#4f52e8] cursor-pointer"
                            >
                              {audioDevices.map((d) => (
                                <option key={d.deviceId} value={d.deviceId}>{d.label || `마이크 ${d.deviceId.slice(0, 6)}`}</option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-[12px] text-[#9ca3af] px-1">권한 요청 후 장치 목록이 표시됩니다.</p>
                          )}
                        </div>

                        {/* 스피커 선택 */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[12px] font-medium text-[#374151] flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-[#6b7280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                            </svg>
                            스피커
                          </label>
                          {speakerDevices.length > 0 ? (
                            <select
                              value={selectedSpeakerId}
                              onChange={(e) => setSelectedSpeakerId(e.target.value)}
                              className="w-full text-[13px] text-[#374151] bg-white border border-[#e4e7ef] rounded-xl px-3 py-2 focus:outline-none focus:border-[#4f52e8] cursor-pointer"
                            >
                              {speakerDevices.map((d) => (
                                <option key={d.deviceId} value={d.deviceId}>{d.label || `스피커 ${d.deviceId.slice(0, 6)}`}</option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-[12px] text-[#9ca3af] px-1">권한 요청 후 장치 목록이 표시됩니다.</p>
                          )}
                        </div>
                      </div>

                      {/* 모달 푸터 */}
                      <div className="px-5 pb-5">
                        <button
                          onClick={() => setShowDeviceModal(false)}
                          className="w-full py-2.5 rounded-xl bg-[#4f52e8] hover:bg-[#3e41d4] text-white text-[13px] font-semibold transition-all"
                        >
                          확인
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 카드 내용 */}
            <div className="p-7">
              <h2 className="text-[20px] font-bold text-[#0d1035] mb-1 text-center">화상 면접 입장</h2>
              <p className="text-[13px] text-[#6b7280] mb-5 text-center leading-relaxed">
                카메라와 마이크 권한이 필요합니다.<br />조용한 공간에서 시작해주세요.
              </p>

              <div className="bg-[#f8f9fc] rounded-xl border border-[#e4e7ef] px-4 py-3 mb-4 flex items-center justify-around">
                {[
                  { label: "준비된 질문", value: questionsLoading ? `${questionsProgress}%` : `${questionCount}개` },
                  { label: "예상 소요 시간", value: questionsLoading || questionCount === 0 ? "-" : `약 ${questionCount * 4}~${questionCount * 5}분` },
                  { label: "면접관 스타일", value: interviewStyle || "부드러운" },
                ].map((s, i, arr) => (
                  <div key={s.label} className={`flex flex-col items-center gap-0.5 text-center ${i < arr.length - 1 ? "border-r border-[#e4e7ef] pr-6 mr-6" : ""}`}>
                    <span className="text-[11px] text-[#9ca3af]">{s.label}</span>
                    <span className="text-[13px] font-semibold text-[#374151]">{s.value}</span>
                  </div>
                ))}
              </div>

              {/* 질문 생성 진행률 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] text-[#6b7280]">
                    {questionsLoading ? questionsStep : "질문 생성 완료"}
                  </span>
                  <div className="flex items-center gap-2">
                    {questionsLoading && (
                      <span className="text-[11px] text-[#9ca3af]">약 1~2분 소요</span>
                    )}
                    <span className="text-[12px] font-semibold text-[#4f52e8]">{questionsProgress}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-[#e4e7ef] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#4f52e8] rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${questionsProgress}%` }}
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  if (selectedCamId) sessionStorage.setItem("selectedCamId", selectedCamId);
                  if (selectedMicId) sessionStorage.setItem("selectedMicId", selectedMicId);
                  if (selectedSpeakerId) sessionStorage.setItem("selectedSpeakerId", selectedSpeakerId);
                  onStart();
                }}
                disabled={!camReady || !micReady || mediaServerOk !== true || questionsLoading}
                className={`w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-all text-[14px] ${
                  camReady && micReady && mediaServerOk === true && !questionsLoading
                    ? "bg-[#4f52e8] hover:bg-[#3e41d4] text-white shadow-md shadow-[#4f52e8]/20"
                    : "bg-[#e4e7ef] text-[#9ca3af] cursor-not-allowed"
                }`}
              >
                {camErr || micErr
                  ? "카메라·마이크 권한이 필요합니다"
                  : mediaServerOk === false
                  ? "서버와 연결할 수 없습니다"
                  : questionsLoading
                  ? <span>AI 질문 생성 중...</span>
                  : !camReady || !micReady || mediaServerOk === null
                  ? "연결 확인 중..."
                  : <><span>면접 입장하기</span><IconArrowRight /></>}
              </button>
            </div>
          </div>
        </div>
      </div>
      {showGuideModal && (
        <InterviewGuideModal onClose={() => setShowGuideModal(false)} />
      )}
    </div>
  );
}

/* ── 메인 ── */
export default function InterviewPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<"ready" | "call" | "done">("ready");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [aiSpeakingText, setAiSpeakingText] = useState("");
  const [aiDisplayText, setAiDisplayText] = useState("");
  const typewriterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [camError, setCamError] = useState(false);
  const [layout, setLayout] = useState<"split" | "pip" | "full">("pip");
  const [splitRatio, setSplitRatio] = useState<"5:5" | "7:3" | "3:7">("5:5");
  // 추가질문 Wav2Lip 영상 백그라운드 생성 결과 (질문 텍스트 → 영상 URL)
  const additionalVideosRef = useRef<Record<string, string>>({});

  const videoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const micLevelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qIdxRef = useRef(0);
  const messagesRef = useRef<Msg[]>([]);
  const speakTextRef = useRef<(text: string) => Promise<void>>(async () => {});
  const phaseRef = useRef<"ready" | "call" | "done">("ready");
  const [micLevel, setMicLevel] = useState(0);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportStep, setReportStep] = useState("");
  const [reportReady, setReportReady] = useState(false);
  const [reportProgress, setReportProgress] = useState(0);
  const reportStartedRef = useRef(false);
  const [showReportSurveyModal, setShowReportSurveyModal] = useState(false);
  const reportSurveyShownRef = useRef(false);
  const [mediaServerError, setMediaServerError] = useState(false);
  const [lipVideoSrc, setLipVideoSrc] = useState<string | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const recognitionRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [answerElapsed, setAnswerElapsed] = useState(0);
  const answerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopRecordingRef = useRef<() => void>(() => {});
  const [sttLoading, setSttLoading] = useState(false);
  const [sttStep, setSttStep] = useState("답변 분석 중...");
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null);
  const [pendingAnswerEdited, setPendingAnswerEdited] = useState("");
  // 꼬리질문: 규칙 기반 판정 후 비동기 생성 결과 저장
  // undefined = 아직 로딩 중, null = 꼬리질문 불필요, string = 꼬리질문
  const pendingFollowupRef = useRef<string | null | undefined>(null);
  // 꼬리질문으로 삽입된 질문 텍스트 추적 (무한 꼬리질문 방지)
  const followupTextsRef = useRef<Set<string>>(new Set());
  const [showCallDeviceModal, setShowCallDeviceModal] = useState(false);

  // ── 커스텀 훅 ──
  const {
    questions, questionsRef, setQuestions, questionCategories,
    questionsLoading, questionsProgress, questionsStep, questionError,
    interviewStyle, avatarSrc, resolvedStyleRef,
  } = useInterviewQuestions();

  const getTtsVoice = () =>
    resolvedStyleRef.current === "pressure" ? "ko-KR-SunHiNeural" : "ko-KR-InJoonNeural";

  // avatarSrc는 state라 useCallback 클로저에 stale하게 캡처됨 → ref로 항상 최신값 유지
  const avatarSrcRef = useRef(avatarSrc);
  useEffect(() => { avatarSrcRef.current = avatarSrc; }, [avatarSrc]);

  const {
    streamRef,
    callVideoDevices, callAudioDevices, callSpeakerDevices,
    callSelectedCamId, callSelectedMicId, callSelectedSpeakerId, callSelectedSpeakerIdRef,
    setCallSelectedCamId, setCallSelectedMicId, setCallSelectedSpeakerId,
    startCam, switchCallDevices,
  } = useCallMedia(videoRef, pipVideoRef, audioRef);

  useEffect(() => {
    if (phase !== "call") return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => { qIdxRef.current = qIdx; }, [qIdx]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // 질문 수 부족 시 설정 화면으로 리다이렉트
  useEffect(() => {
    if (!questionsLoading && questionError) {
      sessionStorage.setItem("questionGenerationError", "true");
      router.replace("/setup");
    }
  }, [questionsLoading, questionError, router]);


  useEffect(() => {
    if (phase === "done" && messages.length > 0) {
      sessionStorage.setItem("interviewMessages", JSON.stringify(messages));
      // 세션 영상 폴더 즉시 삭제
      fetch(`${MEDIA_API}/api/wav2lip/session/${sessionId}`, { method: "DELETE" }).catch(() => {});
    }
  }, [phase, messages]);

  // 면접 종료 후 리포트 자동 생성
  useEffect(() => {
    if (phase !== "done") return;
    if (reportStartedRef.current) return;
    reportStartedRef.current = true;

    const msgs = messagesRef.current;
    const aiQuestions = msgs.filter(m => m.role === "ai" && !m.text.includes("수고하셨습니다")).map(m => m.text);
    const userAnswers = msgs.filter(m => m.role === "user").map(m => m.text);
    const settings = JSON.parse(sessionStorage.getItem("interviewSettings") || "{}");

    setReportLoading(true);
    setReportStep("답변 분석 중...");

    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/ai/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questions: aiQuestions,
            answers: userAnswers,
            department: settings.department || "",
            interviewType: settings.interviewType || "mixed",
          }),
        });

        if (!res.ok || !res.body) throw new Error("리포트 생성 실패");

        for await (const event of parseSSE(res)) {
          if (event.type === "progress") {
            setReportProgress((event.progress as number) ?? 0);
            setReportStep((event.progress as number) < 50 ? "답변 분석 중..." : "리포트 작성 중...");
          } else if (event.type === "done") {
            sessionStorage.setItem("interviewReport", JSON.stringify({
              ...(event.data as object),
              questions: aiQuestions,
              answers: userAnswers,
            }));
            setReportReady(true);
          } else if (event.type === "error") {
            console.error("리포트 생성 오류 (SSE):", event.message);
            setReportReady(true); // 에러여도 리포트 페이지 이동 가능
          }
        }
      } catch (e) {
        console.error("리포트 생성 오류:", e);
        setReportReady(true); // 실패해도 리포트 페이지 이동 가능
      } finally {
        setReportLoading(false);
      }
    })();
  }, [phase]);

  useEffect(() => {
    if (phase !== "done" || !reportLoading || reportSurveyShownRef.current) return;
    reportSurveyShownRef.current = true;
    const t = setTimeout(() => setShowReportSurveyModal(true), 3000);
    return () => clearTimeout(t);
  }, [phase, reportLoading]);

  const processAnswer = useCallback((text: string, msgId?: number) => {
    const currentQIdx = qIdxRef.current;
    const currentMessages = messagesRef.current;
    const next = currentQIdx + 1;
    const newMsgs: Msg[] = [...currentMessages, { id: msgId, role: "user", text, time: now() }];

    if (next < questionsRef.current.length) {
      setMessages(newMsgs);
      setQIdx(next);
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: "ai", text: questionsRef.current[next], time: now() }]);
        speakTextRef.current(questionsRef.current[next]);
      }, 600);
    } else {
      const finalMsg = "모든 질문이 끝났습니다. 오늘 면접 정말 수고하셨습니다!";
      newMsgs.push({ role: "ai", text: finalMsg, time: now() });
      setMessages(newMsgs);
      setPhase("done");
      streamRef.current?.getTracks().forEach((t) => t.stop());
      // 이미 로딩 중 재생 시작됐을 수 있으므로, 영상이 없을 때만 speakText 호출
      if (!additionalVideosRef.current[finalMsg]) {
        speakTextRef.current(finalMsg);
      }
    }
  }, []);

  const startListening = useCallback(() => {
    if (phaseRef.current !== "call") return;
    const stream = streamRef.current;
    if (!stream) return;

    const maxTime = 90;

    setAnswerElapsed(0);
    setRecording(true);

    if (answerTimerRef.current) clearInterval(answerTimerRef.current);
    answerTimerRef.current = setInterval(() => {
      setAnswerElapsed((prev) => prev + 1);
    }, 1000);

    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    const source = audioCtx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
    source.connect(analyser);
    const levelData = new Uint8Array(analyser.frequencyBinCount);

    micLevelIntervalRef.current = setInterval(() => {
      analyser.getByteFrequencyData(levelData);
      const avg = levelData.reduce((a, b) => a + b, 0) / levelData.length;
      setMicLevel(Math.min(avg / 40, 1));
    }, 80);

    const chunks: Blob[] = [];
    let stopped = false;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    const recorder = new MediaRecorder(new MediaStream(stream.getAudioTracks()), { mimeType });
    recognitionRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      source.disconnect();
      audioCtx.close();
      if (micLevelIntervalRef.current) clearInterval(micLevelIntervalRef.current);
      if (answerTimerRef.current) clearInterval(answerTimerRef.current);
      setMicLevel(0);
      setAnswerElapsed(0);
      setRecording(false);
      recognitionRef.current = null;
      stopRecordingRef.current = () => {};

      if (chunks.length === 0) return;

      // STT 변환만 — 분석/영상생성은 다음 질문 버튼에서
      setSttLoading(true);
      setSttStep("답변 변환 중...");
      const blob = new Blob(chunks, { type: mimeType });
      const form = new FormData();
      form.append("audio", blob, "answer.webm");
      try {
        const r = await fetch(`${MEDIA_API}/api/stt/transcribe`, { method: "POST", body: form });
        const data = await r.json();
        const text = (data.text ?? "").trim()
          .replace(/[\(\[（【][^\)\]）】]{0,20}[\)\]）】]?/g, "")
          .replace(/^[\s\-–—·]+/, "")
          .replace(/[\s\-–—·]+$/, "")
          .trim();
        const finalText = text.length >= 2 ? text : "";

        setPendingAnswer(finalText);
        setPendingAnswerEdited(finalText);
      } catch {
        setMediaServerError(true);
      } finally {
        setSttLoading(false);
        setSttStep("답변 변환 중...");
      }
    };

    // 최대 답변 시간 초과 시 자동 종료
    const safetyTimer = setTimeout(() => {
      if (!stopped) {
        stopped = true;
        recorder.stop();
      }
    }, maxTime * 1000);

    // 답변 종료 버튼용 외부 stop 함수
    stopRecordingRef.current = () => {
      if (!stopped) {
        stopped = true;
        clearTimeout(safetyTimer);
        recorder.stop();
      }
    };

    recorder.addEventListener("stop", () => clearTimeout(safetyTimer), { once: true });
    recorder.start(500);
  }, [sessionId]);

  // 사전 렌더링 영상 재생 완료 시 호출
  const startTypewriter = useCallback((text: string, durationMs: number) => {
    if (typewriterTimerRef.current) clearInterval(typewriterTimerRef.current);
    setAiDisplayText("");
    const msPerChar = Math.max(15, Math.min(60, (durationMs * 0.35) / text.length));
    let i = 0;
    typewriterTimerRef.current = setInterval(() => {
      i++;
      setAiDisplayText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(typewriterTimerRef.current!);
        typewriterTimerRef.current = null;
      }
    }, msPerChar);
  }, []);

  const stopTypewriter = useCallback(() => {
    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
      typewriterTimerRef.current = null;
    }
    setAiDisplayText("");
  }, []);

  const handleAvatarVideoEnded = useCallback(() => {
    stopTypewriter();
    setAiSpeaking(false);
    setAiSpeakingText("");
    setLipVideoSrc(null);
    if (phaseRef.current === "call" && !document.hidden) startListening();
  }, [startListening, stopTypewriter]);

  const speakText = useCallback(async (text: string) => {
    setAiSpeakingText(text);
    stopTypewriter();

    // 1. 백그라운드에서 생성된 추가질문 Wav2Lip 영상 (타이프라이터는 onVideoMetadata 콜백에서 시작)
    const dynamicVideo = additionalVideosRef.current[text];
    if (dynamicVideo) {
      setAiSpeaking(true);
      setLipVideoSrc(dynamicVideo);
      return;
    }

    // 2. fallback: TTS API
    try {
      setAiSpeaking(true);
      const res = await fetch(`${MEDIA_API}/api/tts/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: getTtsVoice() }),
      });
      const data = await res.json();
      if (!data.success) {
        stopTypewriter();
        setAiSpeaking(false);
        setAiSpeakingText("");
        if (phaseRef.current === "call" && !document.hidden) startListening();
        return;
      }
      const audio = new Audio(`${MEDIA_API}${data.path}`);
      if (callSelectedSpeakerIdRef.current && typeof (audio as any).setSinkId === "function") {
        await (audio as any).setSinkId(callSelectedSpeakerIdRef.current).catch(() => {});
      }
      audioRef.current = audio;
      // 메타데이터 로드 후 재생 시간 기반 타이프라이터 시작
      const onMeta = () => {
        if (isFinite(audio.duration) && audio.duration > 0) {
          startTypewriter(text, audio.duration * 1000);
        }
      };
      if (audio.readyState >= 1 && isFinite(audio.duration)) {
        onMeta();
      } else {
        audio.addEventListener("loadedmetadata", onMeta, { once: true });
      }
      audio.onended = () => {
        audioRef.current = null;
        stopTypewriter();
        setAiSpeaking(false);
        setAiSpeakingText("");
        setLipVideoSrc(null);
        if (phaseRef.current === "call" && !document.hidden) startListening();
      };
      audio.onerror = () => {
        audioRef.current = null;
        stopTypewriter();
        setAiSpeaking(false);
        setAiSpeakingText("");
        setLipVideoSrc(null);
      };
      await audio.play();
    } catch {
      stopTypewriter();
      setAiSpeaking(false);
      setAiSpeakingText("");
      if (phaseRef.current === "call" && !document.hidden) startListening();
    }
  }, [startListening, startTypewriter, stopTypewriter]);

  useEffect(() => { speakTextRef.current = speakText; }, [speakText]);

  // 탭 전환 또는 언마운트 시 STT/TTS 강제 중단
  useEffect(() => {
    const stopAll = () => {
      if (recognitionRef.current && recognitionRef.current.state !== "inactive") {
        recognitionRef.current.stop();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
        setAiSpeaking(false);
      }
    };
    const handleVisibility = () => { if (document.hidden) stopAll(); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      stopAll();
    };
  }, []);

  // avatarSrc가 스타일별 이미지로 확정되는 순간(= 질문 생성 시작과 동시) 자기소개 영상 미리 생성
  useEffect(() => {
    if (avatarSrc === "/avatar.png") return; // 아직 스타일 미확정
    if (additionalVideosRef.current[INTERVIEW_INTRO_QUESTION]) return;
    (async () => {
      try {
        const res = await fetch(`${MEDIA_API}/api/wav2lip/synthesize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: INTERVIEW_INTRO_QUESTION,
            sessionId,
            voice: getTtsVoice(),
            imagePath: avatarSrc,
          }),
        });
        const data = await res.json();
        if (data.success && data.videoPath) {
          additionalVideosRef.current[INTERVIEW_INTRO_QUESTION] = `${MEDIA_API}${data.videoPath}`;
        }
      } catch { /* 실패 시 TTS 폴백 */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarSrc]);

  useEffect(() => {
    if (phase === "call" && streamRef.current) {
      if (videoRef.current) videoRef.current.srcObject = streamRef.current;
      if (pipVideoRef.current) pipVideoRef.current.srcObject = streamRef.current;
    }
  }, [phase]);

  useEffect(() => {
    if (!streamRef.current) return;
    const t = setTimeout(() => {
      if (layout === "split" && videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      if (layout === "pip" && pipVideoRef.current) {
        pipVideoRef.current.srcObject = streamRef.current;
      }
    }, 50);
    return () => clearTimeout(t);
  }, [layout]);

  const startCall = async () => {
    const ok = await startCam();
    if (!ok) { setCamError(true); return; }
    setPhase("call");

    console.log("[면접시작] 전체 질문:", questionsRef.current);

    setTimeout(() => {
      setMessages([{ role: "ai", text: questionsRef.current[0], time: now() }]);
      speakText(questionsRef.current[0]);
    }, 800);
  };

  const endCall = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setPhase("done");
  };

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // 답변 분석 중(sttLoading)에는 다음 질문 번호로 미리 표시
  const displayQIdx = sttLoading && pendingAnswer !== null
    ? Math.min(qIdx + 1, questionsRef.current.length)
    : qIdx;
  const progress = Math.round((displayQIdx / questionsRef.current.length) * 100);
  const currentQ = questionsRef.current[Math.min(qIdx, questionsRef.current.length - 1)];
  const currentCategory = questionCategories[qIdx] ?? (qIdx === 0 ? "소개" : "면접");
  const phaseLabel = currentCategory;

  const faceMetrics = useFaceAnalysis(videoRef, sessionId, phase === "call");

  const gazeLabel: Record<string, string> = {
    center: "정면", left: "좌측", right: "우측", up: "위", down: "아래",
  };
  const gazeColor: Record<string, string> = {
    center: "bg-green-500", left: "bg-yellow-400", right: "bg-yellow-400",
    up: "bg-orange-400", down: "bg-orange-400",
  };

  if (phase === "ready") return <ReadyScreen onStart={startCall} layout={layout} setLayout={setLayout} splitRatio={splitRatio} setSplitRatio={setSplitRatio} questionsReady={!questionsLoading} questionsLoading={questionsLoading} questionCount={questions.length} questionsProgress={questionsProgress} questionsStep={questionsStep} interviewStyle={interviewStyle} questionList={questions} questionCategories={questionCategories} />;

  return (
    <>
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
      `}</style>

      <div className="h-screen bg-[#f0f2f8] flex flex-col overflow-hidden select-none">
        {/* 서버 연결 오류 오버레이 */}
        {mediaServerError && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white rounded-2xl border border-[#e4e7ef] shadow-xl p-8 max-w-sm w-full mx-4 flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23" />
                  <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" /><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                  <path d="M10.71 5.05A16 16 0 0 1 22.56 9" /><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-[16px] font-bold text-[#0d1035] mb-1">서버와 연결할 수 없습니다</p>
                <p className="text-[13px] text-[#6b7280] leading-relaxed">서버와의 연결이 끊어졌습니다. 잠시 후 다시 시도해주세요.</p>
              </div>
              <button
                onClick={() => { setMediaServerError(false); endCall(); }}
                className="w-full py-2.5 rounded-xl bg-[#0d1035] hover:bg-[#1a1f4e] text-white text-[13px] font-semibold transition-colors"
              >
                면접 종료
              </button>
            </div>
          </div>
        )}

        {/* ── 상단 바 ── */}
        <div className="flex-shrink-0 bg-white border-b border-[#e4e7ef] flex items-center justify-between px-5 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            {/* 로고 */}
            <Link href="/" className="flex items-center gap-2 mr-2">
        <span className="font-semibold text-[14px] text-[#0d1035]">AI기반 맞춤 면접 도우미</span>
            </Link>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              phase === "done"
                ? "bg-[#f8f9fc] text-[#9ca3af] border-[#e4e7ef]"
                : "bg-red-50 text-red-500 border-red-200"
            }`}>
              {phase !== "done" && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
              {phase === "done" ? "면접 종료" : "면접 진행 중"}
            </div>
            <span className="text-[#9ca3af] text-[12px] hidden sm:block">컴퓨터소프트웨어과 · 혼합 면접</span>
          </div>

          <div className="flex items-center gap-5">
            {/* 레이아웃 선택 */}
            <div className="hidden sm:flex items-center gap-1 bg-[#f0f2f8] rounded-lg p-0.5">
              {/* 분할 */}
              <button onClick={() => setLayout("split")} title="화면 분할" className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${layout === "split" ? "bg-white text-[#4f52e8] shadow-sm border border-[#e4e7ef]" : "text-[#9ca3af] hover:text-[#374151]"}`}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="9" height="18" rx="1.5" /><rect x="13" y="3" width="9" height="18" rx="1.5" />
                </svg>
              </button>
              {/* PiP */}
              <button onClick={() => setLayout("pip")} title="PiP (내 화면 작게)" className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${layout === "pip" ? "bg-white text-[#4f52e8] shadow-sm border border-[#e4e7ef]" : "text-[#9ca3af] hover:text-[#374151]"}`}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="18" rx="2" /><rect x="13" y="12" width="7" height="5" rx="1" fill="currentColor" stroke="none" />
                </svg>
              </button>
              {/* 면접관만 */}
              <button onClick={() => setLayout("full")} title="면접관 전체화면" className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${layout === "full" ? "bg-white text-[#4f52e8] shadow-sm border border-[#e4e7ef]" : "text-[#9ca3af] hover:text-[#374151]"}`}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="18" rx="2" />
                </svg>
              </button>
            </div>
            {/* 분할 비율 (split 모드에서만) */}
            {layout === "split" && (
              <div className="hidden sm:flex items-center gap-1 bg-[#f0f2f8] rounded-lg p-0.5">
                {(["7:3", "5:5", "3:7"] as const).map((r) => (
                  <button key={r} onClick={() => setSplitRatio(r)} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${splitRatio === r ? "bg-white text-[#4f52e8] shadow-sm border border-[#e4e7ef]" : "text-[#9ca3af] hover:text-[#374151]"}`}>
                    {r}
                  </button>
                ))}
              </div>
            )}
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="w-28 h-1.5 bg-[#e4e7ef] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#4f52e8] rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[11px] text-[#9ca3af] font-medium">
                <span className={`mr-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${CATEGORY_STYLE[currentCategory] ?? "bg-gray-100 text-gray-500"}`}>{phaseLabel}</span>
                {displayQIdx}/{questionsRef.current.length}
              </span>
            </div>
            <span className="font-mono text-[13px] font-semibold text-[#374151]">{fmtTime(elapsed)}</span>
          </div>
        </div>

        {/* ── 메인 영역 ── */}
        <div className="flex-1 flex gap-3 p-3 min-h-0 overflow-hidden">

          {/* 면접관 타일 */}
          <div
            className="relative rounded-2xl overflow-hidden bg-[#eef0fd] border border-[#c7d2fe] flex flex-col shadow-sm transition-all duration-300"
            style={{ flex: layout === "split" ? (splitRatio === "7:3" ? 7 : splitRatio === "3:7" ? 3 : 1) : 1 }}
          >
            <div className="flex-1 flex items-center justify-center">
              <AIAvatar speaking={aiSpeaking} lipVideoSrc={lipVideoSrc} onVideoEnded={handleAvatarVideoEnded} onVideoMetadata={(ms) => startTypewriter(aiSpeakingText, ms)} avatarSrc={avatarSrc} />
            </div>


            {/* 이름 태그 */}
            <div className="absolute top-3 left-3">
              <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-lg px-2.5 py-1 border border-[#e4e7ef] shadow-sm">
                {aiSpeaking && <span className="w-1.5 h-1.5 rounded-full bg-[#4f52e8] animate-pulse" />}
                <span className="text-[12px] text-[#374151] font-medium">AI 면접관</span>
              </div>
            </div>

            {/* 자막 */}
            {aiSpeaking && aiDisplayText && (
              <div
                className="absolute bottom-0 left-0 right-0 pt-12 pb-4 bg-gradient-to-t from-black/75 via-black/40 to-transparent pointer-events-none transition-all"
                style={{ paddingLeft: "20px", paddingRight: layout === "pip" ? "200px" : "20px" }}
              >
                <p className="text-white text-[14px] font-semibold leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                  {aiDisplayText}
                </p>
              </div>
            )}


            {/* PiP: 내 화면 오른쪽 하단 */}
            {layout === "pip" && (
              <div className="absolute bottom-4 right-4 w-44 aspect-video rounded-xl overflow-hidden border-2 border-white shadow-lg">
                <video ref={pipVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                {camError && (
                  <div className="absolute inset-0 bg-[#e8eaf0] flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#d1d5db]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-1.5 left-1.5">
                  <div className="flex items-center gap-1 bg-black/40 rounded-md px-1.5 py-0.5">
                    {recording && <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />}
                    <span className="text-[10px] text-white font-medium">나</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 지원자 타일 (split 모드에서만) */}
          {layout === "split" && (
            <div
              className="relative rounded-2xl overflow-hidden bg-[#e8eaf0] border border-[#d1d5db] shadow-sm transition-all duration-300"
              style={{ flex: splitRatio === "3:7" ? 7 : splitRatio === "7:3" ? 3 : 1 }}
            >
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />

              {camError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#f0f2f8]">
                  <div className="w-16 h-16 rounded-full bg-white border border-[#e4e7ef] flex items-center justify-center shadow-sm">
                    <svg className="w-7 h-7 text-[#d1d5db]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <span className="text-[12px] text-[#9ca3af]">카메라를 사용할 수 없습니다</span>
                </div>
              )}

              <div className="absolute top-3 left-3">
                <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-lg px-2.5 py-1 border border-[#e4e7ef] shadow-sm">
                  {recording && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                  <span className="text-[12px] text-[#374151] font-medium">나 (지원자)</span>
                </div>
              </div>

              {/* 얼굴 분석 오버레이 */}
              {faceMetrics.faceDetected && (
                <div className="absolute bottom-3 left-3 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-md px-2 py-1">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${gazeColor[faceMetrics.gaze]}`} />
                    <span className="text-[10px] text-white font-medium">시선: {gazeLabel[faceMetrics.gaze]}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-md px-2 py-1">
                    <span className="text-[10px] text-white font-medium">
                      눈 깜빡임: {faceMetrics.blinkCount}회
                    </span>
                  </div>
                </div>
              )}
              {!faceMetrics.faceDetected && phase === "call" && (
                <div className="absolute bottom-3 left-3">
                  <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-md px-2 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    <span className="text-[10px] text-white/70">얼굴 감지 중...</span>
                  </div>
                </div>
              )}

              {!recording && phase !== "done" && (
                <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center border border-[#e4e7ef] shadow-sm">
                  <svg className="w-4 h-4 text-[#9ca3af]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                </div>
              )}
            </div>
          )}

        </div>

        {/* STT 변환 중 블러 오버레이 */}
        {sttLoading && (
          <div className="absolute inset-0 z-30 backdrop-blur-sm bg-black/40 flex flex-col items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl px-10 py-8 border border-white/20 min-w-[260px]">
              <svg className="animate-spin w-9 h-9 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-white text-[16px] font-semibold text-center">{sttStep}</span>
              <span className="text-white/60 text-[13px] text-center">잠시만 기다려주세요.</span>
            </div>
          </div>
        )}

        {/* ── 컨트롤 바 ── */}
        <div className="flex-shrink-0 bg-white border-t border-[#e4e7ef] px-5 py-3 shadow-[0_-1px_8px_rgba(0,0,0,0.04)]">
          {phase === "done" ? (
            <div className="flex flex-col items-center gap-2.5 py-1 w-full max-w-lg mx-auto">
              {reportLoading ? (
                <>
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[12px] text-[#6b7280]">{reportStep}</span>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] text-[#9ca3af]">약 3~5분 소요 예상</span>
                      <span className="text-[12px] font-semibold text-[#4f52e8]">{reportProgress}%</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-[#e4e7ef] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4f52e8] rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${reportProgress}%` }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-[13px] text-[#6b7280]">
                  {reportReady ? "면접이 종료되었습니다. 수고하셨습니다!" : "잠시 대기 중..."}
                </p>
              )}
              <button
                onClick={() => reportReady && router.push("/report")}
                disabled={!reportReady}
                className={`inline-flex items-center gap-2 font-semibold px-8 py-2.5 rounded-xl transition-colors text-[14px] ${
                  !reportReady
                    ? "bg-[#e4e7ef] text-[#9ca3af] cursor-not-allowed"
                    : "bg-[#4f52e8] hover:bg-[#3e41d4] text-white"
                }`}
              >
                {!reportReady ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  {reportStep || "준비 중..."}</>
                ) : (
                  <>결과 리포트 보기 <IconArrowRight /></>
                )}
              </button>
            </div>
          ) : pendingAnswer !== null ? (
            /* 답변 검토 패널 */
            <div className="flex items-start gap-3 w-full">
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-semibold text-[#374151]">답변 확인</span>
                  <span className="text-[11px] text-[#9ca3af]">내용을 수정하거나 그대로 진행하세요</span>

                </div>
                <textarea
                  value={pendingAnswerEdited}
                  onChange={(e) => setPendingAnswerEdited(e.target.value)}
                  rows={3}
                  placeholder="인식된 답변이 없습니다. 직접 입력하거나 재답변하세요."
                  className="w-full text-[12px] text-[#374151] bg-[#f8f9fc] border border-[#e4e7ef] rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-[#4f52e8] leading-relaxed"
                />
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0 pt-5">
                {/* 재답변 */}
                <button
                  onClick={() => {
                    setPendingAnswer(null);
                    setPendingAnswerEdited("");
                    startListening();
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f0f2f8] hover:bg-[#e4e7ef] text-[#374151] text-[12px] font-semibold transition-all border border-[#e4e7ef]"
                >
                  <IconMic className="w-3.5 h-3.5" />
                  재답변
                </button>
                {/* 다음 질문 */}
                <button
                  onClick={async () => {
                    const answer = pendingAnswerEdited.trim() || "(답변 없음)";

                    // 꼬리질문 분석 + 영상 생성
                    setSttLoading(true);
                    setSttStep("답변 분석 중...");
                    pendingFollowupRef.current = null;
                    const currentQ = questionsRef.current[qIdxRef.current];
                    let nextSpeakText: string | null = null;

                    if (!followupTextsRef.current.has(currentQ)) {
                      try {
                        const settings = JSON.parse(sessionStorage.getItem("interviewSettings") || "{}");
                        const fRes = await fetch(`${BACKEND_URL}/ai/followup`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            question: currentQ,
                            answer,
                            department: settings.department || "",
                            jobRole: settings.jobRole || "",
                            companyType: settings.companyType || "",
                            experienceLevel: settings.experienceLevel || "newcomer",
                            style: resolvedStyleRef.current,
                          }),
                        });
                        const fData = await fRes.json();
                        const followupQ: string | null = fData.followup || null;
                        if (followupQ) {
                          pendingFollowupRef.current = followupQ;
                          nextSpeakText = followupQ;
                        }
                      } catch { /* 꼬리질문 분석 실패 시 무시 */ }
                    }

                    // 꼬리질문 없으면 다음 정규 질문(또는 마무리 멘트)
                    const isLastQuestion = !nextSpeakText && qIdxRef.current + 1 >= questionsRef.current.length;
                    const ENDING_MSG = "모든 질문이 끝났습니다. 오늘 면접 정말 수고하셨습니다!";
                    if (!nextSpeakText) {
                      const nextIdx = qIdxRef.current + 1;
                      nextSpeakText = nextIdx < questionsRef.current.length
                        ? questionsRef.current[nextIdx]
                        : ENDING_MSG;
                    }

                    // 다음 말할 텍스트의 영상이 없으면 지금 생성
                    if (nextSpeakText && !additionalVideosRef.current[nextSpeakText]) {
                      try {
                        const vRes = await fetch(`${MEDIA_API}/api/wav2lip/synthesize`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ text: nextSpeakText, sessionId, voice: getTtsVoice(), imagePath: avatarSrcRef.current }),
                        });
                        const vData = await vRes.json();
                        if (vData.success && vData.videoPath) {
                          additionalVideosRef.current[nextSpeakText] = `${MEDIA_API}${vData.videoPath}`;
                        }
                      } catch { /* 영상 생성 실패 시 TTS 폴백 */ }
                    }

                    // 마지막 질문이면 로딩 중에 바로 영상 재생 시작
                    if (isLastQuestion) {
                      speakTextRef.current(ENDING_MSG);
                    }

                    // 꼬리질문 삽입
                    const followup = pendingFollowupRef.current;
                    if (followup && !followupTextsRef.current.has(currentQ)) {
                      const newQs = questionsRef.current.slice();
                      newQs.splice(qIdxRef.current + 1, 0, followup);
                      questionsRef.current = newQs;
                      setQuestions(newQs);
                      followupTextsRef.current.add(followup);
                    }
                    pendingFollowupRef.current = null;

                    setSttLoading(false);
                    setSttStep("답변 변환 중...");
                    processAnswer(answer);
                    setPendingAnswer(null);
                    setPendingAnswerEdited("");
                  }}
                  disabled={sttLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4f52e8] hover:bg-[#3e41d4] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[12px] font-semibold transition-all shadow-sm"
                >
                  다음 질문
                  <IconArrowRight />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2.5">
              {/* 마이크 상태 표시 (왼쪽) */}
              <div className="flex items-center gap-3 flex-1">
                {recording && (() => {
                  const maxTime = 90;
                  const remaining = maxTime - answerElapsed;
                  const isUrgent = remaining <= 20;
                  return (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4f52e8] animate-pulse flex-shrink-0" />
                      <div className="flex items-end gap-[2px] h-4">
                        {[0.4, 0.7, 1, 0.6, 0.85, 0.5, 0.75, 0.9, 0.55, 0.7].map((base, i) => (
                          <div key={i} className="w-[2px] rounded-full bg-[#4f52e8] transition-all duration-75"
                            style={{ height: `${Math.max(2, micLevel * base * 16)}px` }} />
                        ))}
                      </div>
                      {/* 답변 시간 */}
                      <span className={`font-mono text-[12px] font-semibold tabular-nums ${isUrgent ? "text-red-500" : "text-[#374151]"}`}>
                        {String(Math.floor(answerElapsed / 60)).padStart(2, "0")}:{String(answerElapsed % 60).padStart(2, "0")}
                        <span className={`text-[11px] font-normal ml-1 ${isUrgent ? "text-red-400" : "text-[#9ca3af]"}`}>
                          / {String(Math.floor(maxTime / 60)).padStart(2, "0")}:{String(maxTime % 60).padStart(2, "0")}
                        </span>
                      </span>
                      {/* 진행 바 */}
                      <div className="w-24 h-1.5 bg-[#e4e7ef] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? "bg-red-400" : "bg-[#4f52e8]"}`}
                          style={{ width: `${Math.min((answerElapsed / maxTime) * 100, 100)}%` }} />
                      </div>
                    </>
                  );
                })()}
                {!recording && !aiSpeaking && (
                  <span className="text-[12px] text-[#9ca3af]">AI 면접관이 질문한 뒤 대답할 수 있습니다</span>
                )}
                {aiSpeaking && (
                  <span className="text-[12px] text-[#9ca3af]">AI 면접관이 얘기하는 중입니다.</span>
                )}
              </div>

              {/* 오른쪽 버튼들 */}
              <div className="flex items-center gap-2">
              {/* 답변 종료 버튼 (10초 이상 답변 시 표시) */}
              {recording && answerElapsed >= 10 && (
                <button
                  onClick={() => stopRecordingRef.current()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4f52e8] hover:bg-[#3e41d4] text-white text-[12px] font-semibold transition-all shadow-sm animate-in fade-in duration-300"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  답변 종료
                </button>
              )}
              {/* 마이크 버튼 */}
              <button
                onClick={startListening}
                disabled={recording || aiSpeaking}
                title={aiSpeaking ? "AI 발화 중..." : recording ? "듣는 중..." : "마이크로 답변 시작"}
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all border ${
                  recording
                    ? "bg-red-50 border-red-300 text-red-400 cursor-not-allowed"
                    : aiSpeaking
                    ? "bg-[#f0f2f8] border-[#e4e7ef] text-[#c4c9d6] cursor-not-allowed"
                    : "bg-[#f8f9fc] border-[#e4e7ef] text-[#6b7280] hover:border-[#4f52e8]/40 hover:text-[#4f52e8]"
                }`}
              >
                <IconMic className="w-4 h-4" />
              </button>

              {/* 장치 설정 */}
              <button
                onClick={() => setShowCallDeviceModal(true)}
                title="장치 설정"
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-[#f8f9fc] border border-[#e4e7ef] text-[#6b7280] hover:border-[#4f52e8]/40 hover:text-[#4f52e8] transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
              {/* 종료 */}
              <button
                onClick={endCall}
                title="면접 종료"
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-red-500 hover:bg-red-600 text-white transition-all shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07C9.44 17.42 8.5 16.5 7.77 15.5" />
                  <path d="M13.73 4a2 2 0 0 1 1.93 1.47 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L14.64 11.6" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 면접 중 장치 설정 모달 */}
      {showCallDeviceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCallDeviceModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e4e7ef]">
              <h3 className="text-[15px] font-semibold text-[#0d1035]">장치 설정</h3>
              <button
                onClick={() => setShowCallDeviceModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151] transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <button
                onClick={() => switchCallDevices(callSelectedCamId || undefined, callSelectedMicId || undefined)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#4f52e8] bg-[#eef0fd] text-[#4f52e8] text-[13px] font-medium hover:bg-[#e0e3fc] transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                </svg>
                권한 요청 / 재연결
              </button>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#374151] flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[#6b7280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14" /><rect x="1" y="6" width="14" height="12" rx="2" />
                  </svg>
                  카메라
                </label>
                {callVideoDevices.length > 0 ? (
                  <select
                    value={callSelectedCamId}
                    onChange={(e) => {
                      setCallSelectedCamId(e.target.value);
                      switchCallDevices(e.target.value, callSelectedMicId);
                    }}
                    className="w-full text-[13px] text-[#374151] bg-white border border-[#e4e7ef] rounded-xl px-3 py-2 focus:outline-none focus:border-[#4f52e8] cursor-pointer"
                  >
                    {callVideoDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `카메라 ${d.deviceId.slice(0, 6)}`}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[12px] text-[#9ca3af] px-1">권한 요청 후 장치 목록이 표시됩니다.</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#374151] flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[#6b7280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  </svg>
                  마이크
                </label>
                {callAudioDevices.length > 0 ? (
                  <select
                    value={callSelectedMicId}
                    onChange={(e) => {
                      setCallSelectedMicId(e.target.value);
                      switchCallDevices(callSelectedCamId, e.target.value);
                    }}
                    className="w-full text-[13px] text-[#374151] bg-white border border-[#e4e7ef] rounded-xl px-3 py-2 focus:outline-none focus:border-[#4f52e8] cursor-pointer"
                  >
                    {callAudioDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `마이크 ${d.deviceId.slice(0, 6)}`}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[12px] text-[#9ca3af] px-1">권한 요청 후 장치 목록이 표시됩니다.</p>
                )}
              </div>

              {/* 스피커 선택 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#374151] flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[#6b7280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </svg>
                  스피커
                </label>
                {callSpeakerDevices.length > 0 ? (
                  <select
                    value={callSelectedSpeakerId}
                    onChange={(e) => setCallSelectedSpeakerId(e.target.value)}
                    className="w-full text-[13px] text-[#374151] bg-white border border-[#e4e7ef] rounded-xl px-3 py-2 focus:outline-none focus:border-[#4f52e8] cursor-pointer"
                  >
                    {callSpeakerDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `스피커 ${d.deviceId.slice(0, 6)}`}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[12px] text-[#9ca3af] px-1">권한 요청 후 장치 목록이 표시됩니다.</p>
                )}
              </div>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => setShowCallDeviceModal(false)}
                className="w-full py-2.5 rounded-xl bg-[#4f52e8] hover:bg-[#3e41d4] text-white text-[13px] font-semibold transition-all"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
      {showReportSurveyModal && (
        <SurveyEmailModal
          questions={messages.filter(m => m.role === "ai" && !m.text.includes("수고하셨습니다")).map(m => m.text)}
          answers={messages.filter(m => m.role === "user").map(m => m.text)}
          onClose={() => setShowReportSurveyModal(false)}
        />
      )}
    </>
  );
}
