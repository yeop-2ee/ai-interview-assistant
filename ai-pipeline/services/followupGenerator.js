import fs from 'fs';
import path from 'path';
import ollama from 'ollama';

const systemPrompt = fs.readFileSync(path.resolve('./prompts/followupPrompt.md'), 'utf-8');

/**
 * 이전 답변 기반 꼬리질문 생성 (Phase 4 ~ 5)
 * - Phase 4: 이전 답변의 모호한 점 / 트레이드오프 추궁
 * - Phase 5: 세부 구현 로직 / 엣지 케이스 심층 질문
 *
 * @param {string} resumeText 지원자 이력서 원문
 * @param {Array<{ role: string, content: string }>} chatHistory 전체 대화 내역
 * @param {number} currentPhase 현재 질문 단계 (4 또는 5)
 * @returns {{ success: boolean, data: object }}
 */
export async function getFollowupQuestion(resumeText, chatHistory, currentPhase) {
  if (currentPhase !== 4 && currentPhase !== 5) {
    throw new RangeError(`Phase 범위 오류: followupGenerator는 Phase 4~5만 처리합니다. (받은 값: ${currentPhase})`);
  }

  const response = await ollama.chat({
    model: 'ai-interview-assistant',
    format: 'json',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: buildFollowupPrompt(resumeText, chatHistory, currentPhase),
      },
    ],
  });

  const aiResult = JSON.parse(response.message.content);
  return { success: true, data: aiResult };
}

function buildFollowupPrompt(resumeText, chatHistory, currentPhase) {
  // 꼬리질문은 맞춤 질문 대화만 분석 (공통 질문 제외)
  // chatHistory에서 마지막 4개 교환(최근 맥락 집중)
  const recentHistory = chatHistory.slice(-8);

  const historyText = recentHistory
    .map(m => `[${m.role === 'assistant' ? '면접관' : '지원자'}] ${m.content}`)
    .join('\n');

  return `[지원자 이력서 요약]
${resumeText.slice(0, 500)}

[현재 면접 단계]
Phase: ${currentPhase}

[최근 대화 내역 - 이 내용을 기반으로 꼬리질문을 생성하십시오]
${historyText}`;
}
