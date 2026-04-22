const express = require('express');
const { spawn } = require('child_process');
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const path = require('path');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const PYTHON_PATH = process.env.PYTHON_PATH || 'python3';
const RUNNER_PATH = path.join(__dirname, 'transcribe_runner.py');

const STT_TIMEOUT_MS = 5 * 60 * 1000; // 5분

function runTranscribe(audioPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON_PATH, [RUNNER_PATH, audioPath]);
    let output = '';
    let errOutput = '';

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error('Whisper 타임아웃 (5분 초과)'));
    }, STT_TIMEOUT_MS);

    proc.stdout.setEncoding('utf8');
    proc.stderr.setEncoding('utf8');
    proc.stdout.on('data', (d) => { output += d; });
    proc.stderr.on('data', (d) => { errOutput += d; });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(errOutput || 'Whisper 실행 실패'));
      try {
        const result = JSON.parse(output);
        if (result.error) return reject(new Error(result.error));
        resolve(result);
      } catch {
        reject(new Error('결과 파싱 실패'));
      }
    });
  });
}

/**
 * POST /api/stt/transcribe
 * Body: multipart/form-data { audio: File (webm/wav/mp4) }
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '오디오 파일이 없습니다.' });

  const ext = req.file.originalname.split('.').pop() || 'webm';
  const tmpPath = path.join(os.tmpdir(), `stt_${Date.now()}.${ext}`);

  fs.writeFileSync(tmpPath, req.file.buffer);

  try {
    const fileSizeKB = (req.file.size / 1024).toFixed(1);
    console.log(`[STT] 요청: ${req.file.originalname} (${fileSizeKB} KB)`);
    const result = await runTranscribe(tmpPath);
    console.log(`[STT] 결과: "${result.text}" (raw: "${result.raw}")`);
    res.json({ success: true, text: result.text });
  } catch (err) {
    console.error('[STT] 변환 실패:', err.message);
    res.status(500).json({ error: 'STT 변환에 실패했습니다.' });
  } finally {
    fs.unlink(tmpPath, (err) => {
      if (err) console.warn(`[STT] 임시 파일 삭제 실패: ${tmpPath}`, err.message);
    });
  }
});

module.exports = router;
