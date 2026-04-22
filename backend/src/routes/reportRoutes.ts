import { Router, Request, Response } from "express"
import prisma from "../lib/prisma"

const router = Router()

// POST /reports — 리포트 저장
router.post("/", async (req: Request, res: Response) => {
  const { email, title, overallScore, scores, questions, fullReport } = req.body

  if (!email) {
    res.status(401).json({ error: "로그인이 필요합니다." })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    res.status(404).json({ error: "사용자를 찾을 수 없습니다." })
    return
  }

  const report = await prisma.interviewReport.create({
    data: {
      userId: user.id,
      title: title ?? "면접 결과",
      overallScore: overallScore ?? 0,
      scores: scores ?? {},
      questions: questions ?? [],
      fullReport: fullReport ?? null,
    },
  })

  res.status(201).json({ id: report.id, createdAt: report.createdAt })
})

// GET /reports?email=xxx — 내 리포트 목록
router.get("/", async (req: Request, res: Response) => {
  const { email } = req.query

  if (!email || typeof email !== "string") {
    res.status(401).json({ error: "로그인이 필요합니다." })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    res.status(404).json({ error: "사용자를 찾을 수 없습니다." })
    return
  }

  const reports = await prisma.interviewReport.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      overallScore: true,
      scores: true,
      questions: true,
      fullReport: true,
      createdAt: true,
    },
  })

  res.json(reports)
})

// DELETE /reports/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string)
  const { email } = req.body

  const user = await prisma.user.findUnique({ where: { email: email as string } })
  if (!user) { res.status(404).json({ error: "사용자를 찾을 수 없습니다." }); return }

  const report = await prisma.interviewReport.findFirst({ where: { id, userId: user.id } })
  if (!report) { res.status(404).json({ error: "리포트를 찾을 수 없습니다." }); return }

  await prisma.interviewReport.delete({ where: { id } })
  res.json({ success: true })
})

export default router
