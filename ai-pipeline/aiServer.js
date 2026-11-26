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

// 면접 질문 생성 temperature — 낮출수록 오타·비문이 줄고, 같은 질문 반복은 늘어남
// (파인튜닝 모델, 신규 학과 수동 채점 비문 비율: 0.8 약 25% → 0.5 약 4% → 0.3 약 1~2%)
const QUESTION_TEMPERATURE = process.env.QUESTION_TEMPERATURE !== undefined ? Number(process.env.QUESTION_TEMPERATURE) : 0.3;
// 꼬리질문 생성 temperature (기존에는 미설정 → Ollama 기본값 0.8)
const FOLLOWUP_TEMPERATURE = process.env.FOLLOWUP_TEMPERATURE !== undefined ? Number(process.env.FOLLOWUP_TEMPERATURE) : 0.3;

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

// ── 학과별 프롬프트 프로필 ─────────────────────────────────────────────────
// 여기에 없는 학과(컴퓨터소프트웨어과 등)는 기존 개발자 기준 문구를 그대로 사용.
const DEPT_PROFILES = {
  '전자공학과': {
    roles: {
      professor: '15년 경력의 시니어 하드웨어 엔지니어 출신 기술 면접관',
      practical: '실무 프로젝트를 직접 이끄는 현업 하드웨어 설계팀 팀장',
    },
    career: '전자·하드웨어 분야 중 관심 있는 분야와 앞으로 어떤 엔지니어가 되고 싶은지 묻는 질문.',
    collab: '팀 프로젝트에서 회로도나 설계 문서를 어떻게 관리하고 공유했는지 묻는 질문.',
    basics: '저항·커패시터·인덕터의 역할, 아날로그와 디지털 신호의 차이, 옴의 법칙, 오실로스코프로 무엇을 측정하는지, 마이크로컨트롤러와 마이크로프로세서의 차이, PWM이 무엇인지',
    build: '간단한 센서 장치를 처음부터 만든다면 어떤 순서로 설계할지 묻는 질문.',
    trend: '전자 산업의 변화가 하드웨어 엔지니어의 역할을 어떻게 바꿀지 의견을 묻는 질문.',
    tools: '사용한 장비·툴(회로 설계 툴, MCU, 계측 장비 등)',
    examples: [
      '납땜 불량을 찾을 때 어떤 방법을 사용하셨나요?',
      '오실로스코프로 신호를 측정할 때 어떤 점을 확인하시나요?',
      '시뮬레이션 결과와 실제 측정값이 다르면 어떻게 하시겠어요?',
    ],
  },
  '정보통신과': {
    roles: {
      professor: '15년 경력의 시니어 네트워크 엔지니어 출신 기술 면접관',
      practical: '실무 프로젝트를 직접 이끄는 현업 네트워크 운영팀 팀장',
    },
    career: '정보통신 분야 중 관심 있는 분야와 앞으로 어떤 엔지니어가 되고 싶은지 묻는 질문.',
    collab: '팀 프로젝트에서 네트워크 설정 변경 내용을 어떻게 기록하고 공유했는지 묻는 질문.',
    basics: 'OSI 7계층, TCP와 UDP의 차이, IP 주소와 서브넷 마스크, 라우터와 스위치의 차이, DNS의 역할, VLAN이 무엇인지',
    build: '소규모 사무실 네트워크를 처음부터 구축한다면 어떤 순서로 진행할지 묻는 질문.',
    trend: '통신 기술의 변화가 네트워크 엔지니어의 역할을 어떻게 바꿀지 의견을 묻는 질문.',
    tools: '사용한 장비·기술(네트워크 장비, 프로토콜, 클라우드 서비스 등)',
    examples: [
      '방화벽 정책을 정할 때 어떤 기준을 두시겠어요?',
      '네트워크 장애가 생기면 가장 먼저 무엇을 확인하시겠어요?',
      '와이파이 신호가 약한 구역은 어떻게 개선하시겠어요?',
    ],
  },
  '전기과': {
    roles: {
      professor: '15년 경력의 시니어 전기 엔지니어 출신 기술 면접관',
      practical: '실무 현장을 직접 이끄는 현업 전기설비팀 팀장',
    },
    career: '전기 분야 중 관심 있는 분야와 앞으로 어떤 엔지니어가 되고 싶은지 묻는 질문.',
    collab: '실습이나 팀 프로젝트에서 안전 수칙을 어떻게 지키고 공유했는지 묻는 질문.',
    basics: '교류와 직류의 차이, 전압·전류·저항의 관계, 차단기의 역할, 접지를 하는 이유, 변압기의 원리, 3상 전력이 무엇인지',
    build: '간단한 전동기 제어 회로를 처음부터 구성한다면 어떤 순서로 작업할지 묻는 질문.',
    trend: '신재생에너지 확대가 전기 엔지니어의 역할을 어떻게 바꿀지 의견을 묻는 질문.',
    tools: '사용한 장비·기술(PLC, 계측기, 전기 설계 툴 등)',
    examples: [
      '절연 저항 측정은 어떤 상황에서 하시나요?',
      '차단기가 자주 떨어지면 어떤 점부터 점검하시겠어요?',
      '도면과 현장 배선이 다르면 어떻게 대응하시겠어요?',
    ],
  },
  '게임콘텐츠과': {
    roles: {
      professor: '15년 경력의 시니어 게임 개발자 출신 기술 면접관',
      practical: '실무 프로젝트를 직접 이끄는 현업 게임 개발팀 팀장',
    },
    career: '어떤 게임 개발 분야(클라이언트, 서버, 기획, 아트 등)에 관심이 있고 앞으로 어떤 게임 개발자가 되고 싶은지 설명하게 만드는 질문.',
    collab: '팀 게임 프로젝트에서 버전 관리나 기획서·리소스 공유를 어떻게 했는지 설명하게 만드는 질문.',
    basics: '게임 루프가 무엇인지, 프레임레이트(FPS)의 의미, 충돌 판정 방식, 게임 엔진(Unity·Unreal)을 쓰는 이유, 오브젝트 풀링을 쓰는 이유, 레벨 디자인이 무엇인지',
    build: '간단한 게임(예: 점프 액션, 퍼즐, 슈팅)을 처음부터 만든다면 어떤 순서로 접근할지 설명하게 만드는 질문.',
    trend: '생성형 AI가 게임 개발 과정(리소스 제작, NPC, 기획 등)을 어떻게 바꿀지 의견을 말하게 만드는 질문.',
    tools: '사용한 엔진·툴(Unity, Unreal, 그래픽 툴 등)',
    examples: [
      '게임 루프가 무엇이고 왜 필요한지 설명해 주시겠어요?',
      '팀 프로젝트에서 리소스 충돌을 어떻게 관리하셨나요?',
      '간단한 퍼즐 게임을 만든다면 무엇부터 구현하시겠어요?',
    ],
  },
};

// 학과 프로필이 있을 때만 예시 질문 블록을 추가 (없으면 빈 문자열 → 기존 프롬프트 그대로)
function deptExamples(department) {
  const ex = DEPT_PROFILES[department]?.examples;
  if (!ex?.length) return '';
  return `[좋은 질문 예시 — 말투와 길이만 참고하고, 문장을 그대로 쓰지 말 것]\n${ex.map(e => `- ${e}`).join('\n')}\n\n`
    + `[한국어 규칙]\n- 실제로 쓰이지 않는 어색한 조어나 존재하지 않는 단어 사용 금지 — 자연스러운 한국어 존댓말만 사용.\n- 한 질문에는 한 가지만 물을 것. 여러 개념·용어를 한 문장에 섞지 말 것.\n- 전문 용어는 위에 나온 표현을 그대로 쓸 것.\n\n`;
}

// ── LLM 호출 헬퍼 ─────────────────────────────────────────────────────────

// 일시적 오류(모델 로딩·교체 중 실패, GPU 메모리 부족, 깨진 JSON 응답 등)는 다시 시도하면 대부분 해결되므로
// 간격을 늘려가며 재시도하고, 모두 실패했을 때만 마지막 오류를 던진다
async function withRetry(label, fn, { attempts = 3, baseDelayMs = 1500 } = {}) {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn(i);
    } catch (e) {
      lastError = e;
      console.warn(`[${label}] 시도 ${i}/${attempts} 실패: ${e.message}`);
      if (i < attempts) await new Promise(r => setTimeout(r, baseDelayMs * i));
    }
  }
  throw lastError;
}

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
async function streamMLX(client, model, prompt, onProgress, estimatedChars = 400, extraOptions = {}) {
  const raw = await streamRaw(client, model, prompt, onProgress, estimatedChars, extraOptions);
  try {
    return extractJSON(raw);
  } catch {
    console.error('RAW OUTPUT (파싱 실패):', raw.substring(0, 500));
    throw new Error(`LLM 응답 JSON 파싱 실패: ${raw.substring(0, 100)}`);
  }
}

// 논스트리밍 호출 (client·model 지정)
async function callMLX(client, model, prompt, { allowTextFallback = false, temperature } = {}) {
  const result = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: '당신은 JSON 형식으로만 응답합니다. 절대로 JSON 외의 텍스트를 출력하지 마세요.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    stream: false,
    max_tokens: 4096,
    ...(temperature !== undefined ? { temperature } : {}),
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
  let persona = STYLE_PERSONAS[style] || STYLE_PERSONAS.friendly;
  const deptRole = DEPT_PROFILES[department]?.roles?.[style];
  if (deptRole) persona = { ...persona, role: deptRole };
  return {
    persona,
    level: EXPERIENCE_MAP[experienceLevel] || experienceLevel,
    companyLabel: COMPANY_TYPE_MAP[companyType] || companyType,
    companyContext: COMPANY_CONTEXT[companyType] || '',
  };
}

// 모든 질문 프롬프트에 공통으로 적용되는 출력 규칙
// ── 면접 언어 ─────────────────────────────────────────────────────────────
// 외국계 기업을 고르면 영어 면접 — 질문·꼬리질문은 영어, 리포트 피드백은 한국어(개선 답변 예시만 영어)
const interviewLanguage = (companyType) => (companyType === 'foreign' ? 'en' : 'ko');

// 영어 면접: 한국어 전용 지시를 걷어내고, 질문을 영어로 쓰라는 규칙을 최우선으로 덧붙임
// (프롬프트 본문은 한국어 그대로 두어 두 벌로 관리하지 않음)
function localizeQuestionPrompt(prompt, lang) {
  if (lang !== 'en') return prompt;
  return prompt
    .replaceAll('당신은 한국어로만 대답하는 채용 전문 면접관입니다.', '당신은 외국계 기업의 채용 전문 면접관이며, 이 면접은 영어로 진행됩니다.')
    .replaceAll('- 반드시 한국어로만 작성. 영어·한자·기타 외국어 절대 금지.\n', '')
    .replaceAll('- 질문은 30자 이상 60자 이내로 간결하게.\n', '- 질문은 10~25단어 정도로 간결하게.\n')
    .replace(/\[좋은 질문 예시[\s\S]*?\n\n/, '')   // 한국어 예시 질문은 한국어 출력을 유도하므로 제외
    .replace(/\[한국어 규칙\][\s\S]*?\n\n/, '')
    + `\n\n[언어 규칙 — 위 내용보다 우선]\n- 모든 질문은 자연스럽고 정중한 비즈니스 영어로만 작성. 한국어 금지.\n- 각 질문은 물음표(?)로 끝나는 한 문장.\n- JSON 키와 형식은 그대로 유지.`;
}

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

function buildCommonPrompt1(department, jobRole, companyType, experienceLevel, style) {
  const { persona, level, companyLabel, companyContext } = buildBaseContext(department, jobRole, companyType, experienceLevel, style);
  const target = jobRole ? `${department} / ${jobRole}` : department;

  let p = `당신은 한국어로만 대답하는 채용 전문 면접관입니다.\n`;
  p += `면접관 역할: ${persona.role}\n`;
  p += `지원자: ${target} | 수준: ${level}\n`;
  p += `회사 유형: ${companyLabel}\n`;
  p += `면접관 성격: ${persona.tone} — ${persona.desc}\n\n`;
  if (companyContext) p += `[회사 맥락] ${companyContext}\n\n`;

  p += `면접 질문 1개만 작성하세요.\n\n`;
  p += `질문: ${DEPT_PROFILES[department]?.career ?? '어떤 개발 분야에 관심이 있고 앞으로 어떤 개발자가 되고 싶은지 설명하게 만드는 질문.'}\n\n`;
  p += deptExamples(department);
  p += commonQuestionRules(persona);
  p += `- 반드시 아래 JSON 형식으로만 응답:\n`;
  p += `{"questions":["질문?"]}`;
  return p;
}

function buildCommonPrompt2(department, jobRole, companyType, experienceLevel, style) {
  const { persona, level, companyLabel, companyContext } = buildBaseContext(department, jobRole, companyType, experienceLevel, style);
  const target = jobRole ? `${department} / ${jobRole}` : department;

  let p = `당신은 한국어로만 대답하는 채용 전문 면접관입니다.\n`;
  p += `면접관 역할: ${persona.role}\n`;
  p += `지원자: ${target} | 수준: ${level}\n`;
  p += `회사 유형: ${companyLabel}\n`;
  p += `면접관 성격: ${persona.tone} — ${persona.desc}\n\n`;
  if (companyContext) p += `[회사 맥락] ${companyContext}\n\n`;

  p += `면접 질문 1개만 작성하세요.\n\n`;
  p += `질문: ${DEPT_PROFILES[department]?.collab ?? '팀 프로젝트에서 git 브랜치 전략이나 코드 컨벤션을 어떻게 관리했는지 설명하게 만드는 질문.'}\n\n`;
  p += deptExamples(department);
  p += commonQuestionRules(persona);
  p += `- 반드시 아래 JSON 형식으로만 응답:\n`;
  p += `{"questions":["질문?"]}`;
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
    // 신입: 전공지식(있으면 우선) or CS 기초 + 시스템 설계 + 트렌드
    p += `${roleLabel} 분야 신입 지원자 면접 질문 3개를 작성하세요.\n\n`;
    if (knowledgeEntries.length > 0) {
      p += `질문 1: 위 [${department} 직무 전공지식 참고] 항목 중 하나를 골라, 신입이 기본 개념 수준으로 설명할 수 있도록 유도하는 질문. 심화 이론·내부 구현 원리는 묻지 말 것.\n`;
    } else {
      p += `질문 1: 아래 예시 주제 중 하나를 골라 그 개념이 무엇이고 어디에 쓰이는지 설명하게 만드는 기초 수준 질문. 심화 이론·내부 구현 원리는 묻지 말 것.\n`;
      p += `  예시 주제: ${DEPT_PROFILES[department]?.basics ?? '배열과 리스트의 차이, HTTP GET과 POST의 차이, 클라이언트-서버 구조가 무엇인지, 데이터베이스를 쓰는 이유, 함수와 메서드의 차이, API가 무엇인지'}.\n`;
    }
    p += `질문 2: ${DEPT_PROFILES[department]?.build ?? '간단한 기능(예: 로그인, 게시글 작성, 검색)을 처음부터 만든다면 어떤 순서로 접근할지 설명하게 만드는 질문.'}\n`;
    p += `질문 3: ${DEPT_PROFILES[department]?.trend ?? 'AI 코딩 도구(예: GitHub Copilot, ChatGPT 등)를 개발에 어떻게 활용하는지 또는 앞으로 개발 환경이 어떻게 변할지 의견을 말하게 만드는 질문.'}\n\n`;
    p += deptExamples(department);
    p += commonQuestionRules(persona);
    p += `- 신입이므로 깊은 실무 경험·심화 이론 전제 금지. 기본 개념 이해 수준으로만 질문할 것.\n`;
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
  p += `질문 1: 위 이력서에 실제로 적혀 있는 경험에서 본인이 담당한 역할과 ${DEPT_PROFILES[department]?.tools ?? '사용한 기술 스택'}이 무엇인지 묻는 질문. 이력서에 없는 내용 지어내기 금지. 프로젝트명 직접 언급 금지.\n`;
  p += `질문 2: 위 이력서에 실제로 적혀 있는 다른 경험에서 특정 기술을 선택한 이유 또는 구현 중 어려웠던 점을 묻는 질문. 이력서에 없는 내용 지어내기 금지. 프로젝트명 직접 언급 금지.\n\n`;
  p += commonQuestionRules(persona);
  p += `- 이력서와 무관한 일반 질문 금지.\n`;
  p += `- 반드시 아래 JSON 형식으로만 응답:\n`;
  p += `{"questions":["질문1?","질문2?"]}`;
  return p;
}

// ── 리포트용 꼬리질문 추출 (llama 담당) ──────────────────────────────────
// followupSet: 꼬리질문인 질문 텍스트 집합 (해당 행은 스킵)
async function generateReportFollowUps(questions, answers, department, jobRole, followupSet = new Set(), lang = 'ko') {
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
      `{"followUpQuestions":["꼬리질문1"]} 또는 {"followUpQuestions":[]}` +
      (lang === 'en' ? `\n- 이 면접은 영어로 진행되었으므로 꼬리질문은 자연스러운 비즈니스 영어로 작성.` : '');

    return withRetry(`report-followup Q${i + 1}`, () => callMLX(llamaClient, LLAMA_MODEL, prompt), { attempts: 2 })
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
  const lang = interviewLanguage(companyType);

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

    // 질문 필터: 불량 항목 제거
    const filterQuestion = (q) => {
      if (typeof q !== 'string') return false;
      const t = q.trim();
      if (t.length < 6 || t.length > (lang === 'en' ? 250 : 150)) return false;
      if (!t.endsWith('?')) return false;
      if (lang === 'en' && /[가-힣]/.test(t)) return false; // 영어 면접에 한국어가 섞인 질문 제외
      // 허용 문자(한글·영어·숫자·기본 문장부호) 외의 문자가 있으면 제외 — 한자·베트남어·키릴·아랍·힌디 등 혼입 차단
      // (영어 tech 용어 git, API, React 등은 허용)
      if (/[^ -~가-힣ㄱ-ㆎ·‘’“”…–—]/.test(t)) return false;
      // 한글 바로 뒤에 영어가 붙은 깨진 단어 제외 (예: "기술ize", "있DonaldTrump")
      if (/[가-힣][A-Za-z]/.test(t)) return false;
      return true;
    };

    // 생성 + 필터링, 필요한 개수보다 적으면 최대 2회 재시도 (생성 오류도 재시도 대상)
    // 프론트엔드는 AI 질문이 5개 미만이면 설정 화면으로 돌려보내므로 개수 확보가 중요
    const generateQuestions = async (prompt, count, onProgress, estimatedChars) => {
      let best = [];
      for (let attempt = 0; attempt < 3 && best.length < count; attempt++) {
        try {
          const result = await streamMLX(llamaClient, LLAMA_MODEL, localizeQuestionPrompt(prompt, lang), attempt === 0 ? onProgress : () => {}, estimatedChars, { temperature: QUESTION_TEMPERATURE });
          const qs = (Array.isArray(result.questions) ? result.questions : [])
            .map(q => (typeof q === 'string' ? q.trim() : q))
            .filter(filterQuestion)
            .slice(0, count);
          if (qs.length > best.length) best = qs;
        } catch (e) {
          console.warn(`질문 생성 시도 ${attempt + 1} 실패:`, e.message);
        }
        if (best.length < count) {
          console.warn(`질문 ${count}개 중 ${best.length}개만 생성 (시도 ${attempt + 1}/3)`);
          // 모델 로딩·교체 중 실패가 연달아 나지 않도록 간격을 둠
          if (attempt < 2) await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
        }
      }
      return best;
    };

    // 패스 1: 공통 2개 (각각 따로 생성 — 한 번에 2개 요청 시 1개만 반환되는 모델 오류 방지)
    sendProgress(0, '공통 질문 생성 중...');
    const [commonQ1, commonQ2] = await Promise.all([
      generateQuestions(
        buildCommonPrompt1(department, jobRole, companyType, experienceLevel, style),
        1, () => {}, 80,
      ),
      generateQuestions(
        buildCommonPrompt2(department, jobRole, companyType, experienceLevel, style),
        1, (p) => sendProgress(Math.floor(p * 0.25), '공통 질문 생성 중...'), 80,
      ),
    ]);
    const commonQs = [...commonQ1, ...commonQ2];

    let taggedQs = []; // { q, cat } 형태로 카테고리 함께 추적

    if (interviewType === 'resume' || interviewType === 'mixed') {
      // 패스 2: 직무 3개 (25~65%)
      sendProgress(25, '직무 질문 생성 중...');
      const jobQs = await generateQuestions(
        buildJobPrompt(department, jobRole, companyType, experienceLevel, style, interviewType, knowledgeEntries, commonQs),
        3, (p) => sendProgress(25 + Math.floor(p * 0.40), '직무 질문 생성 중...'), 220,
      );

      // 패스 3: 이력서 2개 (65~95%)
      let resumeQs = [];
      if (hasResume) {
        sendProgress(65, '이력서 질문 생성 중...');
        resumeQs = await generateQuestions(
          buildResumePrompt(department, jobRole, companyType, experienceLevel, style, resumeText, [...commonQs, ...jobQs]),
          2, (p) => sendProgress(65 + Math.floor(p * 0.30), '이력서 질문 생성 중...'), 150,
        );
      }

      taggedQs = [
        ...commonQs.map(q => ({ q: typeof q === 'string' ? q.trim() : q, cat: '공통' })),
        ...jobQs.map(q => ({ q: typeof q === 'string' ? q.trim() : q, cat: '직무' })),
        ...resumeQs.map(q => ({ q: typeof q === 'string' ? q.trim() : q, cat: '이력서' })),
      ];

    } else {
      // 패스 2: 직무/인성 3개 (25~95%)
      sendProgress(25, '직무 질문 생성 중...');
      const jobQs = await generateQuestions(
        buildJobPrompt(department, jobRole, companyType, experienceLevel, style, interviewType, knowledgeEntries, commonQs),
        3, (p) => sendProgress(25 + Math.floor(p * 0.70), '직무 질문 생성 중...'), 220,
      );
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

// 꼬리질문 품질 검사 — 질문 생성과 같은 문자 규칙 + 물음표로 끝나는 한 문장
function isUsableFollowup(text, answer, lang = 'ko') {
  if (typeof text !== 'string') return false;
  const t = text.trim();
  if (t.length < 5 || t.length > (lang === 'en' ? 250 : 150)) return false;
  if (!t.endsWith('?')) return false;
  if (lang === 'en' && /[가-힣]/.test(t)) return false;   // 영어 면접에 한국어 혼입
  if (/[^ -~가-힣ㄱ-ㆎ·‘’“”…–—]/.test(t)) return false; // 한자·베트남어·키릴·아랍·힌디 등 혼입
  if (/[가-힣][A-Za-z]/.test(t)) return false;            // "기술ize" 같은 깨진 단어
  if (answer && answer.includes(t.replace(/\?$/, ''))) return false; // 지원자 답변을 그대로 되풀이
  return true;
}

// [llama] 면접 중 꼬리질문 생성
app.post('/generate/followup', async (req, res) => {
  const { question = '', answer = '', department = '', jobRole = '' } = req.body;
  const style = resolveStyle(req.body.style || 'friendly');
  const lang = interviewLanguage(req.body.companyType);
  let persona = STYLE_PERSONAS[style] || STYLE_PERSONAS.friendly;
  const deptRole = DEPT_PROFILES[department]?.roles?.[style];
  if (deptRole) persona = { ...persona, role: deptRole };

  const context = [jobRole, department].filter(Boolean).join(' / ');
  const followupPrompt =
    `면접관(${persona.role})이 지원자의 답변에 심화 꼬리질문을 합니다. ${lang === 'en' ? '이 면접은 영어로 진행되므로 꼬리질문은 자연스러운 비즈니스 영어로만 작성하세요(한국어 금지).' : '반드시 한국어로만 답변하세요.'}\n\n` +
    (context ? `직무: ${context}\n` : '') +
    `질문: ${question}\n` +
    `답변: ${answer}\n\n` +
    `답변에서 언급된 구체적인 내용을 바탕으로 꼬리질문 1개를 작성하세요. 짧고 날카롭게, 물음표로 끝내세요.\n` +
    `{"followup":"꼬리질문"}`;

  // 생성 오류와 품질 검사 탈락(외국 문자·깨진 단어·물음표 없음·답변 되풀이)을 모두 실패로 보고 간격을 두고 재생성
  // 모두 실패하면 꼬리질문 없이 다음 질문으로 넘어감
  try {
    const followup = await withRetry('followup', async () => {
      const genResult = await callMLX(llamaClient, LLAMA_MODEL, followupPrompt, { allowTextFallback: true, temperature: FOLLOWUP_TEMPERATURE });
      const raw = typeof genResult.followup === 'string' ? genResult.followup : '';
      if (!raw || isContaminated(raw)) throw new Error('유효한 꼬리질문 없음');
      const candidate = sanitizeFollowup(raw);
      if (!isUsableFollowup(candidate, answer, lang)) throw new Error(`품질 검사 탈락: ${candidate.slice(0, 80)}`);
      return candidate;
    });
    res.json({ followup });
  } catch (e) {
    console.error('꼬리질문 생성 오류:', e.message);
    res.json({ followup: null });
  }
});

// [gemma] 이력서-학과 관련성 판단
// 불일치 시 프론트엔드가 진행을 막으므로, 전혀 다른 분야일 때만 불일치로 판단하도록 관대하게 묻는다
// (학과 그룹 분류 방식은 전기과↔전자공학과처럼 인접 분야를 잘못 차단해 사용하지 않음)
app.post('/generate/relevance', async (req, res) => {
  const { resumeText = '', coverText = '', department = '' } = req.body;
  if (!department) return res.json({ isRelevant: true, reason: null });

  const combined = [
    resumeText ? `[이력서]\n${resumeText.trim().substring(0, 2000)}` : '',
    coverText  ? `[자기소개서]\n${coverText.trim().substring(0, 1000)}` : '',
  ].filter(Boolean).join('\n\n');
  if (!combined) return res.json({ isRelevant: true, reason: null });

  const prompt =
    `지원자가 "${department}" 학과로 면접 연습을 하려고 합니다. 아래 이력서·자기소개서가 이 학과와 관련이 있는지 판단하세요.\n\n` +
    `${combined}\n\n` +
    `[판단 기준 — 위에서부터 순서대로 적용]\n` +
    `1. 이 학과의 전공 지식, 관련 자격증, 수업·실습·프로젝트, 관련 직무 경력, 독학 중인 관련 기술이 하나라도 있으면 true.\n` +
    `2. 인접 분야도 true. 예: 전자공학과와 전기과, 컴퓨터소프트웨어과와 정보통신과.\n` +
    `3. 성격·태도만 적혀 있고 전공·경력·기술이 전혀 없어 분야를 알 수 없으면 true.\n` +
    `4. 전공·경력·자격증이 적혀 있는데 모두 이 학과와 무관한 분야라면 false. 내용이 짧아도 분야가 분명하면 false.\n` +
    `   예: 미용 경력만 있는 이력서로 전기과 지원 → false, 조리 경력만 있는 이력서로 컴퓨터소프트웨어과 지원 → false.\n\n` +
    `반드시 아래 JSON 형식으로만 응답:\n` +
    `{"isRelevant":true 또는 false,"field":"이력서의 주된 분야","reason":"판단 이유 한 줄"}`;

  try {
    const parsed = await withRetry('relevance', () => callMLX(gemmaClient, GEMMA_MODEL, prompt));
    const isRelevant = parsed.isRelevant !== false;
    console.log(`[relevance] 학과: ${department} | 이력서 분야: ${parsed.field} | 관련: ${isRelevant} | ${parsed.reason}`);
    res.json({
      isRelevant,
      reason: isRelevant
        ? null
        : `선택한 학과(${department})와 관련 없는 이력서입니다. 이력서는 ${parsed.field || '다른 분야'} 관련 내용으로 구성되어 있습니다.`,
    });
  } catch (e) {
    console.error('관련성 검사 오류:', e.message);
    res.json({ isRelevant: true, reason: null });
  }
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
    const parsed = await withRetry('summary', async () => {
      const raw = await streamRaw(gemmaClient, GEMMA_MODEL, prompt, (p) => send({ type: 'progress', progress: p }), 600);
      return JSON.parse(cleanMarkdownJSON(raw));
    });
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
  const lang = interviewLanguage(req.body.companyType);
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

  // 영어 면접: 피드백은 한국어로 쓰되 개선 답변 예시는 영어로, 영어 표현력도 평가에 반영
  const reportPrompt = lang !== 'en' ? prompt : prompt
    .replace('절대 영어를 사용하지 마세요. 모든 응답은 반드시 한국어로 작성하세요.', '피드백은 한국어로 작성하되, improvedAnswer만 영어로 작성하세요.')
    .replace('모든 문자열 값은 반드시 한국어', 'improvedAnswer를 제외한 모든 문자열 값은 반드시 한국어')
    + `\n\n[영어 면접 추가 규칙]\n- 이 면접은 외국계 기업 영어 면접이며 질문과 답변이 영어입니다.\n- improvedAnswer는 지원자가 실제로 말할 수 있는 자연스러운 영어 답변(1인칭, 2~3문장)으로 작성.\n- 영어 표현력(문법·어휘·유창성)을 delivery 점수와 comment에 반영하고, 어색한 영어 표현이 있으면 comment에서 구체적으로 짚어줄 것.`;

  try {
    // 1단계: gemma로 리포트 본문 생성 (0~75%)
    const ESTIMATED_CHARS = Math.max(2000, qCount * 600);
    // JSON이 깨졌거나 핵심 점수가 빠진 응답도 실패로 보고 다시 생성
    const parsed = await withRetry('report', async (attempt) => {
      if (attempt > 1) send({ type: 'progress', progress: 0, step: `리포트 다시 작성 중... (${attempt}/3)` });
      const raw = await streamRaw(
        gemmaClient, GEMMA_MODEL,
        reportPrompt,
        (p) => send({ type: 'progress', progress: Math.floor(p * 0.75) }),
        ESTIMATED_CHARS,
        { max_tokens: qCount * 350 + 1000 },
      );
      const result = JSON.parse(cleanMarkdownJSON(raw));
      if (typeof result.overallScore !== 'number' || !result.scores) throw new Error('리포트 필수 항목 누락');
      return result;
    });

    if (!Array.isArray(parsed.questionFeedback)) parsed.questionFeedback = [];
    while (parsed.questionFeedback.length < qCount) {
      parsed.questionFeedback.push({ appropriateness: 0, improvedAnswer: '', comment: '' });
    }

    // 2단계: llama로 꼬리질문 병렬 생성 (75~95%)
    send({ type: 'progress', progress: 75, step: '꼬리질문 생성 중...' });
    const allFollowUps = await generateReportFollowUps(questions, answers, department, req.body.jobRole || '', followupSet, lang);
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
