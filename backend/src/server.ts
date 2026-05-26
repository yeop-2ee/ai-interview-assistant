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
import emailRoutes from "./routes/emailRoutes"
import adminRoutes from "./routes/adminRoutes"

async function ensureDatabase() {
  console.log("[DB] 마이그레이션 실행 중...")
  execSync("npx prisma migrate deploy", { stdio: "inherit", cwd: __dirname + "/.." })
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
app.use("/email", emailRoutes)
app.use("/admin", adminRoutes)

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