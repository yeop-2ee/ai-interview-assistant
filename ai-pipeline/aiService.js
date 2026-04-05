import express from 'express';
import ollama from 'ollama';

const app = express();
const port = 3000;

// JSON 형태의 데이터를 주고받기 위한 설정
app.use(express.json());

/**
 * 님이 작성하신 AI 실행 로직
 */
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

  // 데이터가 안 들어왔을 경우 예외 처리
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

// 서버 실행
app.listen(port, () => {
  console.log(`
  --------------------------------------------------
  🚀 AI 인터뷰 API 서버가 가동되었습니다!
  📍 엔드포인트: http://localhost:${port}/api/interview
  --------------------------------------------------
  `);
});
