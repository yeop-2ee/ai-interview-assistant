//Ai용 서비스 파일
// src/services/analyzeResume.ts
export interface AnalysisResult {
  summary: string;
  questions: string[];
  keywords: string[];
}

export async function analyzeResumeText(text: string): Promise<AnalysisResult> {
  return {
    summary: "업로드된 문서의 핵심 내용을 요약한 임시 결과입니다.",
    questions: [
      "이 문서의 핵심 내용을 설명해주세요.",
      "가장 강조하고 싶은 경험은 무엇인가요?",
      "이 경험을 통해 배운 점은 무엇인가요?"
    ],
    keywords: ["협업", "책임감", "문제 해결"]
  };
}