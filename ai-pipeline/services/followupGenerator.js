import fs from 'fs';
import path from 'path';
import ollama from 'ollama';

const systemPrompt = fs.readFileSync(path.resolve('./prompts/followupPrompt.md'), 'utf-8');

export async function getFollowupQuestion(resumeText, chatHistory, commonHistory, currentPhase) {
  if (currentPhase !== 4 && currentPhase !== 5) {
    throw new RangeError(`Phase 범위 오류: followupGenerator는 Phase 4~5만 처리합니다. (받은 값: ${currentPhase})`);
  }

  const response = await ollama.chat({
    model: 'ai-interview-assistant',
    format: 'json',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: buildFollowupPrompt(resumeText, chatHistory, commonHistory, currentPhase) },
    ],
  });

  const aiResult = JSON.parse(response.message.content);
  return { success: true, data: aiResult };
}

function buildFollowupPrompt(resumeText, chatHistory, commonHistory, currentPhase) {
  const previousQuestions = [...commonHistory, ...chatHistory]
    .filter(m => m.role === 'assistant')
    .map((m, i) => `${i + 1}. ${m.content}`)
    .join('\n') || '(없음)';

  // 최근 2번의 Q&A만 맥락으로 제공
  const recentHistory = chatHistory.slice(-4);
  const historyText = recentHistory
    .map(m => `[${m.role === 'assistant' ? '면접관' : '지원자'}] ${m.content}`)
    .join('\n');

  // 마지막 지원자 답변을 명시적으로 분리
  const lastUserMsg = [...chatHistory].reverse().find(m => m.role === 'user');
  const lastAnswer = lastUserMsg ? lastUserMsg.content : null;

  const resumeSection = resumeText.trim()
    ? `[지원자 이력서 요약]\n${resumeText.slice(0, 500)}`
    : `[지원자 이력서 요약]\n(이력서 미제출)\n\n※ 이력서가 없습니다. 위 대화 내역에서 지원자가 직접 언급한 경험과 내용만을 바탕으로 꼬리질문을 생성하십시오. 절대 짐작하거나 가정하지 마십시오.`;

  const lastAnswerSection = lastAnswer
    ? `[지원자의 마지막 답변 - 반드시 이 내용을 파고드는 꼬리질문을 생성하십시오]\n${lastAnswer}`
    : '';

  return `${resumeSection}

${lastAnswerSection}

[이미 한 질문 목록 - 이와 같은 주제/의도의 질문은 절대 반복하지 마십시오]
${previousQuestions}

[현재 면접 단계]
Phase: ${currentPhase}

[최근 대화 맥락]
${historyText}`;
}
