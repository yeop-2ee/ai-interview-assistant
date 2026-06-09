import { Router, Request, Response } from "express"
import bcrypt from "bcrypt"
import { randomUUID } from "crypto"
import nodemailer from "nodemailer"
import prisma from "../lib/prisma"

const router = Router()

// 유저별 SSE 연결 저장소 (userId → Response)
const activeConnections = new Map<number, Response>()

// ─── 비밀번호 유효성 검사 헬퍼 ───────────────────────────────────────────────
function validatePassword(password: string): string | null {
  if (password.length < 12) return "비밀번호는 12자 이상이어야 합니다."
  if (!/[A-Z]/.test(password)) return "비밀번호에 대문자를 1개 이상 포함해주세요."
  if (!/[a-z]/.test(password)) return "비밀번호에 소문자를 1개 이상 포함해주세요."
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password))
    return "비밀번호에 특수문자를 1개 이상 포함해주세요."
  return null
}

// ─── 이메일 발송 헬퍼 ────────────────────────────────────────────────────────
function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// GET /auth/check-email?email=... — 이메일 중복 확인
router.get("/check-email", async (req: Request, res: Response) => {
  const email = req.query.email as string | undefined
  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "유효한 이메일을 입력해주세요." })
    return
  }
  const existing = await prisma.user.findUnique({ where: { email } })
  res.json({ exists: !!existing })
})

// POST /auth/send-verification — 이메일 인증 코드 발송
router.post("/send-verification", async (req: Request, res: Response) => {
  const { email } = req.body
  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "유효한 이메일을 입력해주세요." })
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: "이미 사용 중인 이메일입니다." })
    return
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    res.status(500).json({ error: "이메일 서버가 설정되지 않았습니다." })
    return
  }

  // 6자리 인증 코드 생성
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + 3 * 60 * 1000) // 3분 유효

  // 기존 미인증 레코드 삭제 후 새로 저장
  await prisma.emailVerification.deleteMany({ where: { email, verified: false } })
  await prisma.emailVerification.create({ data: { email, code, expiresAt } })

  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from: `"AI 면접 어시스턴트" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "[AI 면접 도우미] 이메일 인증 코드",
      html: `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f8f9fc;font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;">
  <div style="max-width:480px;margin:32px auto;padding:16px;">
    <div style="background:#fff;border-radius:16px;border:1px solid #e4e7ef;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.05);">
      <div style="padding:28px 32px 24px;border-bottom:1px solid #f0f2f8;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#4f52e8;letter-spacing:0.08em;text-transform:uppercase;">이메일 인증</p>
        <h1 style="margin:0;font-size:20px;font-weight:800;color:#0d1035;">인증 코드를 확인해주세요</h1>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">아래 6자리 인증 코드를 입력해주세요.<br/>코드는 <strong>3분간</strong> 유효합니다.</p>
        <div style="text-align:center;padding:24px;background:#f8f9fc;border-radius:12px;border:1px solid #e4e7ef;">
          <span style="font-size:36px;font-weight:800;color:#4f52e8;letter-spacing:8px;">${code}</span>
        </div>
        <p style="margin:20px 0 0;font-size:12px;color:#c4c9d6;">본인이 요청하지 않은 경우 이 메일을 무시하세요.</p>
      </div>
    </div>
  </div>
</body>
</html>`,
    })
    res.json({ ok: true })
  } catch (e) {
    console.error("[email] 인증 코드 전송 실패:", e instanceof Error ? e.message : e)
    res.status(500).json({ error: "이메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요." })
  }
})

// POST /auth/verify-code — 인증 코드 검증
router.post("/verify-code", async (req: Request, res: Response) => {
  const { email, code } = req.body
  if (!email || !code) {
    res.status(400).json({ error: "이메일과 인증 코드를 입력해주세요." })
    return
  }

  const record = await prisma.emailVerification.findFirst({
    where: { email, code, verified: false },
    orderBy: { createdAt: "desc" },
  })

  if (!record) {
    res.status(400).json({ error: "인증 코드가 올바르지 않습니다." })
    return
  }
  if (record.expiresAt < new Date()) {
    res.status(400).json({ error: "인증 코드가 만료되었습니다. 다시 발송해주세요." })
    return
  }

  const token = randomUUID()
  await prisma.emailVerification.update({
    where: { id: record.id },
    data: { verified: true, token },
  })

  res.json({ ok: true, token })
})

// POST /auth/signup
router.post("/signup", async (req: Request, res: Response) => {
  const { name, email, password, verifiedToken } = req.body

  if (!name || !email || !password || !verifiedToken) {
    res.status(400).json({ error: "모든 항목을 입력해주세요." })
    return
  }

  const pwError = validatePassword(password)
  if (pwError) {
    res.status(400).json({ error: pwError })
    return
  }

  // 이메일 인증 토큰 검증
  const verification = await prisma.emailVerification.findFirst({
    where: { token: verifiedToken, email, verified: true },
  })
  if (!verification) {
    res.status(400).json({ error: "이메일 인증이 필요합니다." })
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

  // 사용된 인증 레코드 삭제
  await prisma.emailVerification.deleteMany({ where: { email } })

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
