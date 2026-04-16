import ollama from 'ollama';

/**
 * 이력서 텍스트를 AI로 분석하여 구조화된 정보 추출
 * @param {string} resumeText 이력서 원문 텍스트
 * @returns {{ techStack: string[], projects: string[], experience: string[], education: string[], rawSummary: string }}
 */
export async function parseResume(resumeText) {
  const prompt = `다음 이력서를 분석하여 아래 JSON 형식으로만 응답하십시오.
이력서에 없는 항목은 빈 배열로 두십시오.

[이력서]
${resumeText}

[출력 형식 - 반드시 JSON만 출력]
{
  "techStack": ["언어/프레임워크/도구 목록"],
  "projects": ["프로젝트명: 핵심 역할 한 줄 요약"],
  "experience": ["회사명/기관: 직책 - 주요 업무 한 줄 요약"],
  "education": ["학교명: 전공 (졸업연도)"],
  "rawSummary": "이 지원자의 전체적인 역량과 특성을 면접관 관점에서 2-3문장으로 요약"
}`;

  try {
    const response = await ollama.chat({
      model: 'ai-interview-assistant',
      format: 'json',
      messages: [{ role: 'user', content: prompt }],
    });

    return JSON.parse(response.message.content);
  } catch (error) {
    console.error('이력서 파싱 에러:', error);
    // AI 파싱 실패 시 텍스트 기반 기본 추출로 fallback
    return fallbackParse(resumeText);
  }
}

/**
 * AI 파싱 실패 시 정규식 기반 기본 추출
 * @param {string} resumeText
 */
function fallbackParse(resumeText) {
  // 흔히 쓰이는 기술 스택 키워드 추출
  const techKeywords = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C', 'C++', 'C#', 'Go', 'Rust', 'Kotlin', 'Swift',
    'React', 'Vue', 'Angular', 'Next.js', 'Nuxt', 'Svelte',
    'Node.js', 'Express', 'NestJS', 'Spring', 'Django', 'FastAPI', 'Flask',
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite',
    'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure',
    'Git', 'GitHub', 'GitLab', 'CI/CD', 'Jenkins',
    'REST', 'GraphQL', 'WebSocket', 'gRPC',
    'TensorFlow', 'PyTorch', 'Pandas', 'Numpy',
    'Linux', 'Nginx', 'Apache',
  ];

  const foundTech = techKeywords.filter(tech =>
    new RegExp(tech, 'i').test(resumeText)
  );

  return {
    techStack: foundTech,
    projects: [],
    experience: [],
    education: [],
    rawSummary: resumeText.slice(0, 300),
  };
}
