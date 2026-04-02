require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 라우터
const sttRouter = require('./stt/whisperService');
const avatarRouter = require('./avatar/didService');
const audioRouter = require('./audio/audioUploader');
const ttsRouter = require('./tts/ttsService');
const faceRouter = require('./face/faceService');

app.use('/api/stt', sttRouter);
app.use('/api/avatar', avatarRouter);
app.use('/api/audio', audioRouter);
app.use('/api/tts', ttsRouter);
app.use('/api/face', faceRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'media-service' });
});

app.listen(PORT, () => {
  console.log(`Media Service running on port ${PORT}`);
});
