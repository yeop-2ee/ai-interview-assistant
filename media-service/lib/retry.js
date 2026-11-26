// 일시적 오류(TTS 네트워크 끊김, GPU 메모리 부족, Python 프로세스 비정상 종료 등)는
// 다시 시도하면 대부분 해결되므로 간격을 늘려가며 재시도하고, 모두 실패했을 때만 마지막 오류를 던진다
async function withRetry(label, fn, { attempts = 3, baseDelayMs = 1000 } = {}) {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn(i);
    } catch (e) {
      lastError = e;
      console.warn(`[${label}] 시도 ${i}/${attempts} 실패: ${e.message}`);
      if (i < attempts) await new Promise((r) => setTimeout(r, baseDelayMs * i));
    }
  }
  throw lastError;
}

// 결과 파일이 실제로 만들어졌는지 확인 (프로세스가 성공을 반환해도 빈 파일인 경우가 있음)
function assertFileWritten(fs, filePath, label) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
    throw new Error(`${label} 결과 파일이 비어 있음`);
  }
}

module.exports = { withRetry, assertFileWritten };
