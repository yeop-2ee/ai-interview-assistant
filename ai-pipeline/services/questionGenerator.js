//질문 생성
const response = await ollama.chat({
    model: 'ai-interview-assistant',
    messages: [{ role: 'user', content: '이력서 데이터...' }],
    format: 'json'
});