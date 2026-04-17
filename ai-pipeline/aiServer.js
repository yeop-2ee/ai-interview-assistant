import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import ollama from 'ollama';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 스타일별 페르소나 (어투·질문 방향에 영향)
const STYLE_PERSONAS = {
  friendly: {
    tone: '부드럽고 편안하게 유도하는',
    desc: '지원자가 긴장하지 않도록 따뜻하고 친절한 어투로 질문을 작성합니다. 질문은 "~에 대해 편하게 말씀해 주시겠어요?" 같은 개방형 형식을 선호합니다.',
  },
  pressure: {
    tone: '날카롭고 압박적인',
    desc: '지원자의 논리와 의지를 강하게 검증합니다. 질문은 직접적이고 도전적이며, "그렇게 생각하는 근거가 무엇입니까?" 같은 반론형 어투를 선호합니다.',
  },
  professor: {
    tone: '개념을 깊게 파고드는 교수형',
    desc: '개념의 원리·배경 이해를 중시하며 학문적·분석적 어투로 질문합니다. "~의 원리를 설명하고, 실무에서의 적용 방식까지 논리적으로 전개해 주십시오." 형식을 선호합니다.',
  },
  practical: {
    tone: '실무 연계 현실적인',
    desc: '실제 업무 상황을 가정한 현실적 시나리오 기반으로 질문합니다. "실무에서 ○○ 상황이 발생했을 때 어떻게 대처하시겠습니까?" 형식을 선호합니다.',
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

const EXPERIENCE_MAP = {
  newcomer: '신입 (0년차) — 기초 역량·학습 의지·성장 가능성 위주 질문, 깊은 실무 경험 전제 금지',
  junior:   '주니어 (1~3년차) — 실무 경험·문제 해결 방식·기초 설계 역량 위주 질문',
  mid:      '미드레벨 (3~5년차) — 주도적 프로젝트 경험·기술 깊이·팀 협업 방식 위주 질문',
  senior:   '시니어 (5년 이상) — 리더십·아키텍처 설계·기술 의사결정·멘토링 역량 위주 질문',
};

// LLM 단일 호출 헬퍼 (스트리밍, 진행률 콜백 포함)
async function streamOllama(prompt, onProgress, estimatedTokens = 180) {
  const stream = await ollama.chat({
    model: 'ai-interview-assistant',
    messages: [{ role: 'user', content: prompt }],
    format: 'json',
    stream: true,
  });
  let fullContent = '';
  let tokenCount = 0;
  for await (const chunk of stream) {
    fullContent += chunk.message.content;
    tokenCount++;
    onProgress(Math.min(Math.floor((tokenCount / estimatedTokens) * 100), 99));
  }
  try {
    return JSON.parse(fullContent);
  } catch {
    throw new Error(`LLM 응답 JSON 파싱 실패: ${fullContent.substring(0, 100)}`);
  }
}

// ── 공통 2개: 세션마다 LLM으로 생성 (스타일 반영) ───────────────────
function buildCommonPrompt(department, jobRole, companyType, experienceLevel, style) {
  const persona = STYLE_PERSONAS[style] || STYLE_PERSONAS.friendly;
  const target = jobRole ? `${department} 학과 / ${jobRole}` : department;
  let p = `당신은 한국어로만 대답하는 채용 전문 면접관입니다.\n`;
  p += `지원자 정보: ${target}\n`;
  p += `회사 유형: ${COMPANY_TYPE_MAP[companyType] || companyType}\n`;
  p += `지원자 수준: ${EXPERIENCE_MAP[experienceLevel] || experienceLevel}\n`;
  p += `면접관 스타일: ${persona.tone}\n`;
  p += `${persona.desc}\n\n`;
  p += `모든 지원자에게 공통으로 묻는 핵심 질문 2개를 위 스타일에 맞는 어투로 생성하세요:\n\n`;
  p += `Q1. 지원 동기와 해당 직무에서 본인이 기여할 수 있는 방향·비전을 묻는 질문\n`;
  p += `Q2. 본인의 약점(부족한 점)과 이를 극복하기 위한 구체적인 노력·성장 의지를 묻는 질문\n\n`;
  p += `[작성 규칙]\n`;
  p += `- 각 질문에 물음표(?)가 반드시 하나만 있어야 합니다.\n`;
  p += `- 위 면접관 스타일의 어투를 일관되게 유지\n`;
  p += `- 자연스러운 한국어 경어체\n`;
  p += `- 반드시 아래 JSON 형식으로만 응답:\n`;
  p += `{"questions":["공통질문1","공통질문2"]}`;
  return p;
}

// ── 직무/인성 3개 (이력서 없이) ───────────────────────────────────────
function buildJobPrompt(department, jobRole, companyType, experienceLevel, style, interviewType, knowledgeEntries = []) {
  const persona = STYLE_PERSONAS[style] || STYLE_PERSONAS.friendly;
  const target = jobRole ? `${department} 학과 / ${jobRole}` : department;
  let p = `당신은 한국어로만 대답하는 채용 전문 면접관입니다.\n`;
  p += `지원자 정보: ${target}\n`;
  p += `회사 유형: ${COMPANY_TYPE_MAP[companyType] || companyType}\n`;
  p += `지원자 수준: ${EXPERIENCE_MAP[experienceLevel] || experienceLevel}\n`;
  p += `면접관 스타일: ${persona.tone}\n`;
  p += `${persona.desc}\n\n`;

  if (knowledgeEntries.length > 0) {
    p += `[${department} 직무 전공지식]\n`;
    knowledgeEntries.slice(0, 10).forEach(e => {
      p += `- [${e.subject}] ${e.content}\n`;
    });
    p += '\n';
  }

  const roleLabel = jobRole || department;
  if (interviewType === 'personality') {
    p += `${roleLabel} 직무 면접에서 지원자의 인성, 팀워크, 협업 능력을 검증하는 질문 3개를 생성하세요.\n\n`;
    p += `Q1. 팀 내 갈등이나 어려운 상황에서 어떻게 대처하는지를 묻는 질문\n`;
    p += `Q2. 본인의 단점과 이를 극복하기 위한 노력을 묻는 질문\n`;
    p += `Q3. 협업 과정에서 의사소통 방식이나 팀 내 역할을 묻는 질문\n`;
  } else {
    // major / resume / mixed — 직무 핵심 기술 역량 검증
    p += `${roleLabel} 직무에서 필요한 핵심 기술 역량을 검증하는 질문 3개를 생성하세요.\n\n`;
    p += `Q1. ${roleLabel} 분야의 핵심 개념이나 원리에 대한 이해도를 검증하는 질문\n`;
    p += `Q2. ${roleLabel} 직무에서 자주 마주치는 기술적 문제와 해결 방식을 묻는 질문\n`;
    p += `Q3. ${roleLabel} 분야 최신 기술 트렌드나 도구에 대한 지식을 검증하는 질문\n`;
  }

  p += `\n[작성 규칙]\n`;
  p += `- 각 질문에 물음표(?)가 반드시 하나만 있어야 합니다.\n`;
  p += `- "경험해보셨나요?", "해보셨나요?" 같이 과거 경험을 전제하는 표현 금지\n`;
  p += `- 아래 형태처럼 이해도·관점을 묻는 형식으로 작성:\n`;
  p += `  좋은 예: "${department} 분야에서 ○○이란 무엇이며, 실무에서 어떻게 활용하는 것이 효과적이라고 생각하십니까?"\n`;
  p += `  나쁜 예: "최근에 작업하셨던 ○○ 경험을 말씀해주세요."\n`;
  p += `- 자연스러운 한국어 경어체\n`;
  p += `- 반드시 아래 JSON 형식으로만 응답:\n`;
  p += `{"questions":["직무질문1","직무질문2","직무질문3"]}`;
  return p;
}

// ── 이력서 2개 (resume/mixed 전용) ──────────────────────────────────
function buildResumePrompt(department, jobRole, companyType, experienceLevel, style, resumeText) {
  const persona = STYLE_PERSONAS[style] || STYLE_PERSONAS.friendly;
  const target = jobRole ? `${department} 학과 / ${jobRole}` : department;
  let p = `당신은 한국어로만 대답하는 채용 전문 면접관입니다.\n`;
  p += `지원자 정보: ${target}\n`;
  p += `회사 유형: ${COMPANY_TYPE_MAP[companyType] || companyType}\n`;
  p += `지원자 수준: ${EXPERIENCE_MAP[experienceLevel] || experienceLevel}\n`;
  p += `면접관 스타일: ${persona.tone}\n`;
  p += `${persona.desc}\n\n`;
  p += `[지원자 이력서/자소서]\n${resumeText.trim().substring(0, 2000)}\n\n`;
  const roleLabel = jobRole || department;
  p += `위 이력서를 바탕으로 서로 다른 역량을 검증하는 면접 질문 2개를 생성하세요:\n\n`;
  p += `Q1. 이력서에서 드러나는 기술적 강점(성능 최적화, 시스템 설계, 알고리즘 등)을 ${roleLabel} 직무 관점에서 어떻게 활용할 수 있는지 묻는 질문. 특정 프로젝트명·라이브러리명 직접 언급 금지.\n`;
  p += `Q2. Q1과 완전히 다른 측면: 이력서에서 드러나는 개발 철학(TDD, 코드 품질, 협업 방식 등)이 ${roleLabel} 직무에서 어떤 의미를 갖는지 묻는 질문. 특정 프로젝트명·라이브러리명 직접 언급 금지.\n\n`;
  p += `[작성 규칙]\n`;
  p += `- 각 질문에 물음표(?)가 반드시 하나만 있어야 합니다.\n`;
  p += `- 자연스러운 한국어 경어체\n`;
  p += `- 반드시 아래 JSON 형식으로만 응답:\n`;
  p += `{"questions":["이력서질문1","이력서질문2"]}`;
  return p;
}

app.post('/generate/questions', async (req, res) => {
  const { resumeText, knowledgeEntries = [], department, jobRole, companyType, experienceLevel, interviewType } = req.body;
  const style = resolveStyle(req.body.style);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    let questions = [];
    const hasResume = resumeText && resumeText.trim().length > 0;

    // ── 패스 1 (공통): 모든 유형 공통 2개 (0~25%) ─────────────
    send({ type: 'progress', progress: 0, step: '공통 질문 생성 중...' });
    const commonPass = await streamOllama(
      buildCommonPrompt(department, jobRole, companyType, experienceLevel, style),
      (p) => send({ type: 'progress', progress: Math.floor(p * 0.25), step: '공통 질문 생성 중...' }),
      80,
    );
    const commonQs = Array.isArray(commonPass.questions) ? commonPass.questions.slice(0, 2) : [];

    if (interviewType === 'resume' || interviewType === 'mixed') {
      // ── 패스 2: 직무 3개 (25~65%) ───────────────────────────
      send({ type: 'progress', progress: 25, step: '직무 질문 생성 중...' });
      const pass2 = await streamOllama(
        buildJobPrompt(department, jobRole, companyType, experienceLevel, style, interviewType, knowledgeEntries),
        (p) => send({ type: 'progress', progress: 25 + Math.floor(p * 0.40), step: '직무 질문 생성 중...' }),
        100,
      );
      const jobQs = Array.isArray(pass2.questions) ? pass2.questions.slice(0, 3) : [];

      // ── 패스 3: 이력서 2개 (65~95%) — 이력서 없으면 스킵 ────
      let resumeQs = [];
      if (hasResume) {
        send({ type: 'progress', progress: 65, step: '이력서 질문 생성 중...' });
        const pass3 = await streamOllama(
          buildResumePrompt(department, jobRole, companyType, experienceLevel, style, resumeText),
          (p) => send({ type: 'progress', progress: 65 + Math.floor(p * 0.30), step: '이력서 질문 생성 중...' }),
          80,
        );
        resumeQs = Array.isArray(pass3.questions) ? pass3.questions.slice(0, 2) : [];
      }

      // 순서: 공통 → 직무 → 이력서
      questions = [...commonQs, ...jobQs, ...resumeQs];

    } else {
      // ── 패스 2: 직무/인성 3개 (25~95%) ─────────────────────
      send({ type: 'progress', progress: 25, step: '직무 질문 생성 중...' });
      const pass2 = await streamOllama(
        buildJobPrompt(department, jobRole, companyType, experienceLevel, style, interviewType, knowledgeEntries),
        (p) => send({ type: 'progress', progress: 25 + Math.floor(p * 0.70), step: '직무 질문 생성 중...' }),
        100,
      );
      const jobQs = Array.isArray(pass2.questions) ? pass2.questions.slice(0, 3) : [];

      questions = [...commonQs, ...jobQs];
    }

    if (questions.length === 0) throw new Error('올바른 질문 배열을 생성하지 못했습니다.');

    // 각 질문의 카테고리 정보 생성
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
// 규칙 기반 판정 후 필요한 경우에만 모델 호출
app.post('/generate/followup', async (req, res) => {
  const { question = '', answer = '', department = '', jobRole = '', companyType = '', experienceLevel = '' } = req.body;
  const style = resolveStyle(req.body.style || 'friendly');

  const persona = STYLE_PERSONAS[style] || STYLE_PERSONAS.friendly;
  const target = jobRole ? `${department} / ${jobRole}` : department;
  const prompt =
    `당신은 한국어로만 대답하는 채용 전문 면접관입니다.\n` +
    `지원자 정보: ${target}\n` +
    (companyType ? `회사 유형: ${COMPANY_TYPE_MAP[companyType] || companyType}\n` : '') +
    (experienceLevel ? `지원자 수준: ${EXPERIENCE_MAP[experienceLevel] || experienceLevel}\n` : '') +
    `면접관 스타일: ${persona.tone}\n${persona.desc}\n\n` +
    `[면접 질문]\n${question}\n\n` +
    `[지원자 답변]\n${answer}\n\n` +
    `위 답변을 분석하여, 꼬리질문이 반드시 필요한지 판단하세요.\n\n` +
    `[반드시 followup을 null로 응답해야 하는 경우 — 아래 중 하나라도 해당되면 null]\n` +
    `- 답변이 질문의 핵심을 충분히 다루고, 구체적인 경험·근거·결과가 포함된 경우\n` +
    `- 답변이 논리적으로 완결되어 추가 확인이 불필요한 경우\n` +
    `- 이미 깊이 있는 설명이 이루어진 경우\n` +
    `- 답변 길이가 짧더라도 질문에 대한 핵심을 명확하게 전달한 경우\n\n` +
    `[꼬리질문을 생성해야 하는 경우 — 아래 중 하나라도 해당되어야 함]\n` +
    `- 답변이 질문과 전혀 다른 내용으로 동문서답한 경우 → 질문의 핵심을 다시 확인하는 질문 생성\n` +
    `- 구체적인 경험이나 사례가 전혀 없고, 추상적·원론적인 답변만 있는 경우\n` +
    `- 주장만 있고 이유나 근거가 완전히 빠진 경우\n` +
    `- 결과·성과가 중요한 질문인데 전혀 언급이 없는 경우\n\n` +
    `[꼬리질문 작성 규칙 — followup이 있을 때만 적용]\n` +
    `- 물음표(?)가 하나만 있는 짧고 명확한 질문\n` +
    `- 부족한 부분을 구체적으로 보완하도록 유도\n` +
    `- 자연스러운 한국어 경어체\n` +
    `- 동문서답인 경우 "방금 질문은 ~에 관한 것이었는데, ~에 대해 다시 말씀해 주시겠어요?" 형식\n\n` +
    `기본값은 null입니다. 위 꼬리질문 생성 기준에 명확히 해당될 때만 질문을 생성하세요.\n` +
    `반드시 아래 JSON 형식으로만 응답:\n` +
    `{"followup":"꼬리질문"} 또는 {"followup":null}`;

  try {
    const result = await ollama.chat({
      model: 'ai-interview-assistant',
      messages: [{ role: 'user', content: prompt }],
      format: 'json',
      stream: false,
    });
    const parsed = JSON.parse(result.message.content);
    res.json({ followup: parsed.followup || null });
  } catch (e) {
    console.error('꼬리질문 생성 오류:', e.message);
    res.json({ followup: null });
  }
});

// 학과 그룹 — 유사 분야끼리 묶어서 비교에 사용
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
    const result = await ollama.chat({
      model: 'ai-interview-assistant',
      messages: [{ role: 'user', content: prompt }],
      format: 'json',
      stream: false,
    });
    const parsed = JSON.parse(result.message.content);
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
  const { resumeText = '', coverText = '' } = req.body;

  const combined = [
    resumeText ? `[이력서]\n${resumeText.trim().substring(0, 3000)}` : '',
    coverText  ? `[자기소개서]\n${coverText.trim().substring(0, 2000)}`  : '',
  ].filter(Boolean).join('\n\n');

  if (!combined) {
    return res.status(400).json({ error: '텍스트가 없습니다.' });
  }

  const prompt = `다음은 지원자의 이력서와 자기소개서입니다.\n\n${combined}\n\n위 내용을 분석하여 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):\n{"name":"이름 또는 미상","oneLiner":"지원자를 한 줄로 요약","skills":["기술1","기술2","기술3"],"experience":"경력 요약 (없으면 신입)","education":"최종학력 요약","projects":["주요 프로젝트1","주요 프로젝트2"],"strengths":["강점1","강점2","강점3"]}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const stream = await ollama.chat({
      model: 'ai-interview-assistant',
      messages: [{ role: 'user', content: prompt }],
      format: 'json',
      stream: true,
    });

    let fullContent = '';
    let tokenCount = 0;
    const ESTIMATED_TOKENS = 200;

    for await (const chunk of stream) {
      fullContent += chunk.message.content;
      tokenCount++;
      const progress = Math.min(Math.floor((tokenCount / ESTIMATED_TOKENS) * 95), 95);
      send({ type: 'progress', progress });
    }

    const cleanSummary = fullContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    const parsed = JSON.parse(cleanSummary);
    send({ type: 'done', data: parsed });
  } catch (error) {
    console.error('요약 생성 오류:', error.message);
    send({ type: 'error', message: error.message });
  }

  res.end();
});

// 글자 수 기반 답변 길이 판정
function evalAnswerLength(text = '') {
  const len = text.trim().length;
  if (len < 150) return '짧음';
  if (len > 350) return '긺';
  return '적절';
}

app.post('/generate/report', async (req, res) => {
  const { questions = [], answers = [], department = '', interviewType = 'mixed' } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

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

직무/학과: ${department || '미지정'}, 면접 유형: ${interviewType}

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
    const stream = await ollama.chat({
      model: 'ai-interview-assistant',
      messages: [{ role: 'user', content: prompt }],
      format: 'json',
      stream: true,
      options: { num_predict: qCount * 400 + 1000 },
    });

    let fullContent = '';
    let tokenCount = 0;
    const ESTIMATED_TOKENS = Math.max(700, qCount * 300);

    for await (const chunk of stream) {
      fullContent += chunk.message.content;
      tokenCount++;
      const progress = Math.min(Math.floor((tokenCount / ESTIMATED_TOKENS) * 95), 95);
      send({ type: 'progress', progress });
    }

    // 마크다운 코드블록 제거 후 JSON 파싱
    const cleanContent = fullContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    const parsed = JSON.parse(cleanContent);

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
  try {
    console.log('모델 워밍업 중...');
    await ollama.chat({
      model: 'ai-interview-assistant',
      messages: [{ role: 'user', content: '안녕' }],
    });
    console.log('모델 워밍업 완료');
  } catch (e) {
    console.warn('모델 워밍업 실패 (무시):', e.message);
  }
});
