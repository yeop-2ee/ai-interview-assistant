import { Router, Request, Response } from "express"
import nodemailer from "nodemailer"
import prisma from "../lib/prisma"

const router = Router()

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

function buildQuestionsHtml(
  questions: string[],
  answers: string[],
  surveys?: { label: string; value: string }[]
): string {
  const rows = questions
    .map((q, i) => {
      const a = answers[i] ?? "(답변 없음)"
      return `
        <div style="margin-bottom:24px; padding:16px; background:#f9fafb; border-radius:10px; border:1px solid #e5e7eb;">
          <p style="margin:0 0 8px; font-size:13px; font-weight:700; color:#4f52e8;">Q${i + 1}. ${q}</p>
          <p style="margin:0; font-size:13px; color:#374151; line-height:1.7; white-space:pre-wrap;">${a}</p>
        </div>`
    })
    .join("")

  const surveyHtml = surveys && surveys.length > 0
    ? `<div style="margin-bottom:28px; padding:16px; background:#f5f3ff; border-radius:10px; border:1px solid #ddd6fe;">
         <p style="margin:0 0 10px; font-size:12px; font-weight:700; color:#5b21b6; letter-spacing:0.05em;">📊 설문 응답</p>
         ${surveys.map(s =>
           `<div style="margin-bottom:6px; display:flex; gap:8px; align-items:flex-start;">
              <span style="font-size:12px; color:#7c3aed; font-weight:600; min-width:140px;">${s.label}</span>
              <span style="font-size:12px; color:#374151;">${s.value}</span>
            </div>`
         ).join("")}
       </div>`
    : ""

  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"/></head>
<body style="margin:0; padding:0; background:#f3f4f6; font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;">
  <div style="max-width:640px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- 헤더 -->
    <div style="background:linear-gradient(135deg,#4f52e8,#7c3aed); padding:32px 32px 24px;">
      <h1 style="margin:0; font-size:22px; font-weight:800; color:#fff;">AI 면접 어시스턴트</h1>
      <p style="margin:6px 0 0; font-size:14px; color:rgba(255,255,255,0.8);">면접 질문 &amp; 답변 결과</p>
    </div>

    <!-- 본문 -->
    <div style="padding:28px 32px;">
      ${surveyHtml}
      <p style="margin:0 0 20px; font-size:14px; color:#6b7280;">
        총 <strong style="color:#374151;">${questions.length}개</strong> 질문에 대한 면접 결과입니다.
      </p>
      ${rows}
    </div>

    <!-- 푸터 -->
    <div style="padding:20px 32px; background:#f9fafb; border-top:1px solid #e5e7eb; text-align:center;">
      <p style="margin:0; font-size:12px; color:#9ca3af;">AI 면접 어시스턴트가 보낸 자동 발송 메일입니다.</p>
    </div>
  </div>
</body>
</html>`
}

// POST /email/send-results
router.post("/send-results", async (req: Request, res: Response) => {
  const { email, questions, answers, surveys } = req.body as {
    email: string
    questions: string[]
    answers: string[]
    surveys?: { label: string; value: string }[]
  }

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ ok: false, message: "유효하지 않은 이메일입니다." })
  }

  // 설문 응답 DB 저장
  if (surveys && surveys.length > 0) {
    try {
      const purpose     = surveys.find(s => s.label === "면접 목적")?.value ?? null
      const naturalnessRaw = surveys.find(s => s.label === "면접 질문 만족도")?.value
      const naturalness = naturalnessRaw ? parseInt(naturalnessRaw) : null
      const feedback    = surveys.find(s => s.label === "개선 의견")?.value ?? null

      await prisma.surveyResponse.create({
        data: {
          purpose,
          naturalness: isNaN(naturalness as number) ? null : naturalness,
          feedback,
          email,
        },
      })
      console.log("[survey] DB 저장 완료")
    } catch (e) {
      console.error("[survey] DB 저장 실패:", e instanceof Error ? e.message : e)
    }
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[email] SMTP 환경변수 미설정 — 이메일 전송 생략")
    return res.json({ ok: true, skipped: true })
  }

  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from: `"AI 면접 어시스턴트" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "AI 면접 결과 — 질문 및 답변",
      html: buildQuestionsHtml(questions ?? [], answers ?? [], surveys),
    })
    console.log(`[email] 전송 완료 → ${email}`)
    res.json({ ok: true })
  } catch (e) {
    console.error("[email] 전송 실패:", e instanceof Error ? e.message : e)
    res.status(500).json({ ok: false, message: "이메일 전송 실패" })
  }
})

export default router
