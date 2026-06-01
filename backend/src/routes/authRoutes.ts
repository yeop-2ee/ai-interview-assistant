import { Router, Request, Response } from "express"
import bcrypt from "bcrypt"
import { randomUUID } from "crypto"
import prisma from "../lib/prisma"

const router = Router()

// 유저별 SSE 연결 저장소 (userId → Response)
const activeConnections = new Map<number, Response>()

// POST /auth/signup
router.post("/signup", async (req: Request, res: Response) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    res.status(400).json({ error: "모든 항목을 입력해주세요." })
    return
  }
  if (password.length < 8) {
    res.status(400).json({ error: "비밀번호는 8자 이상이어야 합니다." })
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: "이미 사용 중인 이메일입니다." })
    return
  }

  const hashed = await bcrypt.hash(password, 10)
  const sessionToken = randomUUID()
  const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const user = await prisma.user.create({
    data: { name, email, password: hashed, sessionToken, sessionExpiresAt },
  })

  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role, sessionToken })
})

// POST /auth/login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ error: "이메일과 비밀번호를 입력해주세요." })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." })
    return
  }

  const match = await bcrypt.compare(password, user.password)
  if (!match) {
    res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." })
    return
  }

  // 새 세션 토큰 발급 — 기존 기기 세션 자동 만료 (7일 유효)
  const sessionToken = randomUUID()
  const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await prisma.user.update({ where: { id: user.id }, data: { sessionToken, sessionExpiresAt } })

  // 기존 기기에 SSE로 세션 무효화 이벤트 즉시 전송
  const oldConnection = activeConnections.get(user.id)
  if (oldConnection) {
    oldConnection.write(`data: ${JSON.stringify({ type: "session-invalidated" })}\n\n`)
    activeConnections.delete(user.id)
  }

  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, sessionToken })
})

// GET /auth/events — SSE 연결 유지, 다른 기기 로그인 시 세션 무효화 이벤트 push
router.get("/events", async (req: Request, res: Response) => {
  const token = req.headers["x-session-token"] as string | undefined
  if (!token) {
    res.status(401).end()
    return
  }

  const user = await prisma.user.findFirst({ where: { sessionToken: token } })
  if (!user || (user.sessionExpiresAt && user.sessionExpiresAt < new Date())) {
    res.status(401).end()
    return
  }

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("X-Accel-Buffering", "no") // nginx 버퍼링 비활성화
  res.flushHeaders()

  // 기존 연결이 있으면 교체 (같은 기기에서 재연결 등)
  activeConnections.set(user.id, res)

  // 30초마다 heartbeat (프록시/방화벽 연결 끊김 방지)
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n")
  }, 30_000)

  req.on("close", () => {
    clearInterval(heartbeat)
    // 이 연결이 현재 등록된 연결과 같을 때만 삭제
    if (activeConnections.get(user.id) === res) {
      activeConnections.delete(user.id)
    }
  })
})

// GET /auth/session — 세션 유효성 확인 (폴링용 경량 엔드포인트)
router.get("/session", async (req: Request, res: Response) => {
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

  if (user.sessionExpiresAt && user.sessionExpiresAt < new Date()) {
    await prisma.user.update({ where: { id: user.id }, data: { sessionToken: null, sessionExpiresAt: null } })
    res.status(401).json({ error: "세션이 만료되었습니다. 다시 로그인해주세요." })
    return
  }

  res.json({ valid: true })
})

// POST /auth/logout
router.post("/logout", async (req: Request, res: Response) => {
  const token = req.headers["x-session-token"] as string | undefined
  if (token) {
    await prisma.user.updateMany({ where: { sessionToken: token }, data: { sessionToken: null } })
  }
  res.json({ success: true })
})

// DELETE /auth/user — 회원탈퇴 (연관 데이터 포함 삭제)
router.delete("/user", async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ error: "이메일과 비밀번호를 입력해주세요." })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    res.status(404).json({ error: "사용자를 찾을 수 없습니다." })
    return
  }

  const match = await bcrypt.compare(password, user.password)
  if (!match) {
    res.status(401).json({ error: "비밀번호가 올바르지 않습니다." })
    return
  }

  // onDelete: Cascade 로 연관 리포트도 함께 삭제됨
  await prisma.user.delete({ where: { email } })
  res.json({ success: true })
})

export default router
