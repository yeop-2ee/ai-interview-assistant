import express, { Request, Response } from "express"
import prisma from "../lib/prisma"

const router = express.Router()

router.post("/questions", async (req: Request, res: Response) => {
  const { resumeText, department, jobRole, companyType, experienceLevel, interviewType, style } = req.body

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.flushHeaders()

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  try {
    let knowledgeEntries: { subject: string; content: string }[] = []

    if (department && (interviewType === "major" || interviewType === "mixed")) {
      knowledgeEntries = await prisma.knowledgeEntry.findMany({
        where: { department },
        select: { subject: true, content: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    }

    const AI_SERVER_URL = process.env.AI_SERVER_URL || "http://localhost:5050"
    const aiRes = await fetch(`${AI_SERVER_URL}/generate/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeText, knowledgeEntries,
        department, jobRole, companyType, experienceLevel,
        interviewType, style,
      }),
      signal: AbortSignal.timeout(360000),
    })

    if (!aiRes.ok || !aiRes.body) throw new Error(`AI 서버 오류: ${aiRes.status}`)

    const reader = aiRes.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    let questions: string[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue
        let event: Record<string, unknown>
        try { event = JSON.parse(line.slice(6)) } catch { continue }

        if (event.type === "progress") {
          send({ type: "progress", progress: event.progress, step: event.step })
        } else if (event.type === "done") {
          questions = event.questions as string[]
          send({ type: "done", questions: event.questions, categories: event.categories, source: "ai" })
        } else if (event.type === "error") {
          throw new Error(String(event.message))
        }
      }
    }

    // 마지막 버퍼 처리 (trailing newline 없는 경우 대비)
    if (buffer.startsWith("data: ")) {
      try {
        const event: Record<string, unknown> = JSON.parse(buffer.slice(6))
        if (event.type === "progress") {
          send({ type: "progress", progress: event.progress, step: event.step })
        } else if (event.type === "done") {
          questions = event.questions as string[]
          send({ type: "done", questions: event.questions, categories: event.categories, source: "ai" })
        }
      } catch { /* 무시 */ }
    }

    if (questions.length === 0) throw new Error("질문 배열이 비어 있습니다.")
  } catch (error) {
    console.error("AI 질문 생성 실패:", error instanceof Error ? error.message : error)
    send({ type: "done", questions: [], source: "failed" })
  }

  res.end()
})

export default router
