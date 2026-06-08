import express, { Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import { extractTextFromFile } from "../services/fileTextExtractor";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// POST /upload/resume — 파일에서 텍스트 추출 후 반환 (파일은 즉시 삭제)
router.post("/resume", upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ message: "파일이 없습니다." });
    return;
  }

  try {
    const rawText = await extractTextFromFile(req.file.path, req.file.originalname);
    fs.unlink(req.file.path, () => {});

    // PDF 추출 시 숫자/영문자 사이 공백 제거
    const extractedText = rawText
      .replace(/(\d)\s+(?=\d)/g, "$1")
      .replace(/([A-Za-z])\s+(?=[A-Za-z])/g, "$1");

    if (extractedText.length < 50) {
      res.status(422).json({
        message: "텍스트를 추출할 수 없습니다. 이미지·표 위주의 파일이거나 손상된 파일입니다. PDF 또는 DOCX로 변환 후 업로드해 주세요.",
      });
      return;
    }

    res.status(200).json({
      message: "텍스트 추출 성공",
      originalname: req.file.originalname,
      extractedText,
    });
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(500).json({
      message: "파일 처리 중 오류가 발생했습니다.",
      error: error instanceof Error ? error.message : "알 수 없는 오류",
    });
  }
});

export default router;
