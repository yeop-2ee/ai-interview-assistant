import express, { Request, Response } from "express";
import multer from "multer";
import path from "path";
import { extractTextFromFile } from "../services/fileTextExtractor";
import { analyzeResumeText } from "../services/analyzeResume";

const router = express.Router();

const allowedExtensions = [".pdf", ".docx"];

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("PDF와 DOCX 파일만 업로드할 수 있습니다."));
    }
  },
});

router.post("/resume", (req: Request, res: Response) => {
  upload.single("file")(req, res, async (err) => {
    try {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            message: "파일 크기는 10MB를 초과할 수 없습니다.",
          });
        }

        return res.status(400).json({
          message: "파일 업로드 중 오류가 발생했습니다.",
          error: err.message,
        });
      }

      if (err) {
        return res.status(400).json({
          message: err.message || "지원하지 않는 파일 형식입니다.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "파일이 없습니다.",
        });
      }

      const extractedText = await extractTextFromFile(req.file.path, req.file.originalname);
      const analysisResult = await analyzeResumeText(extractedText);

      return res.status(200).json({
        message: "파일 업로드, 텍스트 추출, 분석 성공",
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        extractedText,
        analysisResult,
      });
    } catch (error) {
      console.error("파일 처리 오류:", error);

      return res.status(500).json({
        message: "파일 처리 중 오류가 발생했습니다.",
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      });
    }
  });
});

export default router;