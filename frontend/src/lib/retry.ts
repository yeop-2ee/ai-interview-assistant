export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// 서버 재시작·일시적 네트워크 끊김에 대비해 실패한 요청을 다시 보낸다.
// 모델 호출·영상 생성 자체의 재시도는 각 서버가 담당하므로 여기서는 적은 횟수로 둔다.
// 사용자가 취소한 요청(AbortError)은 재시도하지 않는다.
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  { attempts = 3, baseDelayMs = 1500 }: { attempts?: number; baseDelayMs?: number } = {},
): Promise<Response> {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") throw e;
      lastError = e;
    }
    if (i < attempts) await sleep(baseDelayMs * i);
  }
  throw lastError;
}
