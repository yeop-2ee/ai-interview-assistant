import { useState, useEffect, useRef } from "react";
import { parseSSE } from "@/lib/sseStream";
import { fetchWithRetry, sleep } from "@/lib/retry";

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
export const INTERVIEW_INTRO_QUESTION_EN = "Hello, thank you for joining us today. Could you please briefly introduce yourself?";
export const INTERVIEW_ENDING = "모든 질문이 끝났습니다. 오늘 면접 정말 수고하셨습니다!";
export const INTERVIEW_ENDING_EN = "That's all the questions we have. Thank you for your time today!";

export type InterviewLanguage = "ko" | "en";
// 외국계 기업을 고르면 영어 면접 (질문·꼬리질문·음성·답변 인식 모두 영어)
export const interviewLanguageOf = (companyType?: string): InterviewLanguage => (companyType === "foreign" ? "en" : "ko");
export const introQuestionOf = (lang: InterviewLanguage) => (lang === "en" ? INTERVIEW_INTRO_QUESTION_EN : INTERVIEW_INTRO_QUESTION);
export const endingMessageOf = (lang: InterviewLanguage) => (lang === "en" ? INTERVIEW_ENDING_EN : INTERVIEW_ENDING);
export const isEndingMessage = (text: string) => text === INTERVIEW_ENDING || text === INTERVIEW_ENDING_EN;

export function useInterviewQuestions() {
  const [questions, setQuestions] = useState<string[]>([INTERVIEW_INTRO_QUESTION]);
  const [questionCategories, setQuestionCategories] = useState<string[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionsProgress, setQuestionsProgress] = useState(0);
  const [questionsStep, setQuestionsStep] = useState("면접 질문 생성 중...");
  const [questionError, setQuestionError] = useState(false);
  const [interviewStyle, setInterviewStyle] = useState("");
  const [avatarSrc, setAvatarSrc] = useState("/avatar.png");

  // 콜백에서 최신 질문 목록을 참조하기 위한 ref (state와 병렬 관리)
  const questionsRef = useRef<string[]>([INTERVIEW_INTRO_QUESTION]);
  // 모든 AI 호출에 일관되게 적용할 resolve된 스타일
  const resolvedStyleRef = useRef("friendly");
  const [language, setLanguage] = useState<InterviewLanguage>("ko");
  const languageRef = useRef<InterviewLanguage>("ko");

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

    const lang = interviewLanguageOf(settings.companyType);
    languageRef.current = lang;
    setLanguage(lang);
    if (lang === "en") {
      setQuestions([INTERVIEW_INTRO_QUESTION_EN]);
      questionsRef.current = [INTERVIEW_INTRO_QUESTION_EN];
    }

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

    const MAX_ATTEMPTS = 3;
    const tryFetch = async (attempt: number): Promise<void> => {
      try {
        const res = await fetchWithRetry(`${BACKEND_URL}/interview/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!res.body) throw new Error("질문 응답 없음");

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
            const aiQuestions = Array.isArray(event.questions) ? event.questions as string[] : [];
            // 최소 질문 수 (AI 질문 5개) 미달이면 마지막 시도가 아닌 한 다시 생성
            if (aiQuestions.length < 5 && attempt < MAX_ATTEMPTS) {
              throw new Error(`질문 ${aiQuestions.length}개만 생성됨`);
            }
            if (aiQuestions.length > 0) {
              const merged = [introQuestionOf(lang), ...aiQuestions];
              setQuestions(merged);
              questionsRef.current = merged;
              const cats = Array.isArray(event.categories) ? event.categories as string[] : [];
              setQuestionCategories(["소개", ...cats]);
              if (merged.length < 6) setQuestionError(true);
            } else {
              setQuestionError(true);
            }
            setQuestionsProgress(100);
            setQuestionsStep("완료!");
            setTimeout(() => setQuestionsLoading(false), 400);
            return;
          }
        }
        throw new Error("질문 결과 없이 연결 종료");
      } catch (e) {
        if (attempt < MAX_ATTEMPTS) {
          console.warn(`[질문 생성] 시도 ${attempt}/${MAX_ATTEMPTS} 실패:`, e);
          setQuestionsProgress(0);
          setQuestionsStep(`질문 다시 생성 중... (${attempt + 1}/${MAX_ATTEMPTS})`);
          await sleep(2000 * attempt);
          await tryFetch(attempt + 1);
        } else {
          if (process.env.NODE_ENV === "development") {
            console.error("[질문 생성] 실패:", e);
          }
          setQuestionError(true);
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
    setQuestionCategories,
    questionsLoading,
    questionsProgress,
    questionsStep,
    questionError,
    interviewStyle,
    avatarSrc,
    resolvedStyleRef,
    language,
    languageRef,
  };
}
