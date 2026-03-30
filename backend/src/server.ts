import express from "express"
import cors from "cors"
import interviewRoutes from "./routes/interviewRoutes"
import uploadRoutes from "./routes/uploadRoutes"

const app = express()

app.use(cors())
app.use(express.json())

app.use("/interview", interviewRoutes)
app.use("/upload", uploadRoutes)

const PORT = 3001

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})