import express from 'express';
import ollama from 'ollama';
import cors from 'cors';

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors()); 

app.get('/api/interview', (req, res) => {
  res.send('AI 서버가 정상 작동 중입니다.');
});

async function generateInterviewQuestions(resumeText) {
  try {
    const response = await ollama.chat({
      model: 'ai-interview-assistant',
      messages: [
        { 
          role: 'user', 
          content: `다음 이력서 내용을 보고 면접 질문 3개만 뽑아줘:\n${resumeText}` 
        }
      ],
    });
    return response.message.content;
  } catch (error) {
    console.error("AI 연결 에러:", error);
    throw error;
  }
}

app.post('/api/interview', async (req, res) => {
  const { resumeText } = req.body;
  if (!resumeText) {
    return res.status(400).json({ error: "이력서 내용(resumeText)을 보내주세요!" });
  }

  try {
    const questions = await generateInterviewQuestions(resumeText);
    res.json({ 
      success: true,
      questions: questions 
    });
    console.log("질문 생성 완료!");
  } catch (error) {
    res.status(500).json({ success: false, error: "AI 서버 내부 오류 발생" });
  }
});

app.listen(port, () => {
  console.log(`🚀 서버 시작: http://localhost:3000`);
});