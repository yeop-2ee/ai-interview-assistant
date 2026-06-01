import { useEffect, useRef } from "react"
import { getSessionToken } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!
const RECONNECT_DELAY_MS = 5_000

/**
 * 서버와 SSE 연결을 유지하며 세션 무효화 이벤트를 수신하는 훅.
 * 다른 기기에서 새로 로그인하면 서버가 즉시 "session-invalidated" 이벤트를 push한다.
 * 네트워크 오류 시 5초 후 자동 재연결한다.
 */
export function useSessionGuard() {
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    let stopped = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = async () => {
      const token = getSessionToken()
      if (!token) return

      abortRef.current = new AbortController()

      try {
        const res = await fetch(`${BACKEND_URL}/auth/events`, {
          headers: { "x-session-token": token },
          signal: abortRef.current.signal,
        })

        // 토큰이 이미 서버에서 무효 상태 → 즉시 만료 처리
        if (res.status === 401) {
          window.dispatchEvent(new Event("session-expired"))
          return
        }

        if (!res.ok || !res.body) return

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            try {
              const payload = JSON.parse(line.slice(6))
              if (payload.type === "session-invalidated") {
                window.dispatchEvent(new Event("session-expired"))
                return // 재연결 없이 종료
              }
            } catch {
              // JSON 파싱 실패는 무시
            }
          }
        }
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === "AbortError") return
        // 네트워크 오류 → 재연결 대기
      }

      if (!stopped) {
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    connect()

    return () => {
      stopped = true
      abortRef.current?.abort()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [])
}
