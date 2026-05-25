import { Router, Request, Response } from "express"
import { PrismaClient } from "@prisma/client"

const router = Router()
const prisma = new PrismaClient()

// GET /admin/surveys — 설문 통계
router.get("/surveys", async (_req: Request, res: Response) => {
  try {
    const all = await prisma.surveyResponse.findMany({ orderBy: { createdAt: "desc" } })

    const total = all.length

    // 면접 목적 분포
    const purposeMap: Record<string, number> = {}
    all.forEach(r => {
      if (r.purpose) purposeMap[r.purpose] = (purposeMap[r.purpose] ?? 0) + 1
    })

    // AI 자연스러움 분포 (1~5)
    const naturalnessMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let naturalnessSum = 0, naturalnessCount = 0
    all.forEach(r => {
      if (r.naturalness && r.naturalness >= 1 && r.naturalness <= 5) {
        naturalnessMap[r.naturalness] = (naturalnessMap[r.naturalness] ?? 0) + 1
        naturalnessSum += r.naturalness
        naturalnessCount++
      }
    })
    const naturalnessAvg = naturalnessCount > 0
      ? Math.round((naturalnessSum / naturalnessCount) * 10) / 10
      : null

    // 최근 개선 의견 (최대 20개, 내용 있는 것만)
    const feedbacks = all
      .filter(r => r.feedback && r.feedback.trim().length > 0)
      .slice(0, 20)
      .map(r => ({ id: r.id, feedback: r.feedback, createdAt: r.createdAt }))

    // 일별 응답 추이 (최근 30일)
    const since = new Date()
    since.setDate(since.getDate() - 29)
    since.setHours(0, 0, 0, 0)

    const dailyMap: Record<string, number> = {}
    all
      .filter(r => new Date(r.createdAt) >= since)
      .forEach(r => {
        const day = r.createdAt.toISOString().slice(0, 10)
        dailyMap[day] = (dailyMap[day] ?? 0) + 1
      })

    // 빈 날짜도 0으로 채우기
    const daily: { date: string; count: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      daily.push({ date: key, count: dailyMap[key] ?? 0 })
    }

    res.json({ total, purposeMap, naturalnessMap, naturalnessAvg, feedbacks, daily })
  } catch (e) {
    console.error("[admin/surveys] 오류:", e)
    res.status(500).json({ error: "통계 조회 실패" })
  }
})

export default router
