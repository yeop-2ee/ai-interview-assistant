import "dotenv/config"
import express from "express"
import cors from "cors"
import interviewRoutes from "./routes/interviewRoutes"
import uploadRoutes from "./routes/uploadRoutes"
import authRoutes from "./routes/authRoutes"
import reportRoutes from "./routes/reportRoutes"
import knowledgeRoutes from "./routes/knowledgeRoutes"
import aiRoutes from "./routes/aiRoutes"
import emailRoutes from "./routes/emailRoutes"
import adminRoutes from "./routes/adminRoutes"

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})