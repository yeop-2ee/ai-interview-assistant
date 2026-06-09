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

// ─── 이메일 공통 래퍼 ────────────────────────────────────────────────────────
function wrapHtml(body: string, title = "AI 면접 어시스턴트") {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f8f9fc;font-family:'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif;">
  <div style="max-width:660px;margin:32px auto;padding:0 16px 40px;">
    ${body}
    <p style="text-align:center;margin:20px 0 0;font-size:11px;color:#c4c9d6;">본 메일은 자동 발송된 메일입니다. · AI 면접 도우미</p>
  </div>
</body>
</html>`
}

// ─── 면접 Q&A 이메일 HTML (꼬리질문 포함) ────────────────────────────────────
function buildQuestionsHtml(
  questions: string[],
  answers: string[],
  followupParentLabels?: Record<string, string>,
  surveys?: { label: string; value: string }[]
): string {
  const now = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })

  const surveyHtml = surveys && surveys.length > 0
    ? `<div style="margin-bottom:24px;border-radius:12px;border:1px solid #e4e7ef;overflow:hidden;">
         <div style="padding:12px 18px;background:#f8f9fc;border-bottom:1px solid #e4e7ef;">
           <p style="margin:0;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.06em;text-transform:uppercase;">설문 응답</p>
         </div>
         <div style="padding:14px 18px;background:#fff;">
           ${surveys.map(s =>
             `<div style="display:flex;align-items:center;gap:12px;padding:6px 0;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:12px;color:#9ca3af;min-width:130px;">${s.label}</span>
                <span style="font-size:12.5px;font-weight:600;color:#0d1035;">${s.value}</span>
              </div>`
           ).join("")}
         </div>
       </div>`
    : ""

  let mainQCounter = 0
  const rows = questions.map((q, i) => {
    const a = answers[i] ?? "(답변 없음)"
    const isFollowup = !!(followupParentLabels && followupParentLabels[q])
    const parentLabel = isFollowup ? followupParentLabels![q] : null
    if (!isFollowup) mainQCounter++
    const qLabel = isFollowup ? `${parentLabel}-1` : `Q${mainQCounter}`

    return `<div style="margin-bottom:16px;border-radius:12px;border:1px solid ${isFollowup ? "#c7d2fe" : "#e4e7ef"};overflow:hidden;${isFollowup ? "background:#fafbff;" : ""}">
      <div style="padding:12px 18px;background:${isFollowup ? "#eef0fd" : "#f8f9fc"};border-bottom:1px solid ${isFollowup ? "#c7d2fe" : "#e4e7ef"};">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="display:inline-block;padding:2px 8px;border-radius:6px;background:#eef0fd;color:#4f52e8;font-size:11px;font-weight:700;">${qLabel}</span>
          ${isFollowup ? `<span style="display:inline-block;padding:2px 8px;border-radius:99px;background:#eef0fd;color:#4f52e8;font-size:10px;font-weight:700;">꼬리질문</span>` : ""}
        </div>
        <p style="margin:0;font-size:13.5px;font-weight:700;color:#0d1035;line-height:1.5;">${q}</p>
      </div>
      <div style="padding:14px 18px;background:#ffffff;">
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.75;white-space:pre-wrap;">${a}</p>
      </div>
    </div>`
  }).join("")

  return wrapHtml(`
    <div style="background:#fff;border-radius:16px;border:1px solid #e4e7ef;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.05);">
      <div style="padding:28px 32px 24px;border-bottom:1px solid #f0f2f8;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#4f52e8;letter-spacing:0.08em;text-transform:uppercase;">면접 결과</p>
        <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0d1035;">면접이 완료되었습니다</h1>
        <p style="margin:0;font-size:13px;color:#9ca3af;">${now} · 총 ${questions.length}개 질문</p>
      </div>
      <div style="padding:24px 32px;">
        ${surveyHtml}
        <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.06em;text-transform:uppercase;">질문 &amp; 답변</p>
        ${rows}
      </div>
    </div>
  `, "AI 면접 결과")
}

// ─── 리포트 전체 이메일 HTML (리포트 페이지와 동일 디자인) ─────────────────
function buildReportHtml(
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
    categories: string[]
    followupParentLabels?: Record<string, string>
    questionFeedback: {
      appropriateness: number
      lengthEval: string
      comment: string
      improvedAnswer: string
      followUpQuestions: string[]
    }[]
  },
  subtitle?: string
): string {
  const now = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })
  const overallColor = report.overallScore >= 80 ? "#059669" : report.overallScore >= 65 ? "#d97706" : "#dc2626"

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
  const CATEGORY_COLORS: Record<string, string> = {
    "소개": "#7c3aed", "공통": "#2563eb", "직무": "#4338ca",
    "이력서": "#0f766e", "인성": "#c2410c", "전공": "#0891b2",
  }

  // ── 세부 점수 카드 ──
  const scoreCardsHtml = SCORE_ITEMS.map(s => {
    const score = report.scores[s.key] ?? 0
    const pct = score
    return `<td style="width:20%;padding:0 4px;">
      <div style="text-align:center;padding:14px 8px;background:#f8f9fc;border-radius:12px;border:1px solid #e4e7ef;">
        <div style="font-size:24px;font-weight:800;color:${s.color};line-height:1;margin-bottom:4px;">${score}</div>
        <div style="width:100%;height:4px;background:#e4e7ef;border-radius:99px;margin-bottom:6px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${s.color};border-radius:99px;"></div>
        </div>
        <div style="font-size:11px;color:#6b7280;font-weight:500;">${s.label}</div>
      </div>
    </td>`
  }).join("")

  // ── 강점 / 보완점 ──
  const strengthsHtml = report.strengths.map((s, i) =>
    `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
       <span style="min-width:20px;height:20px;border-radius:50%;background:#d1fae5;color:#059669;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${i+1}</span>
       <span style="font-size:13px;color:#374151;line-height:1.6;">${s}</span>
     </div>`
  ).join("")

  const weaknessesHtml = report.weaknesses.map((w, i) =>
    `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
       <span style="min-width:20px;height:20px;border-radius:50%;background:#ffe4e6;color:#e11d48;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${i+1}</span>
       <span style="font-size:13px;color:#374151;line-height:1.6;">${w}</span>
     </div>`
  ).join("")

  // ── 적합도 ──
  const fitHtml = FIT_ITEMS.map(f => {
    const score = report.fitScores[f.key] ?? 0
    return `<div style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:13px;font-weight:600;color:#374151;">${f.label}</span>
        <span style="font-size:13px;font-weight:700;color:${f.color};">${score}점</span>
      </div>
      <div style="width:100%;height:8px;background:#f0f2f8;border-radius:99px;overflow:hidden;margin-bottom:6px;">
        <div style="width:${score}%;height:100%;background:${f.color};border-radius:99px;"></div>
      </div>
      <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">${report.fitComments[f.key] ?? ""}</p>
    </div>`
  }).join("")

  // ── 주의사항 ──
  const precautionsHtml = report.precautions.map((p, i) =>
    `<div style="display:flex;align-items:flex-start;gap:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 14px;margin-bottom:8px;">
       <span style="font-size:11px;font-weight:700;color:#d97706;flex-shrink:0;">0${i+1}</span>
       <span style="font-size:13px;color:#374151;line-height:1.6;">${p}</span>
     </div>`
  ).join("")

  // ── 질문별 상세 피드백 ──
  let mainQCounter = 0
  const questionsHtml = report.questions.map((q, i) => {
    const fb = report.questionFeedback[i]
    const answer = report.answers[i]
    const category = report.categories?.[i] ?? ""
    const isFollowup = !!(report.followupParentLabels && report.followupParentLabels[q])
    const parentLabel = isFollowup ? report.followupParentLabels![q] : null
    if (!isFollowup) mainQCounter++
    const qLabel = isFollowup ? `${parentLabel}-1` : `Q${mainQCounter}`
    const catColor = CATEGORY_COLORS[category] ?? "#6b7280"
    const lengthColor = fb?.lengthEval === "적절" ? "#059669" : fb?.lengthEval === "짧음" ? "#d97706" : "#dc2626"
    const lengthBg   = fb?.lengthEval === "적절" ? "#d1fae5" : fb?.lengthEval === "짧음" ? "#fef3c7" : "#fee2e2"

    return `<div style="margin-bottom:20px;border-radius:14px;border:1px solid ${isFollowup ? "#c7d2fe" : "#e4e7ef"};overflow:hidden;${isFollowup ? "background:#fafbff;" : ""}">
      <!-- 질문 헤더 -->
      <div style="padding:14px 20px;background:${isFollowup ? "#eef0fd" : "#f8f9fc"};border-bottom:1px solid ${isFollowup ? "#c7d2fe" : "#e4e7ef"};">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
          <span style="display:inline-block;padding:2px 8px;border-radius:6px;background:#f0f2f8;border:1px solid #e4e7ef;color:${isFollowup ? "#4f52e8" : "#9ca3af"};font-size:11px;font-weight:700;">${qLabel}</span>
          ${isFollowup
            ? `<span style="display:inline-block;padding:2px 8px;border-radius:99px;background:#eef0fd;color:#4f52e8;font-size:10px;font-weight:700;">꼬리질문</span>`
            : category
            ? `<span style="display:inline-block;padding:2px 8px;border-radius:99px;background:${catColor}18;color:${catColor};font-size:10px;font-weight:700;">${category}</span>`
            : ""
          }
        </div>
        <p style="margin:0;font-size:14px;font-weight:700;color:#0d1035;line-height:1.5;">${q}</p>
      </div>
      <!-- 답변 -->
      <div style="padding:16px 20px;background:#fff;border-bottom:1px solid #f0f2f8;">
        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.75;font-style:italic;border-left:2px solid #e4e7ef;padding-left:12px;">
          ${answer ? `"${answer}"` : "(답변이 기록되지 않았습니다.)"}
        </p>
      </div>
      ${fb ? `
      <!-- 피드백 -->
      <div style="padding:16px 20px;background:#fff;">
        <!-- 점수 + 길이 -->
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:120px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="font-size:11px;color:#9ca3af;">답변 적절성</span>
              <span style="font-size:11px;font-weight:700;color:#374151;">${fb.appropriateness}</span>
            </div>
            <div style="width:100%;height:6px;background:#f0f2f8;border-radius:99px;overflow:hidden;">
              <div style="width:${fb.appropriateness}%;height:100%;background:#4f52e8;border-radius:99px;"></div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:11px;color:#9ca3af;">답변 길이</span>
            <span style="padding:2px 8px;border-radius:99px;background:${lengthBg};color:${lengthColor};font-size:11px;font-weight:600;">${fb.lengthEval}</span>
          </div>
        </div>
        <!-- 코멘트 -->
        ${fb.comment ? `<p style="margin:0 0 12px;font-size:13px;color:#374151;line-height:1.65;">${fb.comment}</p>` : ""}
        <!-- 개선 답변 -->
        ${fb.improvedAnswer ? `
        <div style="background:#eef0fd;border:1px solid #c7d2fe;border-radius:10px;padding:12px 16px;margin-bottom:12px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#4f52e8;">개선된 답변 예시</p>
          <p style="margin:0;font-size:13px;color:#374151;line-height:1.65;">${fb.improvedAnswer}</p>
        </div>` : ""}
        <!-- 꼬리질문 태그 (메인 질문에만) -->
        ${!isFollowup && fb.followUpQuestions && fb.followUpQuestions.length > 0 ? `
        <div>
          <span style="font-size:11px;color:#9ca3af;font-weight:500;display:block;margin-bottom:6px;">나올 수 있는 꼬리 질문</span>
          <div>
            ${fb.followUpQuestions.filter(Boolean).map(fq =>
              `<span style="display:inline-block;margin:0 4px 4px 0;font-size:12px;color:#374151;background:#f8f9fc;border:1px solid #e4e7ef;padding:3px 10px;border-radius:99px;">${fq}</span>`
            ).join("")}
          </div>
        </div>` : ""}
      </div>` : ""}
    </div>`
  }).join("")

  return wrapHtml(`
    <!-- 헤더 -->
    <div style="background:#0d1035;border-radius:16px 16px 0 0;padding:28px 32px 24px;margin-bottom:0;">
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#a5a7f3;letter-spacing:0.08em;text-transform:uppercase;">면접 결과 리포트</p>
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#fff;">면접 결과 리포트</h1>
      <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.4);">${now}${subtitle ? " · " + subtitle : ""}</p>
    </div>

    <!-- 종합 점수 -->
    <div style="background:#fff;border:1px solid #e4e7ef;border-top:none;padding:28px 32px;margin-bottom:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:16px;">
        <div>
          <h2 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#0d1035;">면접 결과 리포트</h2>
          <p style="margin:0;font-size:13px;color:#9ca3af;">${subtitle ?? ""}</p>
        </div>
        <div style="text-align:center;background:#f8f9fc;border:1px solid #e4e7ef;border-radius:14px;padding:16px 24px;">
          <div style="font-size:48px;font-weight:900;color:${overallColor};line-height:1;">${report.overallScore}</div>
          <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;font-weight:500;margin-top:4px;">종합 점수</div>
        </div>
      </div>

      <!-- 세부 점수 -->
      <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.06em;text-transform:uppercase;">세부 점수</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;" cellpadding="0" cellspacing="0">
        <tr>${scoreCardsHtml}</tr>
      </table>

      <!-- 강점 / 보완점 -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:50%;padding:0 8px 0 0;vertical-align:top;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 18px;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#059669;letter-spacing:0.06em;text-transform:uppercase;">나의 강점</p>
              ${strengthsHtml}
            </div>
          </td>
          <td style="width:50%;padding:0 0 0 8px;vertical-align:top;">
            <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;padding:16px 18px;">
              <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#e11d48;letter-spacing:0.06em;text-transform:uppercase;">보완할 점</p>
              ${weaknessesHtml}
            </div>
          </td>
        </tr>
      </table>

      <!-- 적합도 -->
      <div style="background:#f8f9fc;border:1px solid #e4e7ef;border-radius:12px;padding:18px 20px;margin-bottom:24px;">
        <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.06em;text-transform:uppercase;">적합도 평가</p>
        ${fitHtml}
      </div>

      <!-- 주의사항 -->
      ${report.precautions.length > 0 ? `
      <div style="margin-bottom:24px;">
        <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.06em;text-transform:uppercase;">실제 면접 시 주의사항</p>
        ${precautionsHtml}
      </div>` : ""}

      <!-- 질문별 피드백 -->
      <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.06em;text-transform:uppercase;">질문별 상세 피드백</p>
      ${questionsHtml}
    </div>
  `, "AI 면접 결과 리포트")
}

// POST /email/send-results — 면접 Q&A 이메일 발송
router.post("/send-results", async (req: Request, res: Response) => {
  const { email, questions, answers, followupParentLabels, surveys } = req.body as {
    email: string | null
    questions: string[]
    answers: string[]
    followupParentLabels?: Record<string, string>
    surveys?: { label: string; value: string }[]
  }

  // 설문 응답 DB 저장
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
    } catch (e) {
      console.error("[survey] DB 저장 실패:", e instanceof Error ? e.message : e)
    }
  }

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
      html: buildQuestionsHtml(questions ?? [], answers ?? [], followupParentLabels, surveys),
    })
    console.log(`[email] 전송 완료 → ${email}`)
    res.json({ ok: true })
  } catch (e) {
    console.error("[email] 전송 실패:", e instanceof Error ? e.message : e)
    res.status(500).json({ ok: false, message: "이메일 전송 실패" })
  }
})

// POST /email/send-report — 면접 결과 리포트 전체 발송
router.post("/send-report", async (req: Request, res: Response) => {
  const { email, report, subtitle } = req.body as {
    email: string
    subtitle?: string
    report: Parameters<typeof buildReportHtml>[0]
  }

  if (!email || !email.includes("@")) {
    return res.status(400).json({ ok: false, message: "유효한 이메일을 입력해주세요." })
  }
  if (!report) {
    return res.status(400).json({ ok: false, message: "리포트 데이터가 없습니다." })
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(500).json({ ok: false, message: "이메일 서버가 설정되지 않았습니다." })
  }

  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from: `"AI 면접 어시스턴트" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `AI 면접 리포트 — 종합 점수 ${report.overallScore}점`,
      html: buildReportHtml(report, subtitle),
    })
    console.log(`[email] 리포트 전송 완료 → ${email}`)
    res.json({ ok: true })
  } catch (e) {
    console.error("[email] 리포트 전송 실패:", e instanceof Error ? e.message : e)
    res.status(500).json({ ok: false, message: "이메일 전송 실패" })
  }
})

export default router
