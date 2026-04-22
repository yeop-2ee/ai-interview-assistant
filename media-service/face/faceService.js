const express = require('express');
const router = express.Router();

// 면접 세션별 얼굴 분석 데이터 저장 (메모리)
const sessionData = new Map();

/**
 * POST /api/face/analyze
 * 프론트에서 분석된 얼굴 데이터를 받아 저장
 * Body: { sessionId, gazeDirection, blinkCount, expressionScore, tensionScore, timestamp }
 */
router.post('/analyze', (req, res) => {
  const { sessionId, gazeDirection, blinkCount, expressionScore, tensionScore, timestamp } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId가 없습니다.' });
  }

  if (!sessionData.has(sessionId)) {
    sessionData.set(sessionId, []);
  }

  sessionData.get(sessionId).push({
    gazeDirection,   // 'center' | 'left' | 'right' | 'up' | 'down'
    blinkCount,      // 누적 눈 깜빡임 수
    expressionScore, // 표정 변화량 (0~1)
    tensionScore,    // 긴장도 (0~1)
    timestamp: timestamp || Date.now(),
  });

  res.json({ success: true });
});

/**
 * GET /api/face/report/:sessionId
 * 세션의 얼굴 분석 리포트 반환
 */
router.get('/report/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const data = sessionData.get(sessionId);

  if (!data || data.length === 0) {
    return res.status(404).json({ error: '분석 데이터가 없습니다.' });
  }

  const total = data.length;

  // 시선 방향 비율
  const gazeCounts = { center: 0, left: 0, right: 0, up: 0, down: 0 };
  data.forEach(d => { if (d.gazeDirection) gazeCounts[d.gazeDirection]++; });
  const gazeRatio = {};
  Object.keys(gazeCounts).forEach(k => {
    gazeRatio[k] = Math.round((gazeCounts[k] / total) * 100);
  });

  // 평균 긴장도
  const avgTension = data.reduce((sum, d) => sum + (d.tensionScore || 0), 0) / total;

  // 평균 표정 변화
  const avgExpression = data.reduce((sum, d) => sum + (d.expressionScore || 0), 0) / total;

  // 총 눈 깜빡임
  const totalBlinks = data[data.length - 1]?.blinkCount || 0;
  const durationSec = (data[data.length - 1]?.timestamp - data[0]?.timestamp) / 1000;
  const blinkPerMin = durationSec > 0 ? Math.round((totalBlinks / durationSec) * 60) : 0;

  res.json({
    sessionId,
    totalFrames: total,
    durationSec: Math.round(durationSec),
    gazeRatio,          // 시선 방향 비율 (%)
    avgTension: Math.round(avgTension * 100) / 100,       // 평균 긴장도
    avgExpression: Math.round(avgExpression * 100) / 100, // 평균 표정 변화
    blinkPerMin,        // 분당 눈 깜빡임 수
    feedback: generateFeedback({ gazeRatio, avgTension, blinkPerMin }),
  });
});

/**
 * DELETE /api/face/session/:sessionId
 * 세션 데이터 삭제
 */
router.delete('/session/:sessionId', (req, res) => {
  sessionData.delete(req.params.sessionId);
  res.json({ success: true });
});

function generateFeedback({ gazeRatio, avgTension, blinkPerMin }) {
  const feedbacks = [];

  if (gazeRatio.center < 60) {
    feedbacks.push('정면 응시 비율이 낮게 관찰되었습니다. 면접관과의 눈 맞춤을 유지해보세요.');
  }
  if (avgTension > 0.6) {
    feedbacks.push('긴장도가 높게 관찰되었습니다. 면접 전 호흡을 가다듬는 것이 도움이 될 수 있습니다.');
  }
  if (blinkPerMin > 30) {
    feedbacks.push(`눈 깜빡임이 분당 ${blinkPerMin}회로 다소 잦게 관찰되었습니다.`);
  }
  if (feedbacks.length === 0) {
    feedbacks.push('안정적인 시선과 표정이 관찰되었습니다.');
  }

  return feedbacks;
}

module.exports = router;
