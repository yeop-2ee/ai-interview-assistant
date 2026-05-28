const AUTH_KEYS = ["isLoggedIn", "userName", "userEmail", "userRole", "sessionToken"] as const

export function getSessionToken(): string {
  if (typeof window === "undefined") return ""
  return localStorage.getItem("sessionToken") ?? ""
}

export function clearSession(): void {
  if (typeof window === "undefined") return
  AUTH_KEYS.forEach((k) => localStorage.removeItem(k))
}

/**
 * sessionToken 헤더를 자동으로 추가하는 fetch 래퍼.
 * 401 응답 시 세션을 초기화하고 로그인 페이지로 이동한다.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      "x-session-token": getSessionToken(),
    },
  })

  if (res.status === 401) {
    clearSession()
    window.location.href = "/login"
  }

  return res
}
