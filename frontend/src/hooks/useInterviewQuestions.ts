import { useState, useEffect, useRef } from "react";
import { parseSSE } from "@/lib/sseStream";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

const STYLE_AVATAR: Record<string, string> = {
  friendly:  "/avatars/friendly.png",
  pressure:  "/avatars/pressure.png",
  professor: "/avatars/professor.png",
  practical: "/avatars/practical.png",
};

const RANDOM_STYLES = ["friendly", "pressure", "professor", "practical"] as const;

function resolveStyle(style: string): string {
  if (style === "random") {
    return RANDOM_STYLES[Math.floor(Math.random() * RANDOM_STYLES.length)];
  }
  return style;
}

const STYLE_LABEL: Record<string, string> = {
  friendly: "부드러운", pressure: "압박형", professor: "교수형",
  practical: "실무형", random: "랜덤",
};

/** 항상 첫 번째로 진행되는 자기소개 질문. PRERENDERED 키로도 사용됨. */
export const INTERVIEW_INTRO_QUESTION = "안녕하세요. 간단한 자기소개 부탁드립니다.";

export function useInterviewQuestions() {
  const [questions, setQuestions] = useState<string[]>([INTERVIEW_INTRO_QUESTION]);
  const [questionCategories, setQuestionCategories] = useState<string[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionsProgress, setQuestionsProgress] = useState(0);
  const [questionsStep, setQuestionsStep] = useState("면접 질문 생성 중...");
  const [interviewStyle, setInterviewStyle] = useState("");
  const [avatarSrc, setAvatarSrc] = useState("/avatar.png");

  // 콜백에서 최신 질문 목록을 참조하기 위한 ref (state와 병렬 관리)
  const questionsRef = useRef<string[]>([INTERVIEW_INTRO_QUESTION]);
  // 모든 AI 호출에 일관되게 적용할 resolve된 스타일
  const resolvedStyleRef = useRef("friendly");

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  // 마운트 시 1회 — 세션스토리지 설정을 읽어 질문 생성 요청
  useEffect(() => {
    const settings = JSON.parse(sessionStorage.getItem("interviewSettings") || "{}");
    const resumeText = [
      sessionStorage.getItem("resumeText") || "",
      sessionStorage.getItem("coverText") || "",
    ].filter(Boolean).join("\n\n");

    const resolvedStyle = resolveStyle(settings.style || "friendly");
    resolvedStyleRef.current = resolvedStyle;

    if (settings.style) {
      const displayLabel = settings.style === "random"
        ? `랜덤 (${STYLE_LABEL[resolvedStyle] || resolvedStyle})`
        : (STYLE_LABEL[settings.style] || settings.style);
      setInterviewStyle(displayLabel);
      setAvatarSrc(STYLE_AVATAR[resolvedStyle] || "/avatar.png");
    }

    const requestBody = {
      resumeText,
      department: settings.department || "",
      jobRole: settings.jobRole || "",
      companyType: settings.companyType || "",
      experienceLevel: settings.experienceLevel || "newcomer",
      interviewType: settings.interviewType || "mixed",
      style: resolvedStyle,
    };

    const tryFetch = async (attempt: number): Promise<void> => {
      try {
        const res = await fetch(`${BACKEND_URL}/interview/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok || !res.body) throw new Error(`서버 오류: ${res.status}`);

        for await (const event of parseSSE(res)) {
          if (event.type === "progress") {
            setQuestionsProgress(prev => Math.max(prev, event.progress as number));
            setQuestionsStep(
              (event.step as string) ||
              (
                (event.progress as number) < 25 ? "공통 질문 생성 중..." :
                (event.progress as number) < 65 ? "직무 질문 생성 중..." :
                (event.progress as number) < 95 ? "이력서 질문 생성 중..." : "마무리 중..."
              )
            );
          } else if (event.type === "done") {
            const aiQuestions = event.questions as string[];
            if (Array.isArray(aiQuestions) && aiQuestions.length > 0) {
              const merged = [INTERVIEW_INTRO_QUESTION, ...aiQuestions];
              setQuestions(merged);
              questionsRef.current = merged; // 즉시 반영 (다음 렌더 전 콜백 참조 대비)
              const cats = Array.isArray(event.categories) ? event.categories as string[] : [];
              setQuestionCategories(["소개", ...cats]);
            }
            setQuestionsProgress(100);
            setQuestionsStep("완료!");
            setTimeout(() => setQuestionsLoading(false), 400);
          }
        }
      } catch (e) {
        if (attempt < 2) {
          // 1회 자동 재시도
          setQuestionsStep("재시도 중...");
          await tryFetch(attempt + 1);
        } else {
          if (process.env.NODE_ENV === "development") {
            console.error("[질문 생성] 실패:", e);
          }
          setQuestionsProgress(100);
          setQuestionsStep("완료!");
          setTimeout(() => setQuestionsLoading(false), 400);
        }
      }
    };

    (async () => { await tryFetch(1); })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    questions,
    questionsRef,
    setQuestions,
    questionCategories,
    questionsLoading,
    questionsProgress,
    questionsStep,
    interviewStyle,
    avatarSrc,
    resolvedStyleRef,
  };
}
