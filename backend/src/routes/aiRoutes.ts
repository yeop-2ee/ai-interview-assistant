import { Router, Request, Response } from "express"

const router = Router()
const AI_SERVER_URL = () => process.env.AI_SERVER_URL || "http://localhost:5050"

function validateString(val: unknown, maxLen: number): string {
  if (typeof val !== "string") return ""
  return val.slice(0, maxLen)
}

// POST /ai/summary — 이력서 요약 (SSE)
router.post("/summary", async (req: Request, res: Response) => {
  console.log("[summary] 요청 수신")
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.flushHeaders()

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  const body = {
    resumeText: validateString(req.body.resumeText, 5000),
    coverText:  validateString(req.body.coverText,  3000),
    department: validateString(req.body.department, 100),
  }

  try {
    console.log("[summary] AI 서버 요청 중...")
    const aiRes = await fetch(`${AI_SERVER_URL()}/generate/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300000),
    })
    if (!aiRes.ok || !aiRes.body) throw new Error(`AI 서버 오류: ${aiRes.status}`)

    const reader = aiRes.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        if (line.startsWith("data: ")) res.write(line + "\n\n")
      }
    }
  } catch (e) {
    console.error("[summary] 오류:", e instanceof Error ? e.message : e)
    send({ type: "error", message: e instanceof Error ? e.message : "오류" })
  }
  res.end()
})

// POST /ai/relevance — 이력서-학과 관련성 검사 (AI 판단)
router.post("/relevance", async (req: Request, res: Response) => {
  const body = {
    resumeText: validateString(req.body.resumeText, 5000),
    coverText:  validateString(req.body.coverText,  3000),
    department: validateString(req.body.department,  100),
  }

  if (!body.department) return res.json({ isRelevant: true, reason: null })

  try {
    const aiRes = await fetch(`${AI_SERVER_URL()}/generate/relevance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300000),
    })
    const data = await aiRes.json()
    console.log("[relevance proxy] AI응답:", JSON.stringify(data))
    res.json(data)
  } catch (e) {
    console.error("[relevance proxy] 오류:", e instanceof Error ? e.message : e)
    res.json({ isRelevant: true, reason: null })
  }
})

// POST /ai/followup — 꼬리질문 생성
router.post("/followup", async (req: Request, res: Response) => {
  const body = {
    question:        validateString(req.body.question,        500),
    answer:          validateString(req.body.answer,          500),
    department:      validateString(req.body.department,      100),
    jobRole:         validateString(req.body.jobRole,         100),
    companyType:     validateString(req.body.companyType,      50),
    experienceLevel: validateString(req.body.experienceLevel,  50),
    style:           validateString(req.body.style,            50),
  }
  try {
    const aiRes = await fetch(`${AI_SERVER_URL()}/generate/followup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    })
    const data = await aiRes.json()
    res.json(data)
  } catch {
    res.json({ followup: null })
  }
})

// POST /ai/report — 면접 리포트 생성 (SSE)
router.post("/report", async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.flushHeaders()

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  const rawQuestions = Array.isArray(req.body.questions) ? req.body.questions : []
  const rawAnswers   = Array.isArray(req.body.answers)   ? req.body.answers   : []
  const body = {
    questions:     rawQuestions.slice(0, 20).map((q: unknown) => validateString(q, 500)),
    answers:       rawAnswers.slice(0, 20).map((a: unknown) => validateString(a, 1000)),
    department:    validateString(req.body.department,    100),
    interviewType: validateString(req.body.interviewType,  50),
  }

  try {
    const aiRes = await fetch(`${AI_SERVER_URL()}/generate/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300000),
    })
    if (!aiRes.ok || !aiRes.body) throw new Error(`AI 서버 오류: ${aiRes.status}`)

    const reader = aiRes.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        if (line.startsWith("data: ")) res.write(line + "\n\n")
      }
    }
  } catch (e) {
    send({ type: "error", message: e instanceof Error ? e.message : "오류" })
  }
  res.end()
})

export default router
