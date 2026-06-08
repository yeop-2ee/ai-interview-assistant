import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";
import mammoth from "mammoth";

const pdfModule = require("pdf-parse");
const pdfParse = pdfModule.default || pdfModule;

const SOFFICE = process.env.SOFFICE_PATH || "soffice";

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
    const outDir = os.tmpdir();
    // multer 상대경로를 절대경로로 변환 후 확장자 붙여 복사 (LibreOffice는 절대경로 필요)
    const absFilePath = path.resolve(filePath);
    const tmpWithExt = path.join(outDir, `${path.basename(absFilePath)}${ext}`);
    fs.copyFileSync(absFilePath, tmpWithExt);
    // LibreOffice는 입력파일 확장자를 .pdf로 교체해서 저장 (e.g. abc.hwp → abc.pdf)
    const pdfPath = path.join(outDir, `${path.basename(absFilePath)}.pdf`);
    try {
      execSync(`"${SOFFICE}" --headless --convert-to pdf --outdir "${outDir}" "${tmpWithExt}"`, {
        timeout: 60000,
      });
      const buffer = fs.readFileSync(pdfPath);
      const data = await pdfParse(buffer);
      return data.text.trim();
    } finally {
      fs.unlink(tmpWithExt, () => {});
      fs.unlink(pdfPath, () => {});
    }
  }

  throw new Error("PDF, DOCX, HWP 파일만 업로드 가능합니다.");
}