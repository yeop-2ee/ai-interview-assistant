import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

// ── 모델 설정 ──────────────────────────────────────────────────────────────
// llama: 면접 질문 생성 / 꼬리질문 생성 / 리포트 꼬리질문 추출 (파인튜닝 예정)
// gemma: 이력서·자소서 분석 / 리포트 본문 작성
//
// 파인튜닝 완료 후 .env에서 아래 두 변수만 교체하면 됩니다:
//   LLAMA_MODEL=llama3.1:8b-finetuned
//   LLAMA_SERVER_URL=http://...  (별도 서버라면)

const LLAMA_SERVER_URL = process.env.LLAMA_SERVER_URL || process.env.LLM_SERVER_URL || 'http://localhost:11434';
const LLAMA_MODEL      = process.env.LLAMA_MODEL      || 'gemma3:12b'; // 파인튜닝 완료 후 llama3.1:8b로 교체

const GEMMA_SERVER_URL = process.env.GEMMA_SERVER_URL || process.env.LLM_SERVER_URL || 'http://localhost:11434';
const GEMMA_MODEL      = process.env.GEMMA_MODEL      || 'gemma3:12b';

const llamaClient = new OpenAI({ baseURL: `${LLAMA_SERVER_URL}/v1`, apiKey: 'ollama' });
const gemmaClient = new OpenAI({ baseURL: `${GEMMA_SERVER_URL}/v1`, apiKey: 'ollama' });

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 스타일별 페르소나 (어투·질문 방향에 영향)
const STYLE_PERSONAS = {
  friendly: {
    role: '신입 채용 전담 HR 매니저',
    tone: '부드럽고 편안하게 유도하는',
    desc: '지원자가 긴장하지 않도록 따뜻하고 배려하는 어투로 질문합니다. 지원자의 말을 끊지 않고 충분히 들어주는 성격으로, "~에 대해 편하게 말씀해 주시겠어요?", "~하신 경험이 있으시면 공유해 주세요." 같은 개방형 형식을 선호합니다. 부담스럽지 않은 표현으로 지원자가 자연스럽게 속내를 드러낼 수 있도록 유도합니다.',
  },
  pressure: {
    role: '창업 10년차 회사 대표 겸 투자자 출신 임원',
    tone: '날카롭고 압박적인',
    desc: '지원자의 말 한 마디 한 마디를 검증하며 논리 허점을 파고드는 성격입니다. "그게 정말 본인이 직접 한 건가요?", "왜 그 방법밖에 생각 못 하셨죠?", "그렇게 생각하는 근거가 정확히 무엇입니까?" 같은 직접적이고 도발적인 반론형 어투를 선호합니다. 지원자가 불편함을 느낄 만큼 날카로운 추궁 형식이어도 좋습니다.',
  },
  professor: {
    role: '15년 경력의 시니어 개발자 출신 기술 면접관',
    tone: '개념을 깊게 파고드는 교수형',
    desc: '원리와 배경 이해를 중시하며 학문적·분석적 어투로 질문합니다. "~의 내부 동작 원리를 설명하고, 실무에서 어떤 트레이드오프를 고려하셨는지 논리적으로 전개해 주십시오." 형식을 선호합니다. 표면적 답변에 만족하지 않고 "그래서 그 선택이 왜 최선이라고 생각하십니까?" 처럼 한 단계 더 파고드는 성격입니다.',
  },
  practical: {
    role: '실무 프로젝트를 직접 이끄는 현업 개발팀 팀장',
    tone: '실무 연계 현실적인',
    desc: '이론보다 실제 업무에서 바로 써먹을 수 있는지를 봅니다. "실무에서 ○○ 상황이 생겼을 때 어떻게 대처하시겠습니까?", "우리 팀에 합류하면 첫 달에 어떤 기여를 할 수 있을 것 같으세요?" 같은 시나리오 기반 질문을 선호합니다. 추상적인 답변보다 구체적인 행동과 결과를 원합니다.',
  },
};

const RANDOM_STYLES = ['friendly', 'pressure', 'professor', 'practical'];

function resolveStyle(style) {
  if (style === 'random') {
    return RANDOM_STYLES[Math.floor(Math.random() * RANDOM_STYLES.length)];
  }
  return style;
}

const COMPANY_TYPE_MAP = {
  startup:  '스타트업 (빠른 적응·자기주도·폭넓은 역할 중시)',
  smb:      '중소기업 (실무 즉시 투입·다재다능·실용성 중시)',
  midsize:  '중견기업 (성장성과 안정성 균형·체계적 직무역량 중시)',
  large:    '대기업·그룹사 (직무 전문성·체계·협업 프로세스 중시)',
  public:   '공기업·공공기관 (규정 준수·공익 마인드·윤리의식 중시)',
  foreign:  '외국계 기업 (글로벌 역량·영어 소통·다문화 적응력 중시)',
};

const COMPANY_CONTEXT = {
  startup:  `스타트업 맥락을 질문에 반드시 반영하세요: 인력·시간·예산이 부족한 상황, 혼자 넓은 영역을 담당해야 하는 상황, 완벽한 설계보다 빠른 출시가 우선되는 상황, 기술 부채와 속도 사이의 트레이드오프. 질문에 이런 현실적 압박 상황을 구체적으로 포함하세요.`,
  smb:      `중소기업 맥락을 질문에 반영하세요: 제한된 리소스 안에서 실용적 해결책, 즉시 투입 가능한 실무 역량, 체계보다 실행력이 중요한 환경.`,
  midsize:  `중견기업 맥락을 질문에 반영하세요: 성장 중인 조직에서 체계와 속도의 균형, 기존 레거시와 새 기술 사이의 조율, 확장성을 고려한 설계.`,
  large:    `대기업 맥락을 질문에 반영하세요: 여러 팀·부서 간 협업과 조율, 대규모 트래픽·데이터 처리, 표준화된 프로세스 안에서의 기술 결정.`,
  public:   `공공기관 맥락을 질문에 반영하세요: 규정·보안·안정성 최우선, 민감 데이터 처리, 변경에 신중해야 하는 환경.`,
  foreign:  `외국계 기업 맥락을 질문에 반영하세요: 다국적 팀과의 협업, 글로벌 스탠다드와 로컬 요구사항의 조율, 영어 커뮤니케이션.`,
};

const EXPERIENCE_MAP = {
  newcomer: '신입 (0년차) — 기초 역량·학습 의지·성장 가능성 위주 질문, 깊은 실무 경험 전제 금지',
  junior:   '주니어 (1~3년차) — 실무 경험·문제 해결 방식·기초 설계 역량 위주 질문',
  mid:      '미드레벨 (3~5년차) — 주도적 프로젝트 경험·기술 깊이·팀 협업 방식 위주 질문',
  senior:   '시니어 (5년 이상) — 리더십·아키텍처 설계·기술 의사결정·멘토링 역량 위주 질문',
};

// ── LLM 호출 헬퍼 ─────────────────────────────────────────────────────────

function setupSSE(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  return (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function cleanMarkdownJSON(text) {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
}

function extractJSON(text) {
  const cleaned = text.replace(/<\|.*?\|>/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error(`JSON 객체 없음: ${cleaned.substring(0, 80)}`);
  return JSON.parse(cleaned.slice(start, end + 1));
}

// 스트리밍 원시 호출 (client·model 지정)
async function streamRaw(client, model, prompt, onProgress, estimatedChars = 400, extraOptions = {}) {
  const stream = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    stream: true,
    max_tokens: 4096,
    ...extraOptions,
  });
  let fullContent = '';
  let lastReported = -1;
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    fullContent += delta;
    if (delta) {
      const p = Math.min(Math.floor((fullContent.length / estimatedChars) * 95), 95);
      if (p !== lastReported) {
        lastReported = p;
        onProgress(p);
      }
    }
  }
  return fullContent;
}

// 스트리밍 + JSON 파싱 (client·model 지정)
async function streamMLX(client, model, prompt, onProgress, estimatedChars = 400) {
  const raw = await streamRaw(client, model, prompt, onProgress, estimatedChars);
  try {
    return extractJSON(raw);
  } catch {
    console.error('RAW OUTPUT (파싱 실패):', raw.substring(0, 500));
    throw new Error(`LLM 응답 JSON 파싱 실패: ${raw.substring(0, 100)}`);
  }
}

// 논스트리밍 호출 (client·model 지정)
async function callMLX(client, model, prompt, { allowTextFallback = false } = {}) {
  const result = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: '당신은 JSON 형식으로만 응답합니다. 절대로 JSON 외의 텍스트를 출력하지 마세요.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    stream: false,
    max_tokens: 4096,
  });
  const raw = result.choices[0].message.content;
  try {
    return extractJSON(raw);
  } catch {
    if (allowTextFallback) {
      const cleaned = raw.replace(/<\|.*?\|>/g, '').trim().replace(/^"|"$/g, '');
      if (cleaned.includes('?') && cleaned.length > 5) {
        return { followup: cleaned, needed: 'yes', type: 'shallow' };
      }
    }
    throw new Error(`JSON 파싱 실패: ${raw.substring(0, 80)}`);
  }
}

// ── 프롬프트 빌더 ─────────────────────────────────────────────────────────

function buildBaseContext(department, jobRole, companyType, experienceLevel, style) {
  return {
    persona: STYLE_PERSONAS[style] || STYLE_PERSONAS.friendly,
    level: EXPERIENCE_MAP[experienceLevel] || experienceLevel,
    companyLabel: COMPANY_TYPE_MAP[companyType] || companyType,
    companyContext: COMPANY_CONTEXT[companyType] || '',
  };
}

// 모든 질문 프롬프트에 공통으로 적용되는 출력 규칙
function commonQuestionRules(persona) {
  return (
    `[출력 규칙 — 반드시 준수]\n` +
    `- 반드시 한국어로만 작성. 영어·한자·기타 외국어 절대 금지.\n` +
    `- 각 질문은 한 문장, 물음표(?)로 끝낼 것.\n` +
    `- 질문은 30자 이상 60자 이내로 간결하게.\n` +
    `- 예/아니오로 답할 수 있는 닫힌 질문 절대 금지.\n` +
    `- 지원자가 구체적으로 설명하거나 경험을 말하게 유도하는 개방형 질문.\n` +
    `- 프로젝트명·회사명·서비스명 직접 언급 절대 금지.\n` +
    `- 면접관 스타일(${persona.tone}) 어투 유지.\n`
  );
}

function buildCommonPrompt(department, jobRole, companyType, experienceLevel, style) {
  const { persona, level, companyLabel, companyContext } = buildBaseContext(department, jobRole, companyType, experienceLevel, style);
  const target = jobRole ? `${department} / ${jobRole}` : department;

  let p = `당신은 한국어로만 대답하는 채용 전문 면접관입니다.\n`;
  p += `면접관 역할: ${persona.role}\n`;
  p += `지원자: ${target} | 수준: ${level}\n`;
  p += `회사 유형: ${companyLabel}\n`;
  p += `면접관 성격: ${persona.tone} — ${persona.desc}\n\n`;
  if (companyContext) p += `[회사 맥락] ${companyContext}\n\n`;

  p += `면접 질문 2개를 작성하세요.\n\n`;
  p += `질문 1: 어떤 개발 분야에 관심이 있고 앞으로 어떤 개발자가 되고 싶은지 설명하게 만드는 질문.\n`;
  p += `질문 2: 팀 프로젝트에서 git 브랜치 전략이나 코드 컨벤션을 어떻게 관리했는지 설명하게 만드는 질문.\n\n`;
  p += commonQuestionRules(persona);
  p += `- 반드시 아래 JSON 형식으로만 응답:\n`;
  p += `{"questions":["질문1?","질문2?"]}`;
  return p;
}

function buildJobPrompt(department, jobRole, companyType, experienceLevel, style, interviewType, knowledgeEntries = [], previousQuestions = []) {
  const { persona, level, companyLabel, companyContext } = buildBaseContext(department, jobRole, companyType, experienceLevel, style);
  const target = jobRole ? `${department} 학과 / ${jobRole}` : department;
  const roleLabel = jobRole || department;

  let p = `당신은 한국어로만 대답하는 채용 전문 면접관입니다.\n`;
  p += `면접관 역할: ${persona.role}\n`;
  p += `지원자 정보: ${target}\n`;
  p += `회사 유형: ${companyLabel}\n`;
  p += `지원자 수준: ${level}\n`;
  p += `면접관 성격: ${persona.tone} — ${persona.desc}\n\n`;
  if (previousQuestions.length > 0) {
    p += `[중복 금지] 아래 질문들과 주제가 겹치지 않는 완전히 다른 관점의 질문을 작성하세요:\n`;
    previousQuestions.forEach(q => p += `- ${q}\n`);
    p += `\n`;
  }
  if (knowledgeEntries.length > 0) {
    p += `[${department} 직무 전공지식 참고]\n`;
    knowledgeEntries.slice(0, 10).forEach(e => {
      p += `- [${e.subject}] ${e.content}\n`;
    });
    p += '\n';
  }

  if (interviewType === 'personality') {
    const personalityDepthGuide = experienceLevel === 'newcomer'
      ? '신입이므로: 학교·팀 프로젝트 경험 기반으로 질문하세요. "주도했다", "결정했다" 대신 "의견을 냈다", "제안해봤다" 수준의 경험을 묻는 형식.'
      : experienceLevel === 'junior'
      ? '주니어이므로: 실무에서 실제로 겪은 갈등·압박 경험을 묻되, 팀 내 주도보다 참여·기여 관점에서 질문하세요.'
      : experienceLevel === 'mid'
      ? '미드레벨이므로: 팀 내 기술 결정을 주도하거나 갈등을 조율한 경험, 일정·품질 사이의 트레이드오프 판단 경험을 구체적으로 묻는 형식.'
      : '시니어이므로: 조직 방향 결정, 팀원 설득, 장기적 기술 부채 관리 등 리더십 관점의 인성 경험을 묻는 형식.';

    p += `${roleLabel} 직무 면접 인성 질문 3개를 작성하세요.\n`;
    p += `${personalityDepthGuide}\n\n`;
    p += `질문 1: 팀 의견 충돌이나 갈등 상황에서 어떻게 해결했는지 경험을 말하게 하는 질문.\n`;
    p += `질문 2: 예상치 못한 어려움이나 실패를 어떻게 대처했는지 경험을 말하게 하는 질문.\n`;
    p += `질문 3: 스스로 결정을 내리거나 방향을 바꿨던 경험을 말하게 하는 질문.\n\n`;
    p += commonQuestionRules(persona);
    p += `- 반드시 아래 JSON 형식으로만 응답:\n`;
    p += `{"questions":["질문1?","질문2?","질문3?"]}`;
  } else if (experienceLevel === 'newcomer') {
    // 신입: CS 기초 + 시스템 설계 + 트렌드
    p += `${roleLabel} 분야 신입 지원자 면접 질문 3개를 작성하세요.\n\n`;
    p += `질문 1: ${department} 전공 CS 개념 하나를 골라 그 개념이 무엇이고 어디에 사용되는지 설명하게 만드는 질문. 예시 주제: 스택과 큐의 차이, HTTP 상태코드 종류, 프로세스와 스레드 차이, 인터프리터와 컴파일러 차이, REST API 설계 원칙 중 하나를 선택해 질문할 것.\n`;
    p += `질문 2: 간단한 기능(예: 로그인, 게시글 CRUD, 검색)을 설계한다면 어떤 순서로 접근할지 설명하게 만드는 질문.\n`;
    p += `질문 3: AI 코딩 도구(예: GitHub Copilot, ChatGPT 등)를 개발에 어떻게 활용하는지 또는 앞으로 개발 환경이 어떻게 변할지 의견을 말하게 만드는 질문.\n\n`;
    p += commonQuestionRules(persona);
    p += `- 신입이므로 깊은 실무 경험 전제 금지.\n`;
    p += `- 반드시 아래 JSON 형식으로만 응답:\n`;
    p += `{"questions":["질문1?","질문2?","질문3?"]}`;
  } else {
    let depthGuide = '';
    if (experienceLevel === 'junior') {
      depthGuide = `주니어이므로: 실무에서 실제로 맞닥뜨린 문제, 해결 과정, 기술 선택 이유를 구체적으로 물으세요.`;
    } else if (experienceLevel === 'mid') {
      depthGuide = `미드레벨이므로: 설계 결정 배경, 성능 최적화 과정, 장애 대응, 아키텍처 트레이드오프를 물으세요.`;
    } else {
      depthGuide = `시니어이므로: 시스템 설계 의사결정, 조직 기술 방향 제시, 팀 리딩·멘토링, 복잡한 기술 선택 경험을 물으세요.`;
    }

    p += `${roleLabel} 직무 면접 질문 3개를 작성하세요.\n`;
    p += `${depthGuide}\n\n`;
    p += `질문 1: 핵심 기술 개념을 실무에 어떻게 적용했는지 설명하게 만드는 질문.\n`;
    p += `질문 2: 기술적 문제를 어떻게 해결했는지 경험을 말하게 만드는 질문.\n`;
    p += `질문 3: 두 기술·방식 중 하나를 선택한 이유를 설명하게 만드는 질문.\n\n`;
    p += commonQuestionRules(persona);
    p += `- 반드시 아래 JSON 형식으로만 응답:\n`;
    p += `{"questions":["질문1?","질문2?","질문3?"]}`;
  }
  return p;
}

function buildResumePrompt(department, jobRole, companyType, experienceLevel, style, resumeText, previousQuestions = []) {
  const { persona, level, companyLabel, companyContext } = buildBaseContext(department, jobRole, companyType, experienceLevel, style);
  const target = jobRole ? `${department} / ${jobRole}` : department;

  const depthGuide = experienceLevel === 'newcomer'
    ? '신입이므로: 이력서 경험에서 기술적 판단 이유와 배운 점을 중심으로 질문하세요. 깊은 실무 경험 전제 금지.'
    : experienceLevel === 'junior'
    ? '주니어이므로: 이력서 경험에서 실제 맞닥뜨린 문제와 해결 과정, 기술 선택 이유를 구체적으로 질문하세요.'
    : experienceLevel === 'mid'
    ? '미드레벨이므로: 이력서 경험에서 설계 결정 배경, 성능 최적화, 아키텍처 트레이드오프를 질문하세요.'
    : '시니어이므로: 이력서 경험에서 기술 의사결정 과정, 팀/조직에 미친 영향, 복잡한 문제 해결 방식을 질문하세요.';

  let p = `당신은 한국어로만 대답하는 채용 전문 면접관입니다.\n`;
  p += `면접관 역할: ${persona.role}\n`;
  p += `지원자: ${target} | 수준: ${level}\n`;
  p += `회사 유형: ${companyLabel}\n`;
  p += `면접관 성격: ${persona.tone} — ${persona.desc}\n\n`;
  if (companyContext) p += `[회사 맥락] ${companyContext}\n\n`;
  p += `[지원자 이력서/자소서]\n${resumeText.trim().substring(0, 2000)}\n\n`;
  p += `위 이력서를 읽고, 이 사람에게만 할 수 있는 면접 질문 2개를 작성하세요.\n`;
  p += `${depthGuide}\n`;
  if (previousQuestions.length > 0) {
    p += `[중복 금지] 아래 질문들과 주제가 겹치지 않는 질문을 작성하세요:\n`;
    previousQuestions.forEach(q => p += `- ${q}\n`);
    p += `\n`;
  }
  p += `질문 1: 위 이력서에 실제로 적혀 있는 경험에서 본인이 담당한 역할과 사용한 기술 스택이 무엇인지 묻는 질문. 이력서에 없는 내용 지어내기 금지. 프로젝트명 직접 언급 금지.\n`;
  p += `질문 2: 위 이력서에 실제로 적혀 있는 다른 경험에서 특정 기술을 선택한 이유 또는 구현 중 어려웠던 점을 묻는 질문. 이력서에 없는 내용 지어내기 금지. 프로젝트명 직접 언급 금지.\n\n`;
  p += commonQuestionRules(persona);
  p += `- 이력서와 무관한 일반 질문 금지.\n`;
  p += `- 반드시 아래 JSON 형식으로만 응답:\n`;
  p += `{"questions":["질문1?","질문2?"]}`;
  return p;
}

// ── 리포트용 꼬리질문 추출 (llama 담당) ──────────────────────────────────
// followupSet: 꼬리질문인 질문 텍스트 집합 (해당 행은 스킵)
async function generateReportFollowUps(questions, answers, department, jobRole, followupSet = new Set()) {
  const context = [jobRole, department].filter(Boolean).join(' / ');

  const tasks = questions.map((q, i) => {
    // 꼬리질문 행은 추가 꼬리질문 생성 불필요
    if (followupSet.has(q)) return Promise.resolve([]);

    const answer = (answers[i] || '(답변 없음)').substring(0, 300);
    const prompt =
      `면접 Q&A를 보고 면접관이 실제로 더 물어볼 만한 꼬리질문이 있는지 판단하세요.\n\n` +
      (context ? `직무: ${context}\n` : '') +
      `질문: ${q}\n` +
      `답변: ${answer}\n\n` +
      `[판단 기준]\n` +
      `- 답변에서 구체적인 사례·수치·경험을 언급했고 그것에 대해 더 파고들 만한 내용이 있을 때만 꼬리질문을 작성하세요.\n` +
      `- 답변이 추상적이거나 "(답변 없음)"이거나 이미 충분히 설명된 경우에는 빈 배열을 반환하세요.\n` +
      `- 꼬리질문이 있다면 1~2개, 짧고 날카롭게, 물음표로 끝낼 것.\n` +
      `- 반드시 아래 JSON 형식으로만 응답:\n` +
      `{"followUpQuestions":["꼬리질문1"]} 또는 {"followUpQuestions":[]}`;

    return callMLX(llamaClient, LLAMA_MODEL, prompt)
      .then(r => Array.isArray(r.followUpQuestions) ? r.followUpQuestions.filter(Boolean).slice(0, 2) : [])
      .catch(() => []);
  });

  return Promise.all(tasks);
}

// ── 라우트 ────────────────────────────────────────────────────────────────

// [llama] 면접 질문 생성
app.post('/generate/questions', async (req, res) => {
  const { resumeText, knowledgeEntries = [], department, jobRole, companyType, interviewType } = req.body;
  const experienceLevel = 'newcomer';
  const style = resolveStyle(req.body.style);

  const send = setupSSE(res);

  try {
    let questions = [];
    const hasResume = resumeText && resumeText.trim().length > 0;

    let lastProgress = -1;
    const sendProgress = (progress, step) => {
      if (progress !== lastProgress) {
        lastProgress = progress;
        send({ type: 'progress', progress, step });
      }
    };

    // 패스 1: 공통 2개 (0~25%)
    sendProgress(0, '공통 질문 생성 중...');
    const commonPass = await streamMLX(
      llamaClient, LLAMA_MODEL,
      buildCommonPrompt(department, jobRole, companyType, experienceLevel, style),
      (p) => sendProgress(Math.floor(p * 0.25), '공통 질문 생성 중...'),
      150,
    );
    const commonQs = Array.isArray(commonPass.questions) ? commonPass.questions.slice(0, 2) : [];

    // 질문 필터: 불량 항목 제거 (카테고리 추적과 함께)
    const filterQuestion = (q) => {
      if (typeof q !== 'string') return false;
      const t = q.trim();
      if (t.length < 6 || t.length > 150) return false;
      if (!t.endsWith('?')) return false;
      // 한자(CJK) 또는 베트남어 등 라틴 확장 특수문자 포함 시 제외
      // (영어 tech 용어 git, API, React 등은 허용)
      if (/[\u4E00-\u9FFF\u0100-\u024F\u0300-\u036F]/.test(t)) return false;
      return true;
    };

    let taggedQs = []; // { q, cat } 형태로 카테고리 함께 추적

    if (interviewType === 'resume' || interviewType === 'mixed') {
      // 패스 2: 직무 3개 (25~65%)
      sendProgress(25, '직무 질문 생성 중...');
      const pass2 = await streamMLX(
        llamaClient, LLAMA_MODEL,
        buildJobPrompt(department, jobRole, companyType, experienceLevel, style, interviewType, knowledgeEntries, commonQs),
        (p) => sendProgress(25 + Math.floor(p * 0.40), '직무 질문 생성 중...'),
        220,
      );
      const jobQs = Array.isArray(pass2.questions) ? pass2.questions.slice(0, 3) : [];

      // 패스 3: 이력서 2개 (65~95%)
      let resumeQs = [];
      if (hasResume) {
        sendProgress(65, '이력서 질문 생성 중...');
        const pass3 = await streamMLX(
          llamaClient, LLAMA_MODEL,
          buildResumePrompt(department, jobRole, companyType, experienceLevel, style, resumeText, [...commonQs, ...jobQs]),
          (p) => sendProgress(65 + Math.floor(p * 0.30), '이력서 질문 생성 중...'),
          150,
        );
        resumeQs = Array.isArray(pass3.questions) ? pass3.questions.slice(0, 2) : [];
      }

      taggedQs = [
        ...commonQs.map(q => ({ q: typeof q === 'string' ? q.trim() : q, cat: '공통' })),
        ...jobQs.map(q => ({ q: typeof q === 'string' ? q.trim() : q, cat: '직무' })),
        ...resumeQs.map(q => ({ q: typeof q === 'string' ? q.trim() : q, cat: '이력서' })),
      ];

    } else {
      // 패스 2: 직무/인성 3개 (25~95%)
      sendProgress(25, '직무 질문 생성 중...');
      const pass2 = await streamMLX(
        llamaClient, LLAMA_MODEL,
        buildJobPrompt(department, jobRole, companyType, experienceLevel, style, interviewType, knowledgeEntries, commonQs),
        (p) => sendProgress(25 + Math.floor(p * 0.70), '직무 질문 생성 중...'),
        220,
      );
      const jobQs = Array.isArray(pass2.questions) ? pass2.questions.slice(0, 3) : [];
      const label = interviewType === 'personality' ? '인성' : '전공';
      taggedQs = [
        ...commonQs.map(q => ({ q: typeof q === 'string' ? q.trim() : q, cat: '공통' })),
        ...jobQs.map(q => ({ q: typeof q === 'string' ? q.trim() : q, cat: label })),
      ];
    }

    // 카테고리 추적하며 필터링
    const filteredTagged = taggedQs.filter(({ q }) => filterQuestion(q));

    if (filteredTagged.length === 0) throw new Error('올바른 질문 배열을 생성하지 못했습니다.');

    questions = filteredTagged.map(({ q }) => q);
    const categories = filteredTagged.map(({ cat }) => cat);

    send({ type: 'progress', progress: 100, step: '마무리 중...' });
    send({ type: 'done', questions, categories });
  } catch (error) {
    console.error('질문 생성 오류:', error.message);
    send({ type: 'error', message: error.message });
  }

  res.end();
});

// 꼬리질문 오염 감지
const FOLLOWUP_CONTAMINATION_MARKERS = ['어투 유지', '금지 사항', '절대 금지', '면접관 성격', 'JSON 형식', '반드시 아래', '지시 ---'];

function isContaminated(text) {
  return FOLLOWUP_CONTAMINATION_MARKERS.some(m => text.includes(m));
}

function sanitizeFollowup(text) {
  const qIdx = text.indexOf('?');
  if (qIdx !== -1 && qIdx < text.length - 1) {
    return text.slice(0, qIdx + 1).trim();
  }
  return text.trim();
}

// [llama] 면접 중 꼬리질문 생성
app.post('/generate/followup', async (req, res) => {
  const { question = '', answer = '', department = '', jobRole = '' } = req.body;
  const style = resolveStyle(req.body.style || 'friendly');
  const persona = STYLE_PERSONAS[style] || STYLE_PERSONAS.friendly;

  const context = [jobRole, department].filter(Boolean).join(' / ');
  const followupPrompt =
    `면접관(${persona.role})이 지원자의 답변에 심화 꼬리질문을 합니다. 반드시 한국어로만 답변하세요.\n\n` +
    (context ? `직무: ${context}\n` : '') +
    `질문: ${question}\n` +
    `답변: ${answer}\n\n` +
    `답변에서 언급된 구체적인 내용을 바탕으로 꼬리질문 1개를 작성하세요. 짧고 날카롭게, 물음표로 끝내세요.\n` +
    `{"followup":"꼬리질문"}`;

  try {
    const genResult = await callMLX(llamaClient, LLAMA_MODEL, followupPrompt, { allowTextFallback: true });
    let followup = typeof genResult.followup === 'string' ? genResult.followup : null;
    if (followup) {
      if (isContaminated(followup)) {
        followup = null;
      } else {
        followup = sanitizeFollowup(followup);
        if (followup.length < 5) followup = null;
      }
    }
    res.json({ followup });
  } catch (e) {
    console.error('꼬리질문 생성 오류:', e.message);
    res.json({ followup: null });
  }
});

app.post('/generate/relevance', async (req, res) => {
  res.json({ isRelevant: true, reason: null });
});

// [gemma] 이력서·자소서 분석
app.post('/generate/summary', async (req, res) => {
  console.log('[summary] 요청 수신');
  const { resumeText = '', coverText = '', department = '' } = req.body;

  const combined = [
    resumeText ? `[이력서]\n${resumeText.trim().substring(0, 3000)}` : '',
    coverText  ? `[자기소개서]\n${coverText.trim().substring(0, 2000)}`  : '',
  ].filter(Boolean).join('\n\n');

  if (!combined) {
    return res.status(400).json({ error: '텍스트가 없습니다.' });
  }

  const deptHint = department ? `지원 학과/직무: ${department}\n` : '';
  const prompt = `다음은 지원자의 이력서와 자기소개서입니다.\n${deptHint}\n${combined}\n\n위 내용을 분석하여 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):\n{"name":"이름 또는 미상","oneLiner":"지원자를 한 줄로 요약","skills":["기술1","기술2","기술3"],"experience":"경력 요약 (없으면 신입)","education":"최종학력 요약","projects":["주요 프로젝트1","주요 프로젝트2"],"strengths":["강점1","강점2","강점3"]}`;

  const send = setupSSE(res);

  try {
    const raw = await streamRaw(gemmaClient, GEMMA_MODEL, prompt, (p) => send({ type: 'progress', progress: p }), 600);
    const parsed = JSON.parse(cleanMarkdownJSON(raw));
    send({ type: 'done', data: parsed });
  } catch (error) {
    console.error('요약 생성 오류:', error.message);
    send({ type: 'error', message: error.message });
  }

  res.end();
});

function evalAnswerLength(text = '') {
  const len = text.trim().length;
  if (len < 150) return '짧음';
  if (len > 350) return '긺';
  return '적절';
}

// [gemma] 리포트 본문 생성 → [llama] 꼬리질문 추출 → 병합
app.post('/generate/report', async (req, res) => {
  const { questions = [], answers = [], department = '', interviewType = 'mixed', interviewStyle = '', followupParentLabels = {} } = req.body;
  // 꼬리질문 텍스트 집합 (해당 행은 꼬리질문 생성 스킵)
  const followupSet = new Set(Object.keys(followupParentLabels));

  const send = setupSSE(res);

  const lengthEvals = answers.map(a => evalAnswerLength(a));

  const qaText = questions.map((q, i) => {
    const ans = (answers[i] || '(답변 없음)').substring(0, 250);
    return `Q${i + 1}: ${q}\nA${i + 1}: ${ans}`;
  }).join('\n\n');

  const qCount = questions.length;

  // gemma 프롬프트: followUpQuestions 제외
  const questionFeedbackExample = questions.map((q, i) => {
    return `    {"appropriateness": 45, "improvedAnswer": "Q${i + 1}에 대해 지원자가 실제로 말할 수 있는 개선된 답변을 1인칭으로 2~3문장 작성. '~하면 좋겠다' 같은 설명 금지, 바로 답변 본문만 작성", "comment": "Q${i + 1} 종합 피드백을 한국어로 2문장 이상 구체적으로 작성"}`;
  }).join(',\n');

  const prompt = `당신은 한국어로만 대답하는 채용 면접 전문가입니다. 절대 영어를 사용하지 마세요. 모든 응답은 반드시 한국어로 작성하세요.

아래 면접 Q&A를 분석하여 지원자에게 구체적이고 실질적인 피드백을 한국어로 제공하세요.

직무/학과: ${department || '미지정'}, 면접 유형: ${interviewType}${interviewStyle ? `, 면접관 스타일: ${interviewStyle}` : ''}
${interviewStyle ? `면접관 스타일을 고려해 평가하세요. 예: 압박형 면접에서의 짧은 답변은 긴장·압박 대응력으로, 친화형에서의 짧은 답변은 소극성으로 다르게 평가.` : ''}

[면접 Q&A]
${qaText}

[appropriateness 점수 산정 방법 — 각 Q&A를 아래 체크리스트로 개별 분석]
각 항목을 실제 답변 내용을 근거로 판단하여 점수를 산정하세요. 추측이나 평균치 사용 금지.

체크리스트 (항목별 가중치):
1. 질문의 의도를 정확히 파악하고 답했는가? (핵심 15점)
2. 구체적인 경험·사례·수치·프로젝트가 언급되었는가? (15점)
3. 논리적 흐름(상황→행동→결과 또는 이유→결론)이 있는가? (10점)
4. 답변의 깊이와 완결성이 충분한가? (10점)

점수 구간 (위 체크리스트 결과를 합산):
- 0~25: 답변 없음 또는 질문과 무관한 내용
- 26~40: 질문 이해했으나 내용이 거의 없거나 "잘 모르겠습니다" 수준
- 41~55: 답변은 했으나 추상적·두루뭉술하고 근거·사례 없음 (대부분의 신입)
- 56~70: 내용은 있으나 논리 흐름이 약하거나 구체성이 한 가지 부족
- 71~85: 구체적 경험+논리+결과까지 갖춘 좋은 답변
- 86~100: 탁월한 답변 — 독창적 통찰·수치·검증된 결과까지 포함, 매우 드문 경우

중요: 점수는 반드시 실제 답변 텍스트를 기반으로 산정하세요. 같은 질문이라도 답변 내용에 따라 점수가 달라야 합니다. "(답변 없음)"은 20점 이하. 좋게 봐주기 금지.

응답 형식 (JSON만, 다른 텍스트 없음, 모든 문자열 값은 반드시 한국어):
{
  "overallScore": 45,
  "scores": {"content": 45, "logic": 45, "delivery": 45, "reliability": 45, "likability": 45},
  "strengths": ["강점을 구체적으로 한국어로 작성", "강점2", "강점3"],
  "weaknesses": ["보완점을 구체적으로 한국어로 작성", "보완점2", "보완점3"],
  "precautions": ["실제 면접 시 주의사항을 한국어로 작성", "주의사항2", "주의사항3"],
  "fitScores": {"job": 45, "org": 45, "company": 45},
  "fitComments": {"job": "직무 적합도 코멘트를 한국어로", "org": "조직 적합도 코멘트를 한국어로", "company": "기업 적합도 코멘트를 한국어로"},
  "questionFeedback": [
${questionFeedbackExample}
  ]
}

중요: questionFeedback 배열은 반드시 위 Q&A의 질문 순서대로 정확히 ${qCount}개의 항목을 포함해야 합니다. 모든 점수는 위 체크리스트를 실제 답변에 적용한 0~100 사이 정수입니다.`;

  try {
    // 1단계: gemma로 리포트 본문 생성 (0~75%)
    const ESTIMATED_CHARS = Math.max(2000, qCount * 600);
    const raw = await streamRaw(
      gemmaClient, GEMMA_MODEL,
      prompt,
      (p) => send({ type: 'progress', progress: Math.floor(p * 0.75) }),
      ESTIMATED_CHARS,
      { max_tokens: qCount * 350 + 1000 },
    );

    const parsed = JSON.parse(cleanMarkdownJSON(raw));

    if (!Array.isArray(parsed.questionFeedback)) parsed.questionFeedback = [];
    while (parsed.questionFeedback.length < qCount) {
      parsed.questionFeedback.push({ appropriateness: 0, improvedAnswer: '', comment: '' });
    }

    // 2단계: llama로 꼬리질문 병렬 생성 (75~95%)
    send({ type: 'progress', progress: 75, step: '꼬리질문 생성 중...' });
    const allFollowUps = await generateReportFollowUps(questions, answers, department, req.body.jobRole || '', followupSet);
    send({ type: 'progress', progress: 95 });

    // 3단계: 병합
    parsed.questionFeedback = parsed.questionFeedback.map((fb, i) => ({
      ...fb,
      followUpQuestions: allFollowUps[i] || [],
      lengthEval: lengthEvals[i] ?? '적절',
    }));

    send({ type: 'done', data: parsed });
  } catch (error) {
    console.error('리포트 생성 오류:', error.message);
    send({ type: 'error', message: error.message });
  }

  res.end();
});

app.get('/health', (_, res) => res.json({ ok: true }));

const PORT = Number(process.env.PORT) || 5050;
app.listen(PORT, async () => {
  console.log(`AI pipeline server on port ${PORT}`);
  console.log(`[llama] ${LLAMA_SERVER_URL} | 모델: ${LLAMA_MODEL}`);
  console.log(`[gemma] ${GEMMA_SERVER_URL} | 모델: ${GEMMA_MODEL}`);
  try {
    console.log('LLM 서버 연결 확인 중...');
    await callMLX(gemmaClient, GEMMA_MODEL, '안녕');
    console.log('LLM 서버 연결 완료');
  } catch (e) {
    console.warn(`LLM 서버 연결 실패 (Ollama가 실행 중인지 확인):`, e.message);
  }
});
