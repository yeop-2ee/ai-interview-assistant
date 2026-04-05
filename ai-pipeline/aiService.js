//AI 실행기능 서버
import ollama from 'ollama';

async function generateInterviewQuestions(resumeText) {
  try {
    const response = await ollama.chat({
      model: 'ai-interview-assistant', // 아까 'ollama create'할 때 정한 이름!
      messages: [
        { 
          role: 'user', 
          content: `다음 이력서 내용을 보고 면접 질문 3개만 뽑아줘:\n${resumeText}` 
        }
      ],
    });

    console.log("AI의 질문:", response.message.content);
    return response.message.content;
  } catch (error) {
    console.error("AI 연결 에러:", error);
  }
}

// 테스트용 실행
generateInterviewQuestions("신입 개발자 홍길동, React와 Node.js 숙련.");