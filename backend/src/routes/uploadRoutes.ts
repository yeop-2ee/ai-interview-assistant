import express, { Request, Response } from "express";
import multer from "multer";
import { extractTextFromFile } from "../services/fileTextExtractor";

const router = express.Router();

const upload = multer({
  dest: "uploads/",
});

router.post("/resume", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "파일이 없습니다.",
      });
    }

    const extractedText = await extractTextFromFile(req.file.path, req.file.originalname);

    return res.status(200).json({
      message: "파일 업로드 및 텍스트 추출 성공",
      originalname: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      extractedText,
    });
  } catch (error) {
    console.error("파일 처리 오류:", error);

    return res.status(500).json({
      message: "파일 처리 중 오류가 발생했습니다.",
      error: error instanceof Error ? error.message : "알 수 없는 오류",
    });
  }
});

export default router;