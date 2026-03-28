const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const multer = require('multer');
const { saveAudioToTemp, deleteTempFile, generateFilename } = require('../audio/recorder');

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

const PYTHON_PATH = process.env.PYTHON_PATH || 'python';
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'base';
const RUNNER_PATH = path.join(__dirname, 'whisper_runner.py');

/**
 * Python Whisper 실행
 * @param {string} audioFilePath - 변환할 음성 파일 경로
 * @returns {Promise<{text: string, language: string, segments: Array}>}
 */
function runWhisper(audioFilePath) {
  return new Promise((resolve, reject) => {
    const process = spawn(PYTHON_PATH, ['-X', 'utf8', RUNNER_PATH, audioFilePath, WHISPER_MODEL]);

    let output = '';
    let errorOutput = '';

    process.stdout.setEncoding('utf8');
    process.stderr.setEncoding('utf8');

    process.stdout.on('data', (data) => {
      output += data;
    });

    process.stderr.on('data', (data) => {
      errorOutput += data;
    });

    process.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Whisper 실행 실패: ${errorOutput}`));
      }
      try {
        const result = JSON.parse(output);
        if (result.error) {
          return reject(new Error(result.error));
        }
        resolve(result);
      } catch {
        reject(new Error('Whisper 결과 파싱 실패'));
      }
    });
  });
}

/**
 * POST /api/stt/transcribe
 * 음성 파일을 텍스트로 변환
 * Body: { tempPath: string }  (audioUploader에서 받은 tempPath)
 */
router.post('/transcribe', async (req, res) => {
  const { tempPath } = req.body;

  if (!tempPath) {
    return res.status(400).json({ error: 'tempPath가 없습니다.' });
  }

  try {
    const result = await runWhisper(tempPath);

    // STT 완료 후 temp 파일 삭제
    deleteTempFile(tempPath);

    res.json({
      success: true,
      text: result.text,
      language: result.language,
      segments: result.segments,
    });
  } catch (error) {
    console.error('STT 변환 실패:', error);
    deleteTempFile(tempPath);
    res.status(500).json({ error: 'STT 변환에 실패했습니다.' });
  }
});

/**
 * POST /api/stt/transcribe-direct
 * 파일을 직접 받아 STT 변환 (테스트용, S3 미사용)
 * Body: multipart/form-data { audio: File }
 */
router.post('/transcribe-direct', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '음성 파일이 없습니다.' });
  }

  const filename = generateFilename(req.file.originalname.split('.').pop() || 'webm');
  const tempPath = saveAudioToTemp(req.file.buffer, filename);

  try {
    const result = await runWhisper(tempPath);
    deleteTempFile(tempPath);
    res.json({ success: true, text: result.text, language: result.language, segments: result.segments });
  } catch (error) {
    console.error('STT 변환 실패:', error);
    deleteTempFile(tempPath);
    res.status(500).json({ error: 'STT 변환에 실패했습니다.' });
  }
});

module.exports = router;
