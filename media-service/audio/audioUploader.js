const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const path = require('path');
const { saveAudioToTemp, deleteTempFile, generateFilename } = require('./recorder');

const router = express.Router();

// S3 설정
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// multer: 메모리에 임시 저장
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/audio/upload
 * 프론트에서 녹음한 음성 파일을 S3에 업로드
 * Body: multipart/form-data { audio: File, sessionId: string }
 */
router.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: '음성 파일이 없습니다.' });
    }

    const extension = req.file.originalname.split('.').pop() || 'webm';
    const filename = generateFilename(extension);

    // S3 업로드
    const s3Key = `audio/${sessionId}/${filename}`;
    await s3.putObject({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }).promise();

    // temp 파일 저장 (Whisper STT용)
    const tempPath = saveAudioToTemp(req.file.buffer, filename);

    res.json({
      success: true,
      s3Key,
      tempPath,
      filename,
    });
  } catch (error) {
    console.error('음성 업로드 실패:', error);
    res.status(500).json({ error: '음성 업로드에 실패했습니다.' });
  }
});

module.exports = router;
