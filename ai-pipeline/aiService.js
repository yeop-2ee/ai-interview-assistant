import express from 'express';
import cors from 'cors';
import { parseResume } from './utils/resumeParser.js';
import { getInitialCommonQuestions, getNextQuestion } from './services/questionGenerator.js';
import { getFollowupQuestion } from './services/followupGenerator.js';
import { generateReport } from './services/reportGenerator.js';

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(cors());

// ─────────────────────────────────────────────
// GET /api/health — 서버 상태 확인
// ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AI 서버가 정상 작동 중입니다.' });
});

// ─────────────────────────────────────────────
// POST /api/interview/start — 면접 시작
// body: { resumeText: string }
// response: {
//   parsedResume: object,         // 이력서 분석 결과
//   commonQuestions: Array<{      // 공통 질문 3개
//     id, category, question
//   }>
// }
// ─────────────────────────────────────────────
app.post('/api/interview/start', async (req, res) => {
  const { resumeText } = req.body;
  if (!resumeText?.trim()) {
    return res.status(400).json({ error: '이력서 내용(resumeText)을 보내주세요.' });
  }

  try {
    // 이력서 파싱과 공통 질문 선택을 병렬 처리
    const [parsedResume, commonQuestions] = await Promise.all([
      parseResume(resumeText),
      Promise.resolve(getInitialCommonQuestions()),
    ]);

    res.json({ success: true, parsedResume, commonQuestions });
  } catch (error) {
    console.error('[/api/interview/start]', error);
    res.status(500).json({ success: false, error: '면접 시작 중 서버 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/interview/question — 맞춤 질문 생성
// body: {
//   resumeText: string,
//   chatHistory: Array<{ role: 'user'|'assistant', content: string }>,
//   currentPhase: number  // 1~5
// }
// response: {
//   data: { nextQuestion, phase, intent, [targetAnswer] },
//   isFinished: boolean
// }
// ─────────────────────────────────────────────
app.post('/api/interview/question', async (req, res) => {
  const { resumeText, chatHistory, currentPhase } = req.body;

  if (!resumeText?.trim()) {
    return res.status(400).json({ error: '이력서 내용(resumeText)을 보내주세요.' });
  }
  if (!Array.isArray(chatHistory)) {
    return res.status(400).json({ error: 'chatHistory는 배열이어야 합니다.' });
  }
  if (typeof currentPhase !== 'number' || currentPhase < 1 || currentPhase > 5) {
    return res.status(400).json({ error: 'currentPhase는 1~5 사이의 숫자여야 합니다.' });
  }

  // Phase 5 완료 후 추가 요청 시 면접 종료
  if (currentPhase > 5) {
    return res.json({ success: true, isFinished: true, message: '면접이 모두 종료되었습니다.' });
  }

  try {
    let result;

    if (currentPhase <= 3) {
      // Phase 1~3: 경험 기반 + CS 기반 질문
      result = await getNextQuestion(resumeText, chatHistory, currentPhase);
    } else {
      // Phase 4~5: 꼬리질문
      result = await getFollowupQuestion(resumeText, chatHistory, currentPhase);
    }

    res.json({ success: true, isFinished: false, ...result });
  } catch (error) {
    console.error(`[/api/interview/question] Phase ${currentPhase}`, error);
    res.status(500).json({ success: false, error: '질문 생성 중 서버 오류가 발생했습니다.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/interview/report — 면접 종료 후 리포트 생성
// body: {
//   resumeText: string,
//   commonHistory: Array<{ role, content }>,   // 공통 질문 3개 대화
//   customHistory: Array<{ role, content }>    // 맞춤 질문 5개 대화 (Phase 1~5)
// }
// response: {
//   report: {
//     overallScore, grade, summary,
//     starEvaluation: [...],
//     categoryScores: { technical, logic, communication, growth },
//     strengths, improvements, recommendedTopics
//   }
// }
// ─────────────────────────────────────────────
app.post('/api/interview/report', async (req, res) => {
  const { resumeText, commonHistory, customHistory } = req.body;

  if (!resumeText?.trim()) {
    return res.status(400).json({ error: '이력서 내용(resumeText)을 보내주세요.' });
  }
  if (!Array.isArray(commonHistory) || !Array.isArray(customHistory)) {
    return res.status(400).json({ error: 'commonHistory, customHistory는 배열이어야 합니다.' });
  }

  try {
    const { success, report } = await generateReport(resumeText, commonHistory, customHistory);
    res.json({ success, report });
  } catch (error) {
    console.error('[/api/interview/report]', error);
    res.status(500).json({ success: false, error: '리포트 생성 중 서버 오류가 발생했습니다.' });
  }
});

app.listen(PORT, () => {
  console.log(`AI 서버 시작: http://localhost:${PORT}`);
  console.log('엔드포인트:');
  console.log('  GET  /api/health');
  console.log('  POST /api/interview/start');
  console.log('  POST /api/interview/question');
  console.log('  POST /api/interview/report');
});
