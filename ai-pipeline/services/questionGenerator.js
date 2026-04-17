import fs from 'fs';
import path from 'path';
import ollama from 'ollama';
import { commonQuestionsPool } from './questions.js';

const systemPrompt = fs.readFileSync(path.resolve('./prompts/questionPrompt.md'), 'utf-8');

export function getInitialCommonQuestions() {
  const introQuestion = commonQuestionsPool.find(q => q.id === 1);
  const othersPool = commonQuestionsPool.filter(q => q.id !== 1);
  const categories = [...new Set(othersPool.map(q => q.category))];

  const selectedCategories = categories
    .sort(() => 0.5 - Math.random())
    .slice(0, 2);

  const randomCommon = selectedCategories.map(cat => {
    const categoryQuestions = othersPool.filter(q => q.category === cat);
    return categoryQuestions[Math.floor(Math.random() * categoryQuestions.length)];
  });

  return [introQuestion, ...randomCommon];
}

export async function getNextQuestion(resumeText, chatHistory, currentPhase) {
  if (currentPhase < 1 || currentPhase > 3) {
    throw new RangeError(`Phase 범위 오류: questionGenerator는 Phase 1~3만 처리합니다. (받은 값: ${currentPhase})`);
  }

  const response = await ollama.chat({
    model: 'ai-interview-assistant',
    format: 'json',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: buildQuestionPrompt(resumeText, chatHistory, currentPhase) },
    ],
  });

  const aiResult = JSON.parse(response.message.content);
  return { success: true, data: aiResult };
}

function buildQuestionPrompt(resumeText, chatHistory, currentPhase) {
  const historyText = chatHistory.length > 0
    ? chatHistory.map(m => `[${m.role === 'assistant' ? '면접관' : '지원자'}] ${m.content}`).join('\n')
    : '(아직 대화 없음)';

  const resumeSection = resumeText.trim()
    ? `[지원자 이력서]\n${resumeText}`
    : `[지원자 이력서]\n(이력서 미제출)\n\n※ 이력서가 없습니다. 지원자의 경험을 직접 파악하기 위해 최근 참여한 프로젝트나 앱/서비스 개발 경험이 있는지 먼저 질문하십시오. 절대 이력서 내용을 짐작하거나 가정하지 마십시오.`;

  return `${resumeSection}

[현재 면접 단계]
Phase: ${currentPhase}

[이전 대화 내역]
${historyText}`;
}
