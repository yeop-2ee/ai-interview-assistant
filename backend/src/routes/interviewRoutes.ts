import express from "express"

const router = express.Router()

router.post("/start", (req, res) => {
  res.json({
    message: "Interview started"
  })
})

export default router