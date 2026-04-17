/**
 * SSE 스트림을 파싱하는 제너레이터.
 * `data: {...}` 형식의 줄을 JSON으로 파싱해 yield.
 */
export async function* parseSSE(res: Response): AsyncGenerator<Record<string, unknown>> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try { yield JSON.parse(line.slice(6)); } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[SSE] 파싱 실패:", line, e);
        }
      }
    }
  }
}
