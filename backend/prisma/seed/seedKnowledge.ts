// 전공지식(KnowledgeEntry) 시드
//   npm run seed:knowledge            — 데이터가 없는 학과만 채움
//   npm run seed:knowledge -- --reset — 시드에 있는 학과의 기존 데이터를 지우고 다시 채움
import "dotenv/config"
import fs from "fs"
import path from "path"
import prisma from "../../src/lib/prisma"

type SeedEntry = { subject: string; content: string }

async function main() {
  const reset = process.argv.includes("--reset")
  const seed: Record<string, SeedEntry[]> = JSON.parse(
    fs.readFileSync(path.join(__dirname, "knowledge.json"), "utf8"),
  )

  for (const [department, entries] of Object.entries(seed)) {
    const existing = await prisma.knowledgeEntry.count({ where: { department } })
    if (existing > 0 && !reset) {
      console.log(`[건너뜀] ${department}: 이미 ${existing}건 있음 (덮어쓰려면 --reset)`)
      continue
    }

    const [deleted, created] = await prisma.$transaction([
      prisma.knowledgeEntry.deleteMany({ where: { department } }),
      prisma.knowledgeEntry.createMany({
        data: entries.map(e => ({ department, subject: e.subject, content: e.content, registeredBy: "관리자" })),
      }),
    ])
    console.log(`[완료] ${department}: 삭제 ${deleted.count}건 → 삽입 ${created.count}건`)
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
