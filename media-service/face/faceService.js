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

  // 전달력 점수 계산 (30점 만점)
  const deliveryScore = calcDeliveryScore({ gazeRatio, avgTension, blinkPerMin });

  res.json({
    sessionId,
    totalFrames: total,
    durationSec: Math.round(durationSec),
    gazeRatio,
    avgTension: Math.round(avgTension * 100) / 100,
    avgExpression: Math.round(avgExpression * 100) / 100,
    blinkPerMin,
    // 점수
    deliveryScore,      // 전달력 점수 (30점 만점)
    scoreBreakdown: deliveryScore.breakdown,
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

/**
 * 전달력 점수 계산 (30점 만점)
 * - 시선 15점: 정면 응시 비율
 * - 긴장도 10점: 낮을수록 높은 점수
 * - 눈 깜빡임 5점: 정상 범위(10~25회/분)일수록 높은 점수
 */
function calcDeliveryScore({ gazeRatio, avgTension, blinkPerMin }) {
  // 시선 점수 (15점): 정면 응시 비율에 비례
  const gazeScore = Math.round((gazeRatio.center / 100) * 15);

  // 긴장도 점수 (10점): 긴장도 낮을수록 높은 점수
  const tensionScore = Math.round((1 - avgTension) * 10);

  // 눈 깜빡임 점수 (5점): 10~25회/분이 정상
  let blinkScore;
  if (blinkPerMin >= 10 && blinkPerMin <= 25) {
    blinkScore = 5;
  } else if (blinkPerMin < 10) {
    blinkScore = Math.round((blinkPerMin / 10) * 5);
  } else {
    blinkScore = Math.max(0, Math.round(5 - ((blinkPerMin - 25) / 10) * 5));
  }

  const total = gazeScore + tensionScore + blinkScore;

  return {
    total,           // 전달력 총점 (30점 만점)
    breakdown: {
      gaze: gazeScore,      // 시선 (15점 만점)
      tension: tensionScore, // 긴장도 (10점 만점)
      blink: blinkScore,    // 눈 깜빡임 (5점 만점)
    },
  };
}

/**
 * 최종 종합 점수 계산
 * @param {number} contentScore - 답변 내용 점수 (100점 만점, GPT 평가)
 * @param {number} deliveryTotal - 전달력 점수 (30점 만점)
 * @returns {number} 종합 점수 (100점 만점)
 */
function calcFinalScore(contentScore, deliveryTotal) {
  const contentWeighted  = contentScore * 0.7;           // 70%
  const deliveryWeighted = (deliveryTotal / 30) * 100 * 0.3; // 30%
  return Math.round(contentWeighted + deliveryWeighted);
}

/**
 * POST /api/face/score
 * 답변 내용 점수 + 전달력 점수 합산하여 종합 점수 반환
 * Body: { sessionId, contentScore }
 */
router.post('/score', (req, res) => {
  const { sessionId, contentScore } = req.body;

  if (!sessionId || contentScore === undefined) {
    return res.status(400).json({ error: 'sessionId와 contentScore가 필요합니다.' });
  }

  const data = sessionData.get(sessionId);
  if (!data || data.length === 0) {
    return res.status(404).json({ error: '얼굴 분석 데이터가 없습니다.' });
  }

  const total = data.length;
  const gazeCounts = { center: 0, left: 0, right: 0, up: 0, down: 0 };
  data.forEach(d => { if (d.gazeDirection) gazeCounts[d.gazeDirection]++; });
  const gazeRatio = {};
  Object.keys(gazeCounts).forEach(k => {
    gazeRatio[k] = Math.round((gazeCounts[k] / total) * 100);
  });
  const avgTension = data.reduce((sum, d) => sum + (d.tensionScore || 0), 0) / total;
  const totalBlinks = data[data.length - 1]?.blinkCount || 0;
  const durationSec = (data[data.length - 1]?.timestamp - data[0]?.timestamp) / 1000;
  const blinkPerMin = durationSec > 0 ? Math.round((totalBlinks / durationSec) * 60) : 0;

  const delivery = calcDeliveryScore({ gazeRatio, avgTension, blinkPerMin });
  const finalScore = calcFinalScore(contentScore, delivery.total);

  res.json({
    sessionId,
    finalScore,          // 종합 점수 (100점 만점)
    contentScore,        // 답변 내용 점수 (70% 반영)
    deliveryScore: delivery.total, // 전달력 점수 (30% 반영)
    breakdown: {
      content:  Math.round(contentScore * 0.7),
      delivery: Math.round((delivery.total / 30) * 100 * 0.3),
      detail: delivery.breakdown,
    },
  });
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
