import { Router, Request, Response } from "express"
import bcrypt from "bcrypt"
import prisma from "../lib/prisma"

const router = Router()

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
  const user = await prisma.user.create({
    data: { name, email, password: hashed },
  })

  res.status(201).json({ id: user.id, name: user.name, email: user.email })
})

// POST /auth/login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password, mode } = req.body  // mode: "user" | "admin"

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

  if (mode === "admin" && user.role !== "admin") {
    res.status(403).json({ error: "관리자 계정이 아닙니다." })
    return
  }
  if (mode === "user" && user.role === "admin") {
    res.status(403).json({ error: "관리자 계정은 관리자 로그인을 이용해주세요." })
    return
  }

  res.json({ id: user.id, name: user.name, email: user.email, role: user.role })
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
