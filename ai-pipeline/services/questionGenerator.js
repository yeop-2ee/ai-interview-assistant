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

export async function getNextQuestion(resumeText, chatHistory, commonHistory, currentPhase) {
  if (currentPhase < 1 || currentPhase > 3) {
    throw new RangeError(`Phase 범위 오류: questionGenerator는 Phase 1~3만 처리합니다. (받은 값: ${currentPhase})`);
  }

  const allPrevQs = [...commonHistory, ...chatHistory].filter(m => m.role === 'assistant').map(m => m.content);
  console.log(`[Phase ${currentPhase}] 이전 질문 ${allPrevQs.length}개 (공통${commonHistory.filter(m=>m.role==='assistant').length} + 맞춤${chatHistory.filter(m=>m.role==='assistant').length})`);

  const response = await ollama.chat({
    model: 'ai-interview-assistant',
    format: 'json',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: buildQuestionPrompt(resumeText, chatHistory, commonHistory, currentPhase) },
    ],
  });

  const aiResult = JSON.parse(response.message.content);
  console.log(`[Phase ${currentPhase}] 생성된 질문:`, aiResult.nextQuestion);
  return { success: true, data: aiResult };
}

function buildQuestionPrompt(resumeText, chatHistory, commonHistory, currentPhase) {
  // 중복 방지용: 공통질문 + 맞춤질문 전체에서 추출
  const allPreviousQuestions = [...commonHistory, ...chatHistory]
    .filter(m => m.role === 'assistant')
    .map((m, i) => `${i + 1}. ${m.content}`)
    .join('\n') || '(없음)';

  // 최근 맥락: 맞춤 질문 대화만 (공통질문은 기술 맥락 없음)
  const recentCustom = chatHistory.slice(-4);
  const recentText = recentCustom.length > 0
    ? recentCustom.map(m => `[${m.role === 'assistant' ? '면접관' : '지원자'}] ${m.content}`).join('\n')
    : '(아직 기술 대화 없음)';

  // 마지막 기술 답변: 맞춤 히스토리에서만 추출
  const lastUserMsg = [...chatHistory].reverse().find(m => m.role === 'user');
  const lastAnswer = lastUserMsg ? lastUserMsg.content : null;

  const resumeSection = resumeText.trim()
    ? `[지원자 이력서]\n${resumeText}`
    : `[지원자 이력서]\n(이력서 미제출)\n\n※ 이력서가 없습니다. 지원자의 경험을 직접 파악하기 위해 최근 참여한 프로젝트나 앱/서비스 개발 경험이 있는지 먼저 질문하십시오. 절대 이력서 내용을 짐작하거나 가정하지 마십시오.`;

  const lastAnswerSection = lastAnswer
    ? `[지원자의 마지막 기술 답변 - 반드시 이 내용을 기반으로 질문하십시오]\n${lastAnswer}`
    : '';

  return `${resumeSection}

${lastAnswerSection}

[이미 한 질문 목록 - 이와 같은 주제/의도의 질문은 절대 반복하지 마십시오]
${allPreviousQuestions}

[현재 면접 단계]
Phase: ${currentPhase}

[최근 기술 대화 맥락]
${recentText}`;
}
