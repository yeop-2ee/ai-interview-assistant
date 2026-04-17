const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const router = express.Router();

const PYTHON_PATH = process.env.PYTHON_PATH
  || '/Users/sangyeop/.pyenv/versions/3.9.18/bin/python3.9';
const W2L_RUNNER_PATH = path.join(__dirname, 'wav2lip_runner.py');
const W2L_SERVER_PATH = path.join(__dirname, 'wav2lip_server.py');
const FRONTEND_PUBLIC_DIR = path.join(__dirname, '../../frontend/public');
const DEFAULT_AVATAR_PATH = path.join(FRONTEND_PUBLIC_DIR, 'avatar.png');
const OUTPUT_DIR = path.join(__dirname, '../temp/wav2lip');
const W2L_SERVER_PORT = 19876;

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ── Persistent Wav2Lip 서버 관리 ──────────────────────────────
let w2lServerReady = false;
let w2lServerProc = null;

function startWav2LipServer() {
  const inferPath = process.env.WAV2LIP_INFERENCE_PATH || '';
  const ckptPath = process.env.WAV2LIP_CHECKPOINT_PATH || '';
  if (!inferPath || !fs.existsSync(inferPath)) return; // 환경 없으면 스킵

  const w2lCwd = path.dirname(inferPath);
  w2lServerProc = spawn(PYTHON_PATH, [W2L_SERVER_PATH], {
    env: process.env,
    cwd: w2lCwd,
  });

  w2lServerProc.stdout.setEncoding('utf8');
  w2lServerProc.stderr.setEncoding('utf8');

  w2lServerProc.stdout.on('data', (d) => {
    if (d.includes(`WAV2LIP_SERVER_READY:${W2L_SERVER_PORT}`)) {
      w2lServerReady = true;
      console.log('[Wav2Lip] 상시 서버 기동 완료');
    }
  });
  w2lServerProc.stderr.on('data', () => {}); // 모델 로딩 로그 억제
  w2lServerProc.on('exit', () => {
    w2lServerReady = false;
    w2lServerProc = null;
  });
  w2lServerProc.on('error', () => { w2lServerReady = false; });
}

startWav2LipServer();
process.on('exit', () => { w2lServerProc?.kill(); });

// HTTP POST → persistent Wav2Lip 서버
function callWav2LipServer(facePath, audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ face: facePath, audio: audioPath, output: outputPath });
    const req = http.request(
      { hostname: '127.0.0.1', port: W2L_SERVER_PORT, path: '/synthesize', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.error) return reject(new Error(result.error));
            resolve(result);
          } catch { reject(new Error('Wav2Lip 서버 응답 파싱 실패')); }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(300000, () => { req.destroy(); reject(new Error('Wav2Lip 서버 타임아웃')); });
    req.write(body);
    req.end();
  });
}

function runTTS(text, outputPath, voice) {
  const ttsRunner = path.join(__dirname, '../tts/tts_runner.py');
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON_PATH, ['-X', 'utf8', ttsRunner, text, outputPath, voice]);
    let output = '';
    let errorOutput = '';

    proc.on('error', reject); // spawn 실패 시 서버 크래시 방지
    proc.stdout.setEncoding('utf8');
    proc.stderr.setEncoding('utf8');
    proc.stdout.on('data', (d) => { output += d; });
    proc.stderr.on('data', (d) => { errorOutput += d; });

    proc.on('close', (code) => {
      if (code !== 0) {
        // 에러는 stdout(JSON) 또는 stderr에 있을 수 있음
        let msg = errorOutput;
        try { const j = JSON.parse(output); if (j.error) msg = j.error; } catch {}
        console.error('[TTS] 실패 stdout:', output, '| stderr:', errorOutput);
        return reject(new Error(`TTS 실행 실패: ${msg || output}`));
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

async function runWav2Lip(faceImagePath, audioPath, outputPath) {
  // 1) persistent 서버가 살아있으면 HTTP로 처리 (모델 재로딩 없음)
  if (w2lServerReady) {
    const result = await callWav2LipServer(faceImagePath, audioPath, outputPath);
    return { ...result, mode: 'wav2lip' };
  }

  // 2) 서버 미기동 시 subprocess fallback
  return new Promise((resolve, reject) => {
    const w2lCwd = (() => {
      const preferred = process.env.WAV2LIP_INFERENCE_PATH
        ? path.dirname(process.env.WAV2LIP_INFERENCE_PATH)
        : null;
      return preferred && fs.existsSync(preferred) ? preferred : __dirname;
    })();
    const proc = spawn(PYTHON_PATH, [W2L_RUNNER_PATH, faceImagePath, audioPath, outputPath], {
      env: process.env,
      cwd: w2lCwd,
    });
    let output = '';
    let errorOutput = '';
    proc.on('error', reject);
    proc.stdout.setEncoding('utf8');
    proc.stderr.setEncoding('utf8');
    proc.stdout.on('data', (d) => { output += d; });
    proc.stderr.on('data', (d) => { errorOutput += d; });
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(errorOutput || 'Wav2Lip 실행 실패'));
      try {
        const result = JSON.parse(output);
        if (result.error) return reject(new Error(result.error));
        resolve(result);
      } catch { reject(new Error('Wav2Lip 결과 파싱 실패')); }
    });
  });
}

function resolveAvatarPath(imagePath) {
  if (!imagePath) return DEFAULT_AVATAR_PATH;
  const resolved = path.resolve(FRONTEND_PUBLIC_DIR, imagePath.replace(/^\/+/, ''));
  // FRONTEND_PUBLIC_DIR 밖으로 벗어나는 경로 차단 (경로 탈출 방지)
  if (!resolved.startsWith(FRONTEND_PUBLIC_DIR)) return DEFAULT_AVATAR_PATH;
  return resolved;
}

// 세션 디렉토리 경로 반환 (없으면 생성)
function getSessionDir(sessionId) {
  // sessionId 검증: 영숫자, _, - 만 허용 (경로 탐색 방지)
  const safe = sessionId && /^[\w-]+$/.test(sessionId) ? sessionId : 'default';
  const dir = path.join(OUTPUT_DIR, safe);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return { dir, safe };
}

// 2시간 이상 된 세션 폴더 자동 정리
function cleanOldSessions() {
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  try {
    for (const entry of fs.readdirSync(OUTPUT_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dirPath = path.join(OUTPUT_DIR, entry.name);
      const stat = fs.statSync(dirPath);
      if (Date.now() - stat.mtimeMs > TWO_HOURS) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    }
  } catch { /* 정리 실패는 무시 */ }
}
setInterval(cleanOldSessions, 30 * 60 * 1000); // 30분마다 실행

router.post('/synthesize', async (req, res) => {
  const { text, voice = 'ko-KR-SunHiNeural', imagePath = '/avatar.png', sessionId } = req.body || {};
  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: 'text가 없습니다.' });
  }

  const facePath = resolveAvatarPath(imagePath);
  if (!fs.existsSync(facePath)) {
    return res.status(400).json({ error: `이미지 파일을 찾을 수 없습니다: ${facePath}` });
  }

  const { dir: sessionDir, safe: safeSession } = getSessionDir(sessionId);
  const stamp = Date.now();
  const audioFilename = `w2l_${stamp}.mp3`;
  const videoFilename = `w2l_${stamp}.mp4`;
  const audioPath = path.join(sessionDir, audioFilename);
  const videoPath = path.join(sessionDir, videoFilename);

  try {
    await runTTS(String(text), audioPath, voice);
    const w2lResult = await runWav2Lip(facePath, audioPath, videoPath);
    // 영상에 오디오가 포함되므로 중간 mp3 즉시 삭제
    fs.unlink(audioPath, () => {});
    return res.json({
      success: true,
      videoPath: `/api/wav2lip/video/${safeSession}/${videoFilename}`,
      mode: w2lResult.mode || 'fallback',
    });
  } catch (error) {
    console.error('Wav2Lip 합성 실패:', error);
    // 실패 시에도 임시 파일 정리
    fs.unlink(audioPath, () => {});
    return res.status(500).json({ error: 'Wav2Lip 합성에 실패했습니다.' });
  }
});

// 오래된 세션 폴더 자동 정리 (2시간 이상 된 세션)
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
function cleanupOldSessions() {
  if (!fs.existsSync(OUTPUT_DIR)) return;
  const now = Date.now();
  for (const entry of fs.readdirSync(OUTPUT_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dirPath = path.join(OUTPUT_DIR, entry.name);
    try {
      const { mtimeMs } = fs.statSync(dirPath);
      if (now - mtimeMs > SESSION_TTL_MS) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    } catch { /* 무시 */ }
  }
}
setInterval(cleanupOldSessions, 30 * 60 * 1000); // 30분마다 실행
cleanupOldSessions(); // 서버 시작 시 1회 실행

// 세션 폴더 즉시 삭제 (면접 종료 시 호출)
router.delete('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (!/^[\w-]+$/.test(sessionId)) {
    return res.status(400).json({ error: '잘못된 세션 ID입니다.' });
  }
  const dirPath = path.join(OUTPUT_DIR, sessionId);
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  return res.json({ success: true });
});

router.get('/audio/:sessionId/:filename', (req, res) => {
  const { sessionId, filename } = req.params;
  if (!/^[\w-]+$/.test(sessionId) || !/^[\w.-]+$/.test(filename)) {
    return res.status(400).json({ error: '잘못된 요청입니다.' });
  }
  const filePath = path.join(OUTPUT_DIR, sessionId, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
  res.setHeader('Content-Type', 'audio/mpeg');
  fs.createReadStream(filePath).pipe(res);
});

router.get('/video/:sessionId/:filename', (req, res) => {
  const { sessionId, filename } = req.params;
  if (!/^[\w-]+$/.test(sessionId) || !/^[\w.-]+$/.test(filename)) {
    return res.status(400).json({ error: '잘못된 요청입니다.' });
  }
  const filePath = path.join(OUTPUT_DIR, sessionId, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = Number.parseInt(parts[0], 10);
    const end = parts[1] ? Number.parseInt(parts[1], 10) : fileSize - 1;
    res.status(206).set({
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': (end - start) + 1,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.status(200).set({
    'Content-Length': fileSize,
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
  });
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;
