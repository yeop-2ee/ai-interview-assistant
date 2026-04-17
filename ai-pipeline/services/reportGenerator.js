import fs from 'fs';
import path from 'path';
import ollama from 'ollama';

const systemPrompt = fs.readFileSync(path.resolve('./prompts/reportPrompt.md'), 'utf-8');

/**
 * 면접 전체 대화를 STAR 기법으로 분석하여 평가 리포트 생성
 *
 * @param {string} resumeText 지원자 이력서 원문
 * @param {Array<{ role: string, content: string }>} commonHistory 공통 질문 대화 내역
 * @param {Array<{ role: string, content: string }>} customHistory 맞춤 질문 대화 내역 (Phase 1~5)
 * @returns {{ success: boolean, report: object }}
 */
export async function generateReport(resumeText, commonHistory, customHistory) {
  const fullHistory = [...commonHistory, ...customHistory];

  if (fullHistory.length < 2) {
    throw new Error('리포트 생성에 필요한 대화 내역이 부족합니다.');
  }

  const response = await ollama.chat({
    model: 'ai-interview-assistant',
    format: 'json',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: buildReportPrompt(resumeText, commonHistory, customHistory),
      },
    ],
  });

  const raw = response.message.content;
  console.log('[reportGenerator] 모델 원본 응답:', raw.slice(0, 300));

  let report;
  try {
    report = JSON.parse(raw);
  } catch (parseError) {
    console.error('[reportGenerator] JSON 파싱 실패:', parseError.message);
    console.error('[reportGenerator] 원본 전체:', raw);
    throw new Error(`모델 JSON 파싱 실패: ${parseError.message}`);
  }

  // 모델이 필드명을 잘못 반환하는 경우 정규화
  if (report.categoryScore && !report.categoryScores) {
    report.categoryScores = report.categoryScore;
    delete report.categoryScore;
  }
  if (report.improvments && !report.improvements) {
    report.improvements = report.improvments;
    delete report.improvments;
  }

  return { success: true, report };
}

function buildReportPrompt(resumeText, commonHistory, customHistory) {
  const formatHistory = (history, label) => {
    if (history.length === 0) return `[${label}]\n(없음)`;
    const text = history
      .map(m => `[${m.role === 'assistant' ? '면접관' : '지원자'}] ${m.content}`)
      .join('\n');
    return `[${label}]\n${text}`;
  };

  return `[지원자 이력서]
${resumeText}

${formatHistory(commonHistory, '공통 질문 대화 (3문항)')}

${formatHistory(customHistory, '맞춤 질문 대화 (Phase 1~5, 총 5문항)')}

위 전체 면접 내용을 STAR 기법으로 분석하여 평가 리포트를 작성하십시오.
단, 공통 질문은 STAR 평가에서 제외하고 종합 평가(categoryScores, strengths, improvements 등)에만 반영하십시오.`;
}
