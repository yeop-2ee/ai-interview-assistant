/**
 * recorder.js
 * 프론트엔드에서 녹음된 음성 데이터를 받아 임시 파일로 저장하는 유틸리티
 * 실제 녹음은 브라우저의 MediaRecorder API에서 처리됨
 */

const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '../temp');

// temp 폴더 없으면 생성
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * 녹음 파일을 temp 폴더에 저장
 * @param {Buffer} audioBuffer - 음성 데이터 버퍼
 * @param {string} filename - 저장할 파일명 (확장자 포함)
 * @returns {string} 저장된 파일 경로
 */
function saveAudioToTemp(audioBuffer, filename) {
  const filePath = path.join(TEMP_DIR, filename);
  fs.writeFileSync(filePath, audioBuffer);
  return filePath;
}

/**
 * temp 파일 삭제
 * @param {string} filePath - 삭제할 파일 경로
 */
function deleteTempFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * 고유한 파일명 생성 (타임스탬프 기반)
 * @param {string} extension - 파일 확장자 (예: 'webm', 'mp3')
 * @returns {string}
 */
function generateFilename(extension = 'webm') {
  const timestamp = Date.now();
  return `audio_${timestamp}.${extension}`;
}

module.exports = { saveAudioToTemp, deleteTempFile, generateFilename };
