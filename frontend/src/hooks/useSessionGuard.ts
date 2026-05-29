import { useEffect } from "react"
import { authFetch, getSessionToken } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!

const CHECK_INTERVAL_MS = 15_000 // 15초마다 세션 유효성 확인

/**
 * 주기적으로 서버에 세션 유효성을 확인하는 훅.
 * 다른 기기에서 새로 로그인해 기존 토큰이 무효화된 경우
 * 15초 이내에 자동 감지된다.
 * 탭이 다시 활성화될 때도 즉시 확인한다.
 * authFetch가 401 응답을 받으면 "session-expired" 이벤트를 발사한다.
 */
export function useSessionGuard() {
  useEffect(() => {
    if (typeof window === "undefined") return

    const check = async () => {
      if (!getSessionToken()) return
      try {
        await authFetch(`${BACKEND_URL}/auth/session`)
      } catch {
        // 네트워크 오류는 무시 (오프라인 상태 등)
      }
    }

    // 마운트 시 즉시 한 번 확인
    check()

    // 15초마다 폴링
    const interval = setInterval(check, CHECK_INTERVAL_MS)

    // 탭이 다시 활성화될 때 즉시 재확인
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") check()
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [])
}
