import "dotenv/config"
import express from "express"
import cors from "cors"
import { execSync } from "child_process"
import { Client } from "pg"
import interviewRoutes from "./routes/interviewRoutes"
import uploadRoutes from "./routes/uploadRoutes"
import authRoutes from "./routes/authRoutes"
import reportRoutes from "./routes/reportRoutes"
import knowledgeRoutes from "./routes/knowledgeRoutes"
import aiRoutes from "./routes/aiRoutes"

async function ensureDatabase() {
  const dbUrl = new URL(process.env.DATABASE_URL!)
  const dbName = dbUrl.pathname.slice(1).split("?")[0]

  // postgres 기본 DB에 접속해서 대상 DB 존재 여부 확인
  const adminUrl = new URL(process.env.DATABASE_URL!)
  adminUrl.pathname = "/postgres"
  adminUrl.search = ""

  const client = new Client({ connectionString: adminUrl.toString() })
  await client.connect()

  const { rows } = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [dbName]
  )

  if (rows.length === 0) {
    console.log(`[DB] "${dbName}" 데이터베이스가 없습니다. 생성 중...`)
    await client.query(`CREATE DATABASE "${dbName}"`)
    console.log(`[DB] "${dbName}" 생성 완료`)
  }

  await client.end()

  console.log("[DB] 마이그레이션 실행 중...")
  execSync("npx prisma migrate deploy", { stdio: "inherit" })
  console.log("[DB] 마이그레이션 완료")
}

const app = express()

app.use(cors())
app.use(express.json())

app.use("/auth", authRoutes)
app.use("/reports", reportRoutes)
app.use("/knowledge", knowledgeRoutes)
app.use("/interview", interviewRoutes)
app.use("/upload", uploadRoutes)
app.use("/ai", aiRoutes)

app.get("/", (_, res) => res.json({ ok: true }))

const PORT = Number(process.env.PORT) || 3001

ensureDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error("[DB] 초기화 실패:", err)
    process.exit(1)
  })