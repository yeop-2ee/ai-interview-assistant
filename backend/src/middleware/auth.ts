import { Request, Response, NextFunction } from "express"
import prisma from "../lib/prisma"

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["x-session-token"] as string | undefined
  if (!token) {
    res.status(401).json({ error: "로그인이 필요합니다." })
    return
  }

  const user = await prisma.user.findFirst({ where: { sessionToken: token } })
  if (!user) {
    res.status(401).json({ error: "세션이 만료되었습니다. 다시 로그인해주세요." })
    return
  }

  // 세션 만료 시간 체크
  if (user.sessionExpiresAt && user.sessionExpiresAt < new Date()) {
    await prisma.user.update({ where: { id: user.id }, data: { sessionToken: null, sessionExpiresAt: null } })
    res.status(401).json({ error: "세션이 만료되었습니다. 다시 로그인해주세요." })
    return
  }

  res.locals.user = user
  next()
}

// requireAuth 뒤에 사용 — 세션 사용자의 role로 판단 (요청 본문의 email은 신뢰하지 않음)
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (res.locals.user?.role !== "admin") {
    res.status(403).json({ error: "관리자 권한이 필요합니다." })
    return
  }
  next()
}
