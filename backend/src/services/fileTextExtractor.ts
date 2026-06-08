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
    const pdfPath = path.join(outDir, `${path.basename(absFilePath)}.pdf`);
    const profileDir = path.join(outDir, `lo_profile_${process.pid}_${Date.now()}`);
    const cmd = `"${SOFFICE}" --headless --norestore -env:UserInstallation=file://${profileDir} --convert-to pdf --outdir "${outDir}" "${tmpWithExt}"`;
    console.log("[HWP] absFilePath:", absFilePath, "exists:", fs.existsSync(absFilePath));
    console.log("[HWP] tmpWithExt:", tmpWithExt, "exists:", fs.existsSync(tmpWithExt));
    console.log("[HWP] cmd:", cmd);
    try {
      const output = execSync(cmd, { timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'] });
      console.log("[HWP] soffice output:", output?.toString());
      console.log("[HWP] pdfPath exists:", fs.existsSync(pdfPath));
      const buffer = fs.readFileSync(pdfPath);
      const data = await pdfParse(buffer);
      return data.text.trim();
    } finally {
      fs.unlink(tmpWithExt, () => {});
      fs.unlink(pdfPath, () => {});
      fs.rm(profileDir, { recursive: true, force: true }, () => {});
    }
  }

  throw new Error("PDF, DOCX, HWP 파일만 업로드 가능합니다.");
}