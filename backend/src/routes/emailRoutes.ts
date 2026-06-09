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
  <div style="max-width:620px; margin:32px auto; padding:32px 16px 40px;">

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

// POST /email/send-report — 면접 리포트 전체를 이메일로 발송
router.post("/send-report", async (req: Request, res: Response) => {
  const { email, report, subtitle } = req.body as {
    email: string
    subtitle?: string
    report: {
      overallScore: number
      scores: Record<string, number>
      strengths: string[]
      weaknesses: string[]
      precautions: string[]
      fitScores: Record<string, number>
      fitComments: Record<string, string>
      questions: string[]
      answers: string[]
      questionFeedback: {
        appropriateness: number
        lengthEval: string
        comment: string
        improvedAnswer: string
      }[]
    }
  }

  if (!email || !email.includes("@")) {
    return res.status(400).json({ ok: false, message: "유효한 이메일을 입력해주세요." })
  }
  if (!report) {
    return res.status(400).json({ ok: false, message: "리포트 데이터가 없습니다." })
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[email] SMTP 환경변수 미설정 — 이메일 전송 생략")
    return res.status(500).json({ ok: false, message: "이메일 서버가 설정되지 않았습니다." })
  }

  const SCORE_ITEMS = [
    { key: "content",     label: "답변 내용",  color: "#4f52e8" },
    { key: "logic",       label: "논리 구조",  color: "#0ea5e9" },
    { key: "delivery",    label: "전달력",     color: "#059669" },
    { key: "reliability", label: "신뢰도",     color: "#8b5cf6" },
    { key: "likability",  label: "호감도",     color: "#f59e0b" },
  ]
  const FIT_ITEMS = [
    { key: "job",     label: "직무 적합도", color: "#4f52e8" },
    { key: "org",     label: "조직 적합도", color: "#059669" },
    { key: "company", label: "기업 적합도", color: "#f59e0b" },
  ]

  const overallColor = report.overallScore >= 80 ? "#059669" : report.overallScore >= 65 ? "#d97706" : "#dc2626"
  const now = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })

  const scoreCardsHtml = SCORE_ITEMS.map(s =>
    `<div style="text-align:center;padding:14px 12px;background:#f8f9fc;border-radius:10px;border:1px solid #e4e7ef;">
       <div style="font-size:22px;font-weight:800;color:${s.color};line-height:1;">${report.scores[s.key] ?? 0}</div>
       <div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:500;">${s.label}</div>
     </div>`
  ).join("")

  const strengthsHtml = report.strengths.map((s, i) =>
    `<div style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;">
       <span style="width:20px;height:20px;border-radius:50%;background:#d1fae5;color:#059669;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i+1}</span>
       <span style="font-size:13px;color:#374151;line-height:1.6;">${s}</span>
     </div>`
  ).join("")

  const weaknessesHtml = report.weaknesses.map((w, i) =>
    `<div style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;">
       <span style="width:20px;height:20px;border-radius:50%;background:#ffe4e6;color:#e11d48;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i+1}</span>
       <span style="font-size:13px;color:#374151;line-height:1.6;">${w}</span>
     </div>`
  ).join("")

  const fitHtml = FIT_ITEMS.map(f => {
    const score = report.fitScores[f.key] ?? 0
    return `<div style="margin-bottom:14px;">
       <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
         <span style="font-size:12px;font-weight:600;color:#374151;">${f.label}</span>
         <span style="font-size:12px;font-weight:700;color:${f.color};">${score}점</span>
       </div>
       <div style="width:100%;height:8px;background:#f0f2f8;border-radius:99px;overflow:hidden;">
         <div style="width:${score}%;height:100%;background:${f.color};border-radius:99px;"></div>
       </div>
       <p style="margin:4px 0 0;font-size:12px;color:#6b7280;line-height:1.5;">${report.fitComments[f.key] ?? ""}</p>
     </div>`
  }).join("")

  const questionsHtml = report.questions.map((q, i) => {
    const fb = report.questionFeedback[i]
    const answer = report.answers[i]
    return `<div style="margin-bottom:16px;border-radius:12px;border:1px solid #e4e7ef;overflow:hidden;">
      <div style="padding:12px 18px;background:#f8f9fc;border-bottom:1px solid #e4e7ef;">
        <span style="display:inline-block;padding:2px 8px;border-radius:6px;background:#eef0fd;color:#4f52e8;font-size:11px;font-weight:700;margin-bottom:6px;">Q${i+1}</span>
        <p style="margin:0;font-size:13.5px;font-weight:700;color:#0d1035;line-height:1.5;">${q}</p>
      </div>
      <div style="padding:14px 18px;background:#fff;">
        <p style="margin:0 0 10px;font-size:13px;color:#374151;line-height:1.75;white-space:pre-wrap;">${answer ?? "(답변 없음)"}</p>
        ${fb?.comment ? `<p style="margin:0 0 8px;font-size:12.5px;color:#6b7280;line-height:1.6;border-left:3px solid #e4e7ef;padding-left:10px;">${fb.comment}</p>` : ""}
        ${fb?.improvedAnswer ? `<div style="background:#eef0fd;border-radius:8px;padding:10px 14px;margin-top:8px;"><p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#4f52e8;">개선된 답변 예시</p><p style="margin:0;font-size:12.5px;color:#374151;line-height:1.65;">${fb.improvedAnswer}</p></div>` : ""}
      </div>
    </div>`
  }).join("")

  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8f9fc;font-family:'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif;">
<div style="max-width:640px;margin:32px auto;padding:16px;">
  <div style="background:#fff;border-radius:16px;border:1px solid #e4e7ef;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.05);">

    <!-- 헤더 -->
    <div style="padding:28px 32px 24px;background:#0d1035;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#a5a7f3;letter-spacing:0.08em;text-transform:uppercase;">면접 결과 리포트</p>
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#fff;">면접이 완료되었습니다</h1>
      <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.4);">${now}${subtitle ? " · " + subtitle : ""}</p>
    </div>

    <div style="padding:28px 32px;">

      <!-- 종합 점수 -->
      <div style="text-align:center;padding:24px;background:#f8f9fc;border-radius:14px;border:1px solid #e4e7ef;margin-bottom:24px;">
        <div style="font-size:13px;color:#9ca3af;margin-bottom:6px;font-weight:500;">종합 점수</div>
        <div style="font-size:52px;font-weight:900;color:${overallColor};line-height:1;">${report.overallScore}</div>
      </div>

      <!-- 5개 점수 -->
      <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.06em;text-transform:uppercase;">세부 점수</p>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:24px;">
        ${scoreCardsHtml}
      </div>

      <!-- 강점 / 보완점 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;">
          <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#059669;letter-spacing:0.06em;text-transform:uppercase;">나의 강점</p>
          ${strengthsHtml}
        </div>
        <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;padding:16px;">
          <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#e11d48;letter-spacing:0.06em;text-transform:uppercase;">보완할 점</p>
          ${weaknessesHtml}
        </div>
      </div>

      <!-- 적합도 -->
      <div style="background:#f8f9fc;border:1px solid #e4e7ef;border-radius:12px;padding:18px;margin-bottom:24px;">
        <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.06em;text-transform:uppercase;">적합도 평가</p>
        ${fitHtml}
      </div>

      <!-- 질문별 피드백 -->
      <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.06em;text-transform:uppercase;">질문 &amp; 답변 피드백</p>
      ${questionsHtml}

    </div>

    <!-- 푸터 -->
    <div style="padding:16px 32px;background:#f8f9fc;border-top:1px solid #f0f2f8;text-align:center;">
      <p style="margin:0;font-size:11.5px;color:#c4c9d6;">본 메일은 자동 발송된 메일입니다. · AI 면접 도우미</p>
    </div>
  </div>
</div>
</body>
</html>`

  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from: `"AI 면접 어시스턴트" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `AI 면접 리포트 — 종합 점수 ${report.overallScore}점`,
      html,
    })
    console.log(`[email] 리포트 전송 완료 → ${email}`)
    res.json({ ok: true })
  } catch (e) {
    console.error("[email] 리포트 전송 실패:", e instanceof Error ? e.message : e)
    res.status(500).json({ ok: false, message: "이메일 전송 실패" })
  }
})

export default router
