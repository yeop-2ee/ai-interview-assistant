import fs from "fs";
import path from "path";
import mammoth from "mammoth";

const pdfModule = require("pdf-parse");
const pdfParse = pdfModule.default || pdfModule;

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

  throw new Error("PDF 또는 DOCX 파일만 업로드 가능합니다.");
}