const express = require('express');
const axios = require('axios');

const router = express.Router();

const DID_API_URL = process.env.DID_API_URL || 'https://api.d-id.com';
const DID_API_KEY = process.env.DID_API_KEY;

const didClient = axios.create({
  baseURL: DID_API_URL,
  headers: {
    Authorization: `Basic ${DID_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

/**
 * D-ID API로 아바타 영상 생성 요청
 * @param {string} text - TTS로 읽을 질문 텍스트
 * @param {string} sourceUrl - 아바타 이미지 URL
 * @returns {Promise<string>} talk_id
 */
async function createTalk(text, sourceUrl) {
  const response = await didClient.post('/talks', {
    source_url: sourceUrl,
    script: {
      type: 'text',
      input: text,
      provider: {
        type: 'microsoft',
        voice_id: 'ko-KR-SunHiNeural',
      },
    },
    config: {
      fluent: true,
      pad_audio: 0,
    },
  });
  return response.data.id;
}

/**
 * 생성된 영상 상태 및 URL 조회
 * @param {string} talkId
 * @returns {Promise<{status: string, resultUrl: string|null}>}
 */
async function getTalkResult(talkId) {
  const response = await didClient.get(`/talks/${talkId}`);
  const { status, result_url } = response.data;
  return { status, resultUrl: result_url || null };
}

/**
 * POST /api/avatar/create
 * 질문 텍스트로 아바타 영상 생성 요청
 * Body: { text: string, sourceUrl: string }
 */
router.post('/create', async (req, res) => {
  const { text, sourceUrl } = req.body;

  if (!text || !sourceUrl) {
    return res.status(400).json({ error: 'text와 sourceUrl이 필요합니다.' });
  }

  try {
    const talkId = await createTalk(text, sourceUrl);
    res.json({ success: true, talkId });
  } catch (error) {
    console.error('D-ID 영상 생성 실패:', error.response?.data || error.message);
    res.status(500).json({ error: '아바타 영상 생성에 실패했습니다.' });
  }
});

/**
 * GET /api/avatar/result/:talkId
 * 생성된 아바타 영상 URL 조회
 */
router.get('/result/:talkId', async (req, res) => {
  const { talkId } = req.params;

  try {
    const { status, resultUrl } = await getTalkResult(talkId);

    if (status === 'done' && resultUrl) {
      return res.json({ success: true, status, resultUrl });
    }

    res.json({ success: true, status, resultUrl: null });
  } catch (error) {
    console.error('D-ID 결과 조회 실패:', error.response?.data || error.message);
    res.status(500).json({ error: '영상 결과 조회에 실패했습니다.' });
  }
});

module.exports = router;
