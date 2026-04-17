const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const PYTHON_PATH = process.env.PYTHON_PATH || 'python3';
const RUNNER_PATH = path.join(__dirname, 'tts_runner.py');
const TTS_OUTPUT_DIR = path.join(__dirname, '../temp/tts');

// tts 출력 폴더 없으면 생성
if (!fs.existsSync(TTS_OUTPUT_DIR)) {
  fs.mkdirSync(TTS_OUTPUT_DIR, { recursive: true });
}

/**
 * Python edge-tts 실행
 * @param {string} text - 변환할 텍스트
 * @param {string} outputPath - 저장할 mp3 경로
 * @param {string} voice - 음성 선택
 * @returns {Promise<{success: boolean, outputPath: string}>}
 */
function runTTS(text, outputPath, voice) {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON_PATH, ['-X', 'utf8', RUNNER_PATH, text, outputPath, voice]);

    let output = '';
    let errorOutput = '';

    proc.on('error', reject); // spawn 실패 시 서버 크래시 방지
    proc.stdout.setEncoding('utf8');
    proc.stderr.setEncoding('utf8');

    proc.stdout.on('data', (data) => { output += data; });
    proc.stderr.on('data', (data) => { errorOutput += data; });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`TTS 실행 실패: ${errorOutput}`));
      }
      try {
        const result = JSON.parse(output);
        if (result.error) return reject(new Error(result.error));
        resolve(result);
      } catch {
        reject(new Error('TTS 결과 파싱 실패'));
      }
    });
  });
}

/**
 * POST /api/tts/synthesize
 * 텍스트를 음성 파일로 변환
 * Body: { text: string, voice?: string }
 */
router.post('/synthesize', async (req, res) => {
  const { text, voice = 'ko-KR-SunHiNeural' } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'text가 없습니다.' });
  }

  const filename = `tts_${Date.now()}.mp3`;
  const outputPath = path.join(TTS_OUTPUT_DIR, filename);

  try {
    await runTTS(text, outputPath, voice);
    res.json({ success: true, filename, path: `/api/tts/audio/${filename}` });
  } catch (error) {
    console.error('TTS 변환 실패:', error);
    res.status(500).json({ error: 'TTS 변환에 실패했습니다.' });
  }
});

/**
 * GET /api/tts/audio/:filename
 * 생성된 음성 파일 스트리밍
 */
router.get('/audio/:filename', (req, res) => {
  const { filename } = req.params;
  if (!/^[\w.-]+$/.test(filename)) {
    return res.status(400).json({ error: '잘못된 요청입니다.' });
  }
  const filePath = path.join(TTS_OUTPUT_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;
