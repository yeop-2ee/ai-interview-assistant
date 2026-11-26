export const AI_SERVER_URL = () => process.env.AI_SERVER_URL || "http://localhost:5050"

// AI 서버가 재시작 중이거나 일시적으로 응답하지 못하면 연결 단계에서 재시도
// (모델 호출 자체의 재시도는 AI 서버가 담당)
export async function fetchAiServer(path: string, body: object, timeoutMs: number, attempts = 3): Promise<globalThis.Response> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const aiRes = await fetch(`${AI_SERVER_URL()}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (aiRes.ok && aiRes.body) return aiRes
      lastError = new Error(`AI 서버 오류: ${aiRes.status}`)
    } catch (e) {
      lastError = e
    }
    console.warn(`[AI 서버 ${path}] 시도 ${attempt}/${attempts} 실패:`, lastError instanceof Error ? lastError.message : lastError)
    if (attempt < attempts) await new Promise(r => setTimeout(r, 2000 * attempt))
  }
  throw lastError
}
