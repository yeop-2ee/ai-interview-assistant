require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// 라우터
const sttRouter = require('./stt/sttService');
const ttsRouter = require('./tts/ttsService');
const faceRouter = require('./face/faceService');
const wav2lipRouter = require('./wav2lip/wav2lipService');

app.use('/api/stt', sttRouter);
app.use('/api/tts', ttsRouter);
app.use('/api/face', faceRouter);
app.use('/api/wav2lip', wav2lipRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'media-service' });
});

app.listen(PORT, () => {
  console.log(`Media Service running on port ${PORT}`);
});
