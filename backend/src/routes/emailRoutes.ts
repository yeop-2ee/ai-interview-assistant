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
        <div style="margin-bottom:16px; border-radius:12px; border:1px solid #e4e7ef; overflow:hidden;">
          <div style="padding:12px 18px; background:#f8f9fc; border-bottom:1px solid #e4e7ef;">
            <span style="display:inline-block; padding:2px 8px; border-radius:6px; background:#eef0fd; color:#4f52e8; font-size:11px; font-weight:700; margin-bottom:6px;">Q${i + 1}</span>
            <p style="margin:0; font-size:13.5px; font-weight:700; color:#0d1035; line-height:1.5;">${q}</p>
          </div>
          <div style="padding:14px 18px; background:#ffffff;">
            <p style="margin:0; font-size:13px; color:#374151; line-height:1.75; white-space:pre-wrap;">${a}</p>
          </div>
        </div>`
    })
    .join("")

  const surveyHtml = surveys && surveys.length > 0
    ? `<div style="margin-bottom:24px; border-radius:12px; border:1px solid #e4e7ef; overflow:hidden;">
         <div style="padding:12px 18px; background:#f8f9fc; border-bottom:1px solid #e4e7ef;">
           <p style="margin:0; font-size:11px; font-weight:700; color:#6b7280; letter-spacing:0.06em; text-transform:uppercase;">설문 응답</p>
         </div>
         <div style="padding:14px 18px; background:#ffffff;">
           ${surveys.map(s =>
             `<div style="display:flex; align-items:center; gap:12px; padding:6px 0; border-bottom:1px solid #f3f4f6;">
                <span style="font-size:12px; color:#9ca3af; min-width:130px;">${s.label}</span>
                <span style="font-size:12.5px; font-weight:600; color:#0d1035;">${s.value}</span>
              </div>`
           ).join("")}
         </div>
       </div>`
    : ""

  const now = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0; padding:0; background:#f8f9fc; font-family:'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif;">
  <div style="max-width:620px; margin:32px auto; padding:0 16px 40px;">

    <!-- 헤더 로고 영역 -->
    <div style="padding:28px 0 20px; text-align:center;">
      <div style="display:inline-flex; align-items:center; gap:10px; background:#0d1035; border-radius:12px; padding:10px 18px;">
        <div style="width:28px; height:28px; background:#4f52e8; border-radius:6px; display:inline-block; flex-shrink:0;"></div>
        <span style="font-size:15px; font-weight:800; color:#ffffff; letter-spacing:-0.3px;">AI기반 맞춤 면접 도우미</span>
      </div>
    </div>

    <!-- 메인 카드 -->
    <div style="background:#ffffff; border-radius:16px; border:1px solid #e4e7ef; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.05);">

      <!-- 카드 헤더 -->
      <div style="padding:28px 32px 24px; border-bottom:1px solid #f0f2f8;">
        <p style="margin:0 0 6px; font-size:11px; font-weight:700; color:#4f52e8; letter-spacing:0.08em; text-transform:uppercase;">면접 결과 리포트</p>
        <h1 style="margin:0 0 6px; font-size:22px; font-weight:800; color:#0d1035; letter-spacing:-0.5px;">면접이 완료되었습니다</h1>
        <p style="margin:0; font-size:13px; color:#9ca3af;">${now} · 총 ${questions.length}개 질문</p>
      </div>

      <!-- 본문 -->
      <div style="padding:24px 32px;">
        ${surveyHtml}

        <!-- 질문 목록 레이블 -->
        <p style="margin:0 0 14px; font-size:11px; font-weight:700; color:#6b7280; letter-spacing:0.06em; text-transform:uppercase;">질문 &amp; 답변</p>

        ${rows}
      </div>

      <!-- 카드 푸터 -->
      <div style="padding:18px 32px; background:#f8f9fc; border-top:1px solid #f0f2f8; display:flex; align-items:center; justify-content:space-between;">
        <p style="margin:0; font-size:11.5px; color:#c4c9d6;">본 메일은 자동 발송된 메일입니다.</p>
        <p style="margin:0; font-size:11.5px; color:#c4c9d6;">AI 면접 도우미</p>
      </div>
    </div>

    <!-- 하단 여백 문구 -->
    <p style="text-align:center; margin:20px 0 0; font-size:11px; color:#c4c9d6;">면접 준비에 도움이 되셨으면 합니다.</p>
  </div>
</body>
</html>`
}

// POST /email/send-results
router.post("/send-results", async (req: Request, res: Response) => {
  const { email, questions, answers, surveys } = req.body as {
    email: string | null
    questions: string[]
    answers: string[]
    surveys?: { label: string; value: string }[]
  }

  // 설문 응답 DB 저장 (이메일 동의 여부와 무관하게 항상 저장)
  if (surveys && surveys.length > 0) {
    try {
      const purpose        = surveys.find(s => s.label === "면접 목적")?.value ?? null
      const naturalnessRaw = surveys.find(s => s.label === "면접 질문 만족도")?.value
      const naturalness    = naturalnessRaw ? parseInt(naturalnessRaw) : null
      const feedback       = surveys.find(s => s.label === "개선 의견")?.value ?? null

      await prisma.surveyResponse.create({
        data: {
          purpose,
          naturalness: isNaN(naturalness as number) ? null : naturalness,
          feedback,
          email: email ?? null,
        },
      })
      console.log("[survey] DB 저장 완료")
    } catch (e) {
      console.error("[survey] DB 저장 실패:", e instanceof Error ? e.message : e)
    }
  }

  // 이메일 동의 없음 — 설문만 저장하고 종료
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.json({ ok: true, skipped: true })
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
