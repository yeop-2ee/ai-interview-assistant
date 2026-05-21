import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const DEFAULT_LLM_URL = 'http://localhost:11434';
const DEFAULT_LLM_MODEL = 'gemma3:12b';

const MLX_SERVER_URL = process.env.LLM_SERVER_URL || process.env.MLX_SERVER_URL || DEFAULT_LLM_URL;
const MLX_MODEL = process.env.LLM_MODEL || process.env.MLX_MODEL || DEFAULT_LLM_MODEL;

const client = new OpenAI({
  baseURL: `${MLX_SERVER_URL}/v1`,
  apiKey: 'ollama',
});

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

// 회사 유형별 면접 맥락 — 질문에 반드시 녹여야 할 현실적 상황
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

async function streamRaw(prompt, onProgress, estimatedChars = 400, extraOptions = {}) {
  const stream = await client.chat.completions.create({
    model: MLX_MODEL,
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

async function streamMLX(prompt, onProgress, estimatedChars = 400) {
  const raw = await streamRaw(prompt, onProgress, estimatedChars);
  try {
    return extractJSON(raw);
  } catch {
    throw new Error(`LLM 응답 JSON 파싱 실패: ${raw.substring(0, 100)}`);
  }
}

function extractJSON(text) {
  // special token 제거
  const cleaned = text.replace(/<\|.*?\|>/g, '').trim();
  // 첫 번째 완전한 JSON 객체만 추출 (뒤에 붙는 텍스트 무시)
  const match = cleaned.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error(`JSON 객체 없음: ${cleaned.substring(0, 80)}`);
  return JSON.parse(match[0]);
}

async function callMLX(prompt, { allowTextFallback = false } = {}) {
  const result = await client.chat.completions.create({
    model: MLX_MODEL,
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
      // 꼬리질문 전용 — 모델이 JSON 없이 질문 텍스트로 응답한 경우
      const cleaned = raw.replace(/<\|.*?\|>/g, '').trim().replace(/^"|"$/g, '');
      if (cleaned.includes('?') && cleaned.length > 5) {
        return { followup: cleaned, needed: 'yes', type: 'shallow' };
      }
    }
    throw new Error(`JSON 파싱 실패: ${raw.substring(0, 80)}`);
  }
}

// ── 공통 2개: 세션마다 LLM으로 생성 (스타일 반영) ───────────────────
function buildBaseContext(department, jobRole, companyType, experienceLevel, style) {
  return {
    persona: STYLE_PERSONAS[style] || STYLE_PERSONAS.friendly,
    level: EXPERIENCE_MAP[experienceLevel] || experienceLevel,
    companyLabel: COMPANY_TYPE_MAP[companyType] || companyType,
    companyContext: COMPANY_CONTEXT[companyType] || '',
  };
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

  p += `아래 2개의 면접 질문을 생성하세요. 두 질문은 서로 다른 주제를 다뤄야 합니다.\n\n`;

  p += `질문 1 — [지원 동기 & 기여 계획]\n`;
  p += `"왜 지원했나요?"처럼 진부한 질문 금지.\n`;
  p += `이 회사의 특성(${companyLabel})과 연결해서,`;
  p += ` 지원자가 이 환경에서 구체적으로 어떤 문제를 풀고 싶은지, 본인의 어떤 강점을 발휘할 수 있는지를 끌어내세요.\n`;
  p += `신입이면 성장 방향과 학습 의지, 주니어 이상이면 실무 경험과 연결한 기여 계획을 구체적으로 묻는 형식.\n\n`;

  p += `질문 2 — [실패·압박·갈등 경험]\n`;
  p += `"약점이 뭔가요" 같은 템플릿 금지. 구체적인 어려운 상황(기술적 판단 실수, 일정 압박, 의견 충돌 등)을 설정하고,`;
  p += ` 그 상황에서 어떻게 대응했고 무엇을 배웠는지를 끌어내는 질문.\n`;
  if (companyContext) p += `위에서 제시한 [회사 맥락]의 현실적 압박 상황을 질문 안에 구체적으로 반영하세요.\n`;
  p += `\n`;

  p += `[작성 규칙]\n`;
  p += `- 각 질문은 하나의 완결된 문장, 물음표(?)는 문장 끝에 하나만.\n`;
  p += `- "어떻게 생각하시나요"처럼 막연한 표현 금지 — 상황을 먼저 제시하고 그 상황에서의 경험·판단을 묻는 형식.\n`;
  p += `- 어미: "~셨나요?", "~있으신가요?", "~하셨습니까?", "~말씀해 주시겠어요?" 등 자연스러운 존댓말. "~이에요?", "~어떤가요?" 금지.\n`;
  p += `- 면접관 스타일(${persona.tone}) 어투 유지.\n`;
  p += `- 반드시 아래 JSON 형식으로만 응답:\n`;
  p += `{"questions":["공통질문1","공통질문2"]}`;
  return p;
}

// ── 직무/인성 3개 (이력서 없이) ───────────────────────────────────────
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

    p += `${roleLabel} 직무 면접에서 지원자의 실제 업무 태도와 협업 방식을 검증하는 인성 질문 3개를 작성하세요.\n`;
    if (companyContext) p += `[회사 맥락] ${companyContext}\n`;
    p += `${personalityDepthGuide}\n\n`;
    p += `질문 1 — 기술적 의견 충돌 또는 우선순위 갈등 상황: 어떻게 설득하고 조율했는지 구체적 경험을 묻는 질문.\n`;
    p += `질문 2 — 예상치 못한 장애·일정 압박·리소스 부족 상황: 실제로 어떻게 대응했는지 묻는 질문.`;
    if (companyContext) p += ` 위에서 제시한 [회사 맥락]의 현실적 압박 상황을 질문 안에 반영하세요.`;
    p += `\n`;
    p += `질문 3 — 본인이 기술적 결정을 주도했거나 방향을 바꾼 경험: 그 판단 근거와 결과를 묻는 질문.\n\n`;
    p += `작성 규칙:\n`;
    p += `- 각 질문은 하나의 완결된 문장, 물음표(?)는 끝에 하나만.\n`;
    p += `- 추상적 질문 금지 — 반드시 구체적인 상황을 먼저 설정하고 그 상황에서의 대응을 묻는 형식.\n`;
    p += `- 어미: "~셨나요?", "~있으신가요?", "~하셨습니까?" 등 자연스러운 존댓말. "~이에요?", "~어떤가요?" 금지.\n`;
    p += `- 면접관 성격(${persona.tone}) 어투 유지.\n`;
    p += `- 반드시 아래 JSON 형식으로만 응답:\n`;
    p += `{"questions":["인성질문1","인성질문2","인성질문3"]}`;
  } else {
    let depthGuide = '';
    if (experienceLevel === 'newcomer') {
      depthGuide = `신입이므로: 개념을 실제 상황에 어떻게 적용할지, 선택의 이유와 트레이드오프를 물으세요. 깊은 실무 경험 전제 금지.`;
    } else if (experienceLevel === 'junior') {
      depthGuide = `주니어이므로: 실무에서 실제로 맞닥뜨린 문제, 해결 과정, 기술 선택 이유를 구체적으로 물으세요.`;
    } else if (experienceLevel === 'mid') {
      depthGuide = `미드레벨이므로: 설계 결정 배경, 성능 최적화 과정, 장애 대응, 아키텍처 트레이드오프를 물으세요.`;
    } else {
      depthGuide = `시니어이므로: 시스템 설계 의사결정, 조직 기술 방향 제시, 팀 리딩·멘토링, 복잡한 기술 선택 경험을 물으세요.`;
    }

    p += `${roleLabel} 직무의 핵심 기술 역량을 검증하는 면접 질문 3개를 작성하세요.\n`;
    if (companyContext) p += `[회사 맥락] ${companyContext}\n`;
    p += `\n`;
    p += `${depthGuide}\n\n`;
    p += `질문 1 — 핵심 개념 실무 적용: "~란 무엇입니까" 금지. 실제 사용할 때 어떤 판단을 했는지, 어떤 문제가 생겼는지를 묻는 상황 기반 질문.\n`;
    p += `질문 2 — 기술적 문제 상황 대응: ${roleLabel}에서 실제로 발생하는 구체적 문제 상황(성능 저하, 데이터 불일치, 장애 등)을 제시하고 어떻게 접근했는지 판단력을 검증.\n`;
    p += `질문 3 — 트레이드오프 판단: 두 기술·설계 방식 중 하나를 선택해야 하는 상황을 제시하고, 어떤 기준으로 결정하겠는지 사고 과정을 보는 질문. 정답 없는 열린 질문.\n`;
    if (companyContext) p += `위에서 제시한 [회사 맥락]의 현실적 압박 상황을 질문 2 또는 3에 구체적으로 반영하세요.\n`;
    p += `\n`;
    p += `작성 규칙:\n`;
    p += `- 각 질문은 하나의 완결된 문장, 물음표(?)는 끝에 하나만.\n`;
    p += `- 추상적 질문 금지 — 상황을 먼저 제시하고 그 상황에서의 판단·경험을 묻는 형식.\n`;
    p += `- 어미: "~셨나요?", "~있으신가요?", "~하시겠습니까?", "~하셨습니까?" 등 자연스러운 존댓말. "~이에요?", "~어떤가요?" 금지.\n`;
    p += `- 면접관 성격(${persona.tone}) 어투 유지.\n`;
    p += `- 반드시 아래 JSON 형식으로만 응답:\n`;
    p += `{"questions":["직무질문1","직무질문2","직무질문3"]}`;
  }
  return p;
}

// ── 이력서 2개 (resume/mixed 전용) ──────────────────────────────────
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
  p += `위 이력서를 꼼꼼히 읽고, 이 사람에게만 할 수 있는 질문 2개를 작성하세요.\n`;
  p += `${depthGuide}\n`;
  if (previousQuestions.length > 0) {
    p += `[중복 금지] 아래 질문들과 주제가 겹치지 않는 완전히 다른 관점의 질문을 작성하세요:\n`;
    previousQuestions.forEach(q => p += `- ${q}\n`);
    p += `\n`;
  }
  p += `⚠️ 일반 기술 질문 절대 금지 (예: "REST란?", "협업 어떻게 하나요?" 등)\n`;
  p += `⚠️ 두 질문은 반드시 이력서의 서로 다른 경험 항목을 기반으로 해야 합니다. 같은 프로젝트·기술을 두 번 다루면 안 됩니다.\n\n`;

  p += `질문 1 — 이력서에서 가장 기술적으로 복잡했던 경험을 하나 골라:\n`;
  p += `그 경험에서 내린 기술적 판단(왜 그 방법을 썼는지, 어떤 트레이드오프가 있었는지)을 구체적으로 끌어내는 질문.\n\n`;

  p += `질문 2 — 질문 1과 완전히 다른 경험 항목(다른 기술·다른 프로젝트 영역)에서:\n`;
  p += `그 경험에서 아쉬웠던 점, 또는 지금 다시 한다면 어떻게 다르게 할지를 끌어내는 질문.\n\n`;

  p += `작성 규칙:\n`;
  p += `- 각 질문은 하나의 완결된 문장, 물음표(?)는 끝에 하나만.\n`;
  p += `- 이력서의 구체적인 기술·상황을 질문 안에 녹이세요 (이 사람만 받을 수 있는 질문).\n`;
  p += `- 특정 프로젝트명·회사명 언급 금지. 기술 내용과 상황으로 묘사.\n`;
  p += `- 어미: "~셨나요?", "~있으신가요?", "~하셨습니까?", "~말씀해 주시겠어요?" 등 자연스러운 존댓말. "~이에요?", "~어떤가요?" 금지.\n`;
  p += `- 면접관 성격(${persona.tone}) 어투 유지.\n`;
  p += `- 반드시 아래 JSON 형식으로만 응답:\n`;
  p += `{"questions":["이력서질문1","이력서질문2"]}`;
  return p;
}

app.post('/generate/questions', async (req, res) => {
  const { resumeText, knowledgeEntries = [], department, jobRole, companyType, experienceLevel, interviewType } = req.body;
  const style = resolveStyle(req.body.style);

  const send = setupSSE(res);

  try {
    let questions = [];
    const hasResume = resumeText && resumeText.trim().length > 0;

    // 진행률 중복 전송 방지 래퍼
    let lastProgress = -1;
    const sendProgress = (progress, step) => {
      if (progress !== lastProgress) {
        lastProgress = progress;
        send({ type: 'progress', progress, step });
      }
    };

    // ── 패스 1 (공통): 모든 유형 공통 2개 (0~25%) ─────────────
    sendProgress(0, '공통 질문 생성 중...');
    const commonPass = await streamMLX(
      buildCommonPrompt(department, jobRole, companyType, experienceLevel, style),
      (p) => sendProgress(Math.floor(p * 0.25), '공통 질문 생성 중...'),
      150, // 공통 2개: ~150자
    );
    const commonQs = Array.isArray(commonPass.questions) ? commonPass.questions.slice(0, 2) : [];

    if (interviewType === 'resume' || interviewType === 'mixed') {
      // ── 패스 2: 직무 3개 (25~65%) ───────────────────────────
      sendProgress(25, '직무 질문 생성 중...');
      const pass2 = await streamMLX(
        buildJobPrompt(department, jobRole, companyType, experienceLevel, style, interviewType, knowledgeEntries, commonQs),
        (p) => sendProgress(25 + Math.floor(p * 0.40), '직무 질문 생성 중...'),
        220, // 직무 3개: ~220자
      );
      const jobQs = Array.isArray(pass2.questions) ? pass2.questions.slice(0, 3) : [];

      // ── 패스 3: 이력서 2개 (65~95%) — 이력서 없으면 스킵 ────
      let resumeQs = [];
      if (hasResume) {
        sendProgress(65, '이력서 질문 생성 중...');
        const pass3 = await streamMLX(
          buildResumePrompt(department, jobRole, companyType, experienceLevel, style, resumeText, [...commonQs, ...jobQs]),
          (p) => sendProgress(65 + Math.floor(p * 0.30), '이력서 질문 생성 중...'),
          150, // 이력서 2개: ~150자
        );
        resumeQs = Array.isArray(pass3.questions) ? pass3.questions.slice(0, 2) : [];
      }

      questions = [...commonQs, ...jobQs, ...resumeQs];

    } else {
      // ── 패스 2: 직무/인성 3개 (25~95%) ─────────────────────
      sendProgress(25, '직무 질문 생성 중...');
      const pass2 = await streamMLX(
        buildJobPrompt(department, jobRole, companyType, experienceLevel, style, interviewType, knowledgeEntries, commonQs),
        (p) => sendProgress(25 + Math.floor(p * 0.70), '직무 질문 생성 중...'),
        220, // 직무 3개: ~220자
      );
      const jobQs = Array.isArray(pass2.questions) ? pass2.questions.slice(0, 3) : [];

      questions = [...commonQs, ...jobQs];
    }

    if (questions.length === 0) throw new Error('올바른 질문 배열을 생성하지 못했습니다.');

    let categories;
    if (interviewType === 'resume' || interviewType === 'mixed') {
      const commonCount = Math.min(2, questions.length);
      const jobCount = Math.min(3, questions.length - commonCount);
      const resumeCount = questions.length - commonCount - jobCount;
      categories = [
        ...Array(commonCount).fill('공통'),
        ...Array(jobCount).fill('직무'),
        ...Array(resumeCount).fill('이력서'),
      ];
    } else {
      const commonCount = Math.min(2, questions.length);
      const jobCount = questions.length - commonCount;
      const label = interviewType === 'personality' ? '인성' : '전공';
      categories = [
        ...Array(commonCount).fill('공통'),
        ...Array(jobCount).fill(label),
      ];
    }

    send({ type: 'progress', progress: 100, step: '마무리 중...' });
    send({ type: 'done', questions, categories });
  } catch (error) {
    console.error('질문 생성 오류:', error.message);
    send({ type: 'error', message: error.message });
  }

  res.end();
});

// ── 꼬리질문 생성 ──────────────────────────────────────────────────────
app.post('/generate/followup', async (req, res) => {
  const { question = '', answer = '', department = '', jobRole = '', companyType = '', experienceLevel = '' } = req.body;
  const style = resolveStyle(req.body.style || 'friendly');
  const persona = STYLE_PERSONAS[style] || STYLE_PERSONAS.friendly;

  // 단일 프롬프트: 동문서답 처리 + 심화 꼬리질문 통합
  // 핵심 철학: 답변의 "부족함"이 아닌 "확장 가능성"에서 꼬리질문 생성
  const context = [jobRole, department].filter(Boolean).join(' / ');
  const followupPrompt =
    `당신은 ${persona.role} 역할의 채용 전문 면접관입니다. 한국어로만 답변하세요.\n` +
    `면접관 성격: ${persona.tone} — ${persona.desc}\n` +
    (context ? `직무 맥락: ${context}\n` : '') +
    `\n` +
    `[면접 질문]\n${question}\n\n` +
    `[지원자 답변]\n${answer}\n\n` +
    `--- 지시 ---\n` +
    `경우 A. 답변이 질문과 완전히 무관한 경우 (면접 무관 일상 얘기 등):\n` +
    `  → 답변에서 언급된 내용을 짧게 인용하고, 원래 질문의 핵심 주제로 다시 안내하는 확인 질문을 작성하세요.\n\n` +
    `경우 B. 답변이 질문과 관련 있는 경우 (상세하거나 짧거나 무관하게):\n` +
    `  → 답변에서 실제로 언급된 특정 기술명·방법·경험을 기반으로, 아래 중 가장 날카로운 방향의 심화 질문을 작성하세요.\n` +
    `  → 방향 선택 기준 (우선순위 순):\n` +
    `     1순위: 답변에서 언급한 방법의 한계 또는 더 어려운 환경(분산, 고트래픽, 장애)에서의 적용 가능성 도전\n` +
    `     2순위: 답변에서 선택하지 않은 대안 기술과의 트레이드오프 질문\n` +
    `     3순위: 답변에서 언급된 경험의 실패 시나리오 또는 개선점 질문\n\n` +
    `⚠️ 절대 금지 사항:\n` +
    `  - 경우 B에서 "방금 ~라고 말씀하셨는데" 같은 prefix 사용 금지\n` +
    `  - 답변 원문을 질문 안에 그대로 길게 반복하는 것 금지\n` +
    `  - "~을 말씀해 주십시오", "~을 설명해 주십시오" 같은 지시문 형태 금지 — 반드시 의문문으로 작성\n` +
    `  - 답변에 없는 기술·개념을 임의로 질문에 추가 금지\n` +
    `⚠️ 꼬리질문은 1~2문장 이내로 간결하게. 물음표(?)는 끝에 하나만.\n` +
    `⚠️ 어미: "~하시겠습니까?", "~있으신가요?", "~셨나요?", "~않으신가요?" 등 자연스러운 한국어 의문형.\n\n` +
    `반드시 아래 JSON 형식으로만 응답:\n{"followup":"꼬리질문"}`;

  try {
    const genResult = await callMLX(followupPrompt, { allowTextFallback: true });
    const followup = typeof genResult.followup === 'string' && genResult.followup.length > 5
      ? genResult.followup
      : null;
    res.json({ followup });
  } catch (e) {
    console.error('꼬리질문 생성 오류:', e.message);
    res.json({ followup: null });
  }
});

// 학과 그룹
const DEPT_GROUPS = {
  IT: ['컴퓨터소프트웨어과','게임콘텐츠과','정보통신과','전자공학과'],
  전기건설: ['전기과','건축과','실내건축과'],
  디자인미디어: ['시각디자인과','웹툰만화콘텐츠과','영상콘텐츠과','패션디자인비즈니스과'],
  뷰티: ['뷰티스타일리스트과'],
  엔터: ['K-POP과'],
  경영유통: ['경영학과','세무회계과','유통물류과'],
  호텔조리관광: ['호텔외식조리과','관광과','항공서비스과'],
  보건의료: ['보건의료행정과','식품영양학과','반려동물보건과','스포츠재활과','유아특수재활과'],
  사회복지교육: ['사회복지과','사회복지경영과','유아교육과'],
  군경: ['군사학과','경찰경호보안과'],
};

function getDeptGroup(dept) {
  for (const [group, depts] of Object.entries(DEPT_GROUPS)) {
    if (depts.includes(dept)) return group;
  }
  return null;
}

const ALL_DEPT_GROUPS_LIST = Object.keys(DEPT_GROUPS).join(', ');

app.post('/generate/relevance', async (req, res) => {
  const { resumeText = '', coverText = '', department = '' } = req.body;
  if (!department) return res.json({ isRelevant: true, reason: null });

  const combined = [
    resumeText ? resumeText.trim().substring(0, 2000) : '',
    coverText  ? coverText.trim().substring(0, 1000)  : '',
  ].filter(Boolean).join('\n\n');

  if (!combined) return res.json({ isRelevant: true, reason: null });

  const targetGroup = getDeptGroup(department);
  if (!targetGroup) return res.json({ isRelevant: true, reason: null });

  const prompt =
    `다음 이력서를 읽고, 이 사람의 직무 분야가 아래 분류 중 어디에 해당하는지 하나만 선택하세요.\n\n` +
    `[분류 목록]\n${ALL_DEPT_GROUPS_LIST}\n\n` +
    `[이력서/자소서]\n${combined}\n\n` +
    `이력서의 주요 내용(기술, 직무, 경력, 전공)을 보고 가장 잘 맞는 분류를 딱 하나만 고르세요.\n` +
    `반드시 아래 JSON 형식으로만 응답:\n` +
    `{"group":"분류명","reason":"이 분류를 선택한 이유 한 줄"}`;

  try {
    const parsed = await callMLX(prompt);
    const detectedGroup = parsed.group || '';
    const isRelevant = detectedGroup === targetGroup;

    console.log(`[relevance] 선택학과: ${department}(${targetGroup}) | AI판단: ${detectedGroup} | 일치: ${isRelevant}`);

    res.json({
      isRelevant,
      reason: !isRelevant
        ? `선택한 학과(${department})와 관련 없는 이력서입니다. 이력서는 ${parsed.reason || detectedGroup + ' 분야'} 관련 내용으로 구성되어 있습니다.`
        : null,
    });
  } catch (e) {
    console.error('관련성 검사 오류:', e.message);
    res.json({ isRelevant: true, reason: null });
  }
});

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
    const raw = await streamRaw(prompt, (p) => send({ type: 'progress', progress: p }), 600);
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

app.post('/generate/report', async (req, res) => {
  const { questions = [], answers = [], department = '', interviewType = 'mixed', interviewStyle = '' } = req.body;

  const send = setupSSE(res);

  const lengthEvals = answers.map(a => evalAnswerLength(a));

  const qaText = questions.map((q, i) => {
    const ans = (answers[i] || '(답변 없음)').substring(0, 250);
    return `Q${i + 1}: ${q}\nA${i + 1}: ${ans}`;
  }).join('\n\n');

  const qCount = questions.length;

  const questionFeedbackExample = questions.map((q, i) => {
    return `    {"appropriateness": 60, "improvedAnswer": "Q${i + 1} 개선된 답변을 한국어로 2~3문장 작성", "followUpQuestions": ["Q${i + 1} 꼬리질문1을 한국어로", "Q${i + 1} 꼬리질문2를 한국어로"], "comment": "Q${i + 1} 종합 피드백을 한국어로 2문장 이상 작성"}`;
  }).join(',\n');

  const prompt = `당신은 한국어로만 대답하는 채용 면접 전문가입니다. 절대 영어를 사용하지 마세요. 모든 응답은 반드시 한국어로 작성하세요.

아래 면접 Q&A를 분석하여 지원자에게 구체적이고 실질적인 피드백을 한국어로 제공하세요.

직무/학과: ${department || '미지정'}, 면접 유형: ${interviewType}${interviewStyle ? `, 면접관 스타일: ${interviewStyle}` : ''}
${interviewStyle ? `면접관 스타일을 고려해 평가하세요. 예: 압박형 면접에서의 짧은 답변은 긴장·압박 대응력으로, 친화형에서의 짧은 답변은 소극성으로 다르게 평가.` : ''}

[면접 Q&A]
${qaText}

응답 형식 (JSON만, 다른 텍스트 없음, 모든 문자열 값은 반드시 한국어):
{
  "overallScore": 60,
  "scores": {"content": 60, "logic": 60, "delivery": 60, "reliability": 60, "likability": 60},
  "strengths": ["강점을 구체적으로 한국어로 작성", "강점2", "강점3"],
  "weaknesses": ["보완점을 구체적으로 한국어로 작성", "보완점2", "보완점3"],
  "precautions": ["실제 면접 시 주의사항을 한국어로 작성", "주의사항2", "주의사항3"],
  "fitScores": {"job": 60, "org": 60, "company": 60},
  "fitComments": {"job": "직무 적합도 코멘트를 한국어로", "org": "조직 적합도 코멘트를 한국어로", "company": "기업 적합도 코멘트를 한국어로"},
  "questionFeedback": [
${questionFeedbackExample}
  ]
}

중요: questionFeedback 배열은 반드시 위 Q&A의 질문 순서대로 정확히 ${qCount}개의 항목을 포함해야 합니다. 각 항목은 해당 질문과 답변에 대한 피드백입니다. 모든 점수는 실제 답변 품질을 반영한 0~100 사이 정수입니다.`;

  try {
    const ESTIMATED_CHARS = Math.max(2000, qCount * 800);
    const raw = await streamRaw(
      prompt,
      (p) => send({ type: 'progress', progress: p }),
      ESTIMATED_CHARS,
      { max_tokens: qCount * 400 + 1000 },
    );

    const parsed = JSON.parse(cleanMarkdownJSON(raw));

    if (!Array.isArray(parsed.questionFeedback)) parsed.questionFeedback = [];
    while (parsed.questionFeedback.length < qCount) {
      parsed.questionFeedback.push({
        appropriateness: 0,
        improvedAnswer: '',
        followUpQuestions: [],
        comment: '',
      });
    }

    parsed.questionFeedback = parsed.questionFeedback.map((fb, i) => ({
      ...fb,
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
  console.log(`LLM 서버: ${MLX_SERVER_URL} (Ollama) | 모델: ${MLX_MODEL}`);
  try {
    console.log('LLM 서버 연결 확인 중...');
    await callMLX('안녕');
    console.log('LLM 서버 연결 완료');
  } catch (e) {
    console.warn(`LLM 서버 연결 실패 (Ollama가 실행 중인지 확인):`, e.message);
  }
});
