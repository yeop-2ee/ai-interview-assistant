import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import mammoth from "mammoth";

const pdfModule = require("pdf-parse");
const pdfParse = pdfModule.default || pdfModule;

// pyhwp hwp5txt 경로: pip3 user install 기본 위치
const HWP5TXT = process.env.HWP5TXT_PATH || "hwp5txt";

export async function extractTextFromFile(
  filePath: string,
  originalName: string
): Promise<string> {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === ".pdf") {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text.trim();
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value.trim();
  }

  if (ext === ".hwp" || ext === ".hwpx") {
    // multer가 확장자 없이 저장하므로 hwp5txt 인식을 위해 확장자 붙여 복사
    const tmpWithExt = `${filePath}${ext}`;
    fs.copyFileSync(filePath, tmpWithExt);
    try {
      const text = execSync(`"${HWP5TXT}" "${tmpWithExt}"`, { timeout: 30000 }).toString();
      return text.trim();
    } finally {
      fs.unlink(tmpWithExt, () => {});
    }
  }

  throw new Error("PDF, DOCX, HWP 파일만 업로드 가능합니다.");
}