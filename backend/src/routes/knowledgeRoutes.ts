import { Router, Request, Response } from "express"
import prisma from "../lib/prisma"
import { requireAuth } from "../middleware/auth"

const router = Router()

router.use(requireAuth)

// GET /knowledge?department=xxx  — 학과별 전체 목록
router.get("/", async (req: Request, res: Response) => {
  const { department } = req.query
  if (!department || typeof department !== "string") {
    res.status(400).json({ error: "department 파라미터가 필요합니다." })
    return
  }
  const entries = await prisma.knowledgeEntry.findMany({
    where: { department },
    orderBy: { createdAt: "asc" },
  })
  res.json(entries)
})

// POST /knowledge  — 항목 추가 (admin 전용)
router.post("/", async (req: Request, res: Response) => {
  const { department, subject, content, registeredBy, email } = req.body
  if (!email) { res.status(401).json({ error: "인증이 필요합니다." }); return }
  const requester = await prisma.user.findUnique({ where: { email } })
  if (!requester || requester.role !== "admin") {
    res.status(403).json({ error: "관리자 권한이 필요합니다." })
    return
  }
  if (!department || !subject || !content) {
    res.status(400).json({ error: "department, subject, content 모두 필요합니다." })
    return
  }
  const entry = await prisma.knowledgeEntry.create({
    data: { department, subject, content, registeredBy: registeredBy ?? "" },
  })
  res.status(201).json(entry)
})

// DELETE /knowledge/:id  — 항목 삭제 (admin 전용)
router.delete("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string)
  const { email } = req.body
  if (!email) { res.status(401).json({ error: "인증이 필요합니다." }); return }
  const requester = await prisma.user.findUnique({ where: { email } })
  if (!requester || requester.role !== "admin") {
    res.status(403).json({ error: "관리자 권한이 필요합니다." })
    return
  }
  await prisma.knowledgeEntry.delete({ where: { id } })
  res.json({ success: true })
})

export default router
