import fs from 'fs';
import path from 'path';
import ollama from 'ollama';
import { commonQuestionsPool } from './questions.js';

const systemPrompt = fs.readFileSync(path.resolve('./prompts/questionPrompt.md'), 'utf-8');

/**
 * 공통 질문 3개 추출
 * - ID 1번(자기소개) 고정
 * - 나머지 2개는 카테고리별 랜덤 선택
 * @returns {Array<{ id: number, category: string, question: string }>}
 */
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

/**
 * 이력서 및 대화 이력 기반으로 맞춤 질문 생성 (Phase 1 ~ 3)
 * - Phase 1: 경험 기반 질문 (이력서 프로젝트/실무 경험)
 * - Phase 2: CS 기반 질문 1 (주요 기술 스택 CS 원리)
 * - Phase 3: CS 기반 질문 2 (다른 기술 스택 / 아키텍처)
 *
 * @param {string} resumeText 지원자 이력서 원문
 * @param {Array<{ role: string, content: string }>} chatHistory 대화 내역
 * @param {number} currentPhase 현재 질문 단계 (1 ~ 3)
 * @returns {{ success: boolean, isFinished: boolean, data?: object }}
 */
export async function getNextQuestion(resumeText, chatHistory, currentPhase) {
  if (currentPhase < 1 || currentPhase > 3) {
    throw new RangeError(`Phase 범위 오류: questionGenerator는 Phase 1~3만 처리합니다. (받은 값: ${currentPhase})`);
  }

  const response = await ollama.chat({
    model: 'ai-interview-assistant',
    format: 'json',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: buildQuestionPrompt(resumeText, chatHistory, currentPhase),
      },
    ],
  });

  const aiResult = JSON.parse(response.message.content);
  return { success: true, data: aiResult };
}

function buildQuestionPrompt(resumeText, chatHistory, currentPhase) {
  const historyText = chatHistory.length > 0
    ? chatHistory.map(m => `[${m.role === 'assistant' ? '면접관' : '지원자'}] ${m.content}`).join('\n')
    : '(아직 대화 없음)';

  return `[지원자 이력서]
${resumeText}

[현재 면접 단계]
Phase: ${currentPhase}

[이전 대화 내역]
${historyText}`;
}
