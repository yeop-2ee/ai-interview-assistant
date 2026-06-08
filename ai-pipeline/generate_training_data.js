import 'dotenv/config';
import OpenAI from 'openai';
import fs from 'fs';

// ── Google Gemini API로 데이터 생성 ──────────────────────────────────────
const generator = new OpenAI({
  apiKey: process.env.GOOGLE_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});
const GENERATOR_MODEL = process.env.GENERATOR_MODEL || 'gemini-2.0-flash';
const DELAY_MS = Number(process.env.DELAY_MS) || 0;

// ── aiServer.js와 동일한 상수 ─────────────────────────────────────────────
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

const COMPANY_TYPE_MAP = {
  startup:  '스타트업 (빠른 적응·자기주도·폭넓은 역할 중시)',
  smb:      '중소기업 (실무 즉시 투입·다재다능·실용성 중시)',
  midsize:  '중견기업 (성장성과 안정성 균형·체계적 직무역량 중시)',
  large:    '대기업·그룹사 (직무 전문성·체계·협업 프로세스 중시)',
  public:   '공기업·공공기관 (규정 준수·공익 마인드·윤리의식 중시)',
  foreign:  '외국계 기업 (글로벌 역량·영어 소통·다문화 적응력 중시)',
};

const COMPANY_CONTEXT = {
  startup:  '스타트업 맥락을 질문에 반드시 반영하세요: 인력·시간·예산이 부족한 상황, 혼자 넓은 영역을 담당해야 하는 상황, 완벽한 설계보다 빠른 출시가 우선되는 상황, 기술 부채와 속도 사이의 트레이드오프. 질문에 이런 현실적 압박 상황을 구체적으로 포함하세요.',
  smb:      '중소기업 맥락을 질문에 반영하세요: 제한된 리소스 안에서 실용적 해결책, 즉시 투입 가능한 실무 역량, 체계보다 실행력이 중요한 환경.',
  midsize:  '중견기업 맥락을 질문에 반영하세요: 성장 중인 조직에서 체계와 속도의 균형, 기존 레거시와 새 기술 사이의 조율, 확장성을 고려한 설계.',
  large:    '대기업 맥락을 질문에 반영하세요: 여러 팀·부서 간 협업과 조율, 대규모 트래픽·데이터 처리, 표준화된 프로세스 안에서의 기술 결정.',
  public:   '공공기관 맥락을 질문에 반영하세요: 규정·보안·안정성 최우선, 민감 데이터 처리, 변경에 신중해야 하는 환경.',
  foreign:  '외국계 기업 맥락을 질문에 반영하세요: 다국적 팀과의 협업, 글로벌 스탠다드와 로컬 요구사항의 조율, 영어 커뮤니케이션.',
};

const EXPERIENCE_MAP = {
  newcomer: '신입 (0년차) — 기초 역량·학습 의지·성장 가능성 위주 질문, 깊은 실무 경험 전제 금지',
  junior:   '주니어 (1~3년차) — 실무 경험·문제 해결 방식·기초 설계 역량 위주 질문',
  mid:      '미드레벨 (3~5년차) — 주도적 프로젝트 경험·기술 깊이·팀 협업 방식 위주 질문',
  senior:   '시니어 (5년 이상) — 리더십·아키텍처 설계·기술 의사결정·멘토링 역량 위주 질문',
};

// ── 학과별 직무군 & 주제 키워드 ───────────────────────────────────────────
const DEPT_JOB_ROLES = {
  '컴퓨터소프트웨어과': ['', '프론트엔드 개발자', '백엔드 개발자', 'AI 엔지니어'],
  '전자공학과':         ['', '회로설계 엔지니어', '임베디드 시스템 엔지니어', '반도체 공정 엔지니어'],
  '정보통신과':         ['', '네트워크 엔지니어', '통신시스템 엔지니어', 'IoT 엔지니어'],
  '전기과':             ['', '전력시스템 엔지니어', '제어 엔지니어', '전기설비 엔지니어'],
};

const DEPT_TOPIC_KEYWORDS = {
  '컴퓨터소프트웨어과': {
    '':                ['자료구조', '알고리즘', '운영체제', '네트워크', '데이터베이스', '객체지향', '디자인패턴', '버전관리', '테스트'],
    '프론트엔드 개발자': ['React', 'Vue', '상태관리', '렌더링 최적화', 'CSS', '웹 접근성', 'TypeScript', '번들러', 'SEO', '크로스브라우저'],
    '백엔드 개발자':    ['REST API', '데이터베이스 설계', '캐싱', '인증/인가', '메시지 큐', '마이크로서비스', 'SQL 최적화', '트랜잭션', '보안'],
    'AI 엔지니어':     ['모델 학습', '데이터 전처리', '파인튜닝', '추론 최적화', '벡터 DB', 'RAG', 'MLOps', '과적합 방지', '평가지표'],
  },
  '전자공학과': {
    '':                         ['아날로그 회로', '디지털 회로', '신호처리', '반도체 소자', '전자기학', '회로 시뮬레이션', '센서', '전력전자'],
    '회로설계 엔지니어':          ['PCB 설계', '아날로그 회로 설계', '노이즈 대책', 'SPICE 시뮬레이션', '임피던스 매칭', '전원 설계', 'EMI/EMC'],
    '임베디드 시스템 엔지니어':   ['마이크로컨트롤러', '펌웨어 개발', 'RTOS', '통신 프로토콜(I2C/SPI/UART)', '저전력 설계', '인터럽트 처리', '디버깅'],
    '반도체 공정 엔지니어':       ['웨이퍼 공정', '포토리소그래피', '식각 공정', '박막 증착', '수율 분석', '반도체 검사', '클린룸 환경'],
  },
  '정보통신과': {
    '':                  ['네트워크 프로토콜', '데이터통신', '무선통신', '신호처리', '정보보안', '통신망 설계', 'OSI 7계층'],
    '네트워크 엔지니어':   ['라우팅/스위칭', 'TCP/IP', '네트워크 보안', '방화벽 설정', 'VPN', '트래픽 분석', '망 설계'],
    '통신시스템 엔지니어': ['5G/이동통신', '기지국 운용', '주파수 자원관리', '위성통신', 'VoIP', '광통신', '변복조 기술'],
    'IoT 엔지니어':       ['센서 네트워크', 'MQTT/CoAP', '저전력 통신(LoRa/Zigbee)', '엣지 컴퓨팅', '디바이스 연동', '클라우드 연계', '보안 인증'],
  },
  '전기과': {
    '':                  ['전기회로', '전력공학', '제어공학', '전기기기', '전력전자', '전기안전', '신재생에너지'],
    '전력시스템 엔지니어': ['전력계통 운영', '변전설비', '배전 시스템', '부하 분석', '정전 대응', '전력 품질', '신재생에너지 연계'],
    '제어 엔지니어':      ['PLC 프로그래밍', '자동제어 이론', 'PID 제어', 'SCADA', '모터 제어', '센서·액추에이터', '공정 자동화'],
    '전기설비 엔지니어':   ['수변전 설비 설계', '배전반 설계', '전기안전 점검', '접지 설계', '조명·동력 설계', '비상발전 시스템', '전기설비 유지보수'],
  },
};

function getRandomKeyword(department, jobRole) {
  const deptKeywords = DEPT_TOPIC_KEYWORDS[department] || DEPT_TOPIC_KEYWORDS['컴퓨터소프트웨어과'];
  const keywords = deptKeywords[jobRole] || deptKeywords[''];
  return keywords[Math.floor(Math.random() * keywords.length)];
}

// 메인 질문 데이터 — gemma3가 프롬프트로 메인 질문을 전담하므로 기존 학과만 유지 (추가 생성 불필요)
const DEPARTMENTS = ['컴퓨터소프트웨어과'];
// 꼬리질문 데이터 — interview-llama가 전담하므로 신규 학과 포함 전체 대상으로 생성
const FOLLOWUP_DEPARTMENTS = ['컴퓨터소프트웨어과', '전자공학과', '정보통신과', '전기과'];
const COMPANY_TYPES = ['startup', 'smb', 'midsize', 'large', 'public', 'foreign'];
const LEVELS        = ['newcomer', 'junior', 'mid', 'senior'];
const STYLES        = ['friendly', 'pressure', 'professor', 'practical'];
const TYPES         = ['major', 'personality'];

// 실제 면접에서 자주 나오는 "짧고 직접적인" 질문 유형 — 시나리오형 위주였던 데이터셋의 균형을 맞추기 위해 추가
const MAJOR_DIRECT_TYPES = [
  (keyword, roleLabel) => `"${keyword}"의 핵심 개념·동작 원리·장단점을 짧고 명확하게 설명해달라는 단답형 지식 확인 질문 (예: "OO가 무엇인지 설명해주실 수 있나요?", "OO와 OO의 차이가 무엇인가요?")`,
  (keyword, roleLabel) => `${roleLabel} 실무에서 자주 비교되는 두 기술·도구·자료구조·개념 중 하나를 골라 차이를 짧게 설명해달라는 비교형 질문 (예: "큐와 스택의 차이가 무엇인가요?", "REST와 GraphQL의 차이가 무엇인가요?")`,
  (keyword, roleLabel) => `이력서·포트폴리오에 적힌 프로젝트나 기능 중 하나를 콕 짚어 "지금까지 어떤 기능을 만들어봤는지", "그걸 어떤 식으로 구현했는지" 구체적으로 설명을 요구하는 경험 구체화형 질문`,
  (keyword, roleLabel) => `생성형 AI(ChatGPT, Claude, Cursor 등)를 실무·학습에 어떻게 활용해봤는지, 혹은 AI에게 특정 작업을 어떻게 단계적으로 지시하고 결과를 검증할지 묻는 질문`,
  (keyword, roleLabel) => `${roleLabel} 분야가 앞으로(예: 10년 뒤) 어떻게 변화할 것 같은지 본인의 생각을 짧게 묻는 미래 전망형 질문`,
];
const PERSONALITY_DIRECT_TYPES = [
  () => `간단한 자기소개를 요청하는 질문`,
  () => `"성적관리 프로그램을 만든다면 어떻게 설계할 것인지 처음부터 말해달라"처럼, 익숙한 주제를 예로 들어 문제 해결·설계 사고 과정을 처음부터 풀어서 설명해보라는 질문`,
  () => `지금까지 진행한 프로젝트나 만들어본 기능 중 기억에 남는 것이 무엇인지 묻는 경험 구체화형 질문`,
  () => `앞으로 어떤 개발자가 되고 싶은지, 혹은 10년 뒤 개발자의 업무 환경이 어떻게 달라질 것 같은지 본인의 생각을 묻는 질문`,
  () => `생성형 AI 도구(ChatGPT, Claude, Cursor 등)를 사용해본 경험이 있는지, 무엇을 어떻게 활용했는지 묻는 질문`,
];
function pickDirectType(pool, keyword, roleLabel) {
  const fn = pool[Math.floor(Math.random() * pool.length)];
  return fn(keyword, roleLabel);
}

// ── 질문 생성 프롬프트 빌더 (기존) ───────────────────────────────────────
function buildBaseContext(department, jobRole, companyType, experienceLevel, style) {
  return {
    persona:        STYLE_PERSONAS[style] || STYLE_PERSONAS.friendly,
    level:          EXPERIENCE_MAP[experienceLevel] || experienceLevel,
    companyLabel:   COMPANY_TYPE_MAP[companyType] || companyType,
    companyContext: COMPANY_CONTEXT[companyType] || '',
  };
}

function buildJobPrompt(department, jobRole, companyType, experienceLevel, style, interviewType) {
  const { persona, level, companyLabel, companyContext } = buildBaseContext(department, jobRole, companyType, experienceLevel, style);
  const target    = jobRole ? `${department} 학과 / ${jobRole}` : department;
  const roleLabel = jobRole || department;
  const keyword   = getRandomKeyword(department, jobRole);
  const directType = pickDirectType(
    interviewType === 'personality' ? PERSONALITY_DIRECT_TYPES : MAJOR_DIRECT_TYPES,
    keyword, roleLabel
  );

  let p = `당신은 한국어로만 대답하는 채용 전문 면접관입니다.\n`;
  p += `면접관 역할: ${persona.role}\n`;
  p += `지원자 정보: ${target}\n`;
  p += `회사 유형: ${companyLabel}\n`;
  p += `지원자 수준: ${level}\n`;
  p += `면접관 성격: ${persona.tone} — ${persona.desc}\n\n`;

  if (interviewType === 'personality') {
    const depthGuide = experienceLevel === 'newcomer'
      ? '신입이므로: 학교·팀 프로젝트 경험 기반으로 질문하세요. "주도했다" 대신 "의견을 냈다", "제안해봤다" 수준의 경험을 묻는 형식.'
      : experienceLevel === 'junior'
      ? '주니어이므로: 실무에서 실제로 겪은 갈등·압박 경험을 묻되, 팀 내 주도보다 참여·기여 관점에서 질문하세요.'
      : experienceLevel === 'mid'
      ? '미드레벨이므로: 팀 내 결정을 주도하거나 갈등을 조율한 경험, 일정·품질 사이의 트레이드오프 판단 경험을 구체적으로 묻는 형식.'
      : '시니어이므로: 조직 방향 결정, 팀원 설득, 장기적 관리 등 리더십 관점의 인성 경험을 묻는 형식.';

    p += `${roleLabel} 직무 면접에서 지원자의 실제 업무 태도와 협업 방식을 검증하는 인성 질문 3개를 작성하세요.\n`;
    if (companyContext) p += `[회사 맥락] ${companyContext}\n`;
    p += `${depthGuide}\n\n`;
    p += `질문 1 — ${directType}. 상황 설정 없이 곧장 묻는 짧고 직접적인 질문으로 작성하세요.\n`;
    p += `질문 2 — 예상치 못한 장애·일정 압박·리소스 부족 상황: 실제로 어떻게 대응했는지 묻는 질문.`;
    if (companyContext) p += ` 위에서 제시한 [회사 맥락]의 현실적 압박 상황을 질문 안에 반영하세요.`;
    p += `\n`;
    p += `질문 3 — 본인이 결정을 주도했거나 방향을 바꾼 경험: 그 판단 근거와 결과를 묻는 질문.\n\n`;
    p += `작성 규칙:\n`;
    p += `- 각 질문은 하나의 완결된 문장, 물음표(?)는 끝에 하나만.\n`;
    p += `- 각 질문은 한 문장, 70자 이내로 작성하세요.\n`;
    p += `- 질문 2, 3: 상황 묘사는 짧은 구(예: '성능 저하 발생 시', '기술 부채 상황에서')로만 — 긴 배경 설명 절대 금지. 추상적 질문 금지, 반드시 구체적인 상황을 먼저 설정하고 그 상황에서의 대응을 묻는 형식.\n`;
    p += `  좋은 예: "DB 쿼리 성능 저하 시 원인을 어떻게 파악하셨나요?" / 나쁜 예: "배포 후 API가 2배 느려지고 레거시와 신규 기능이 얽혀있는 상황에서 어떻게..." (금지)\n`;
    p += `- 질문 1: 시나리오·상황 설정 없이 곧장 묻는 짧고 직접적인 질문. "~란 무엇인가요", "~해보신 적 있나요" 같은 단도직입적 어투도 허용됩니다.\n`;
    p += `- 어미: "~셨나요?", "~있으신가요?", "~하셨습니까?", "~무엇인가요?", "~해주실 수 있나요?" 등 자연스러운 존댓말. "~이에요?", "~어떤가요?" 금지.\n`;
    p += `- 면접관 성격(${persona.tone}) 어투 유지.\n`;
    p += `- 반드시 아래 JSON 형식으로만 응답:\n`;
    p += `{"questions":["인성질문1","인성질문2","인성질문3"]}`;
  } else {
    const depthGuide = experienceLevel === 'newcomer'
      ? '신입이므로: 개념을 실제 상황에 어떻게 적용할지, 선택의 이유와 트레이드오프를 물으세요. 깊은 실무 경험 전제 금지.'
      : experienceLevel === 'junior'
      ? '주니어이므로: 실무에서 실제로 맞닥뜨린 문제, 해결 과정, 선택 이유를 구체적으로 물으세요.'
      : experienceLevel === 'mid'
      ? '미드레벨이므로: 설계 결정 배경, 최적화 과정, 장애 대응, 트레이드오프를 물으세요.'
      : '시니어이므로: 시스템 설계 의사결정, 조직 기술 방향 제시, 팀 리딩·멘토링, 복잡한 선택 경험을 물으세요.';

    p += `${roleLabel} 직무의 핵심 역량을 검증하는 면접 질문 3개를 작성하세요.\n`;
    if (companyContext) p += `[회사 맥락] ${companyContext}\n`;
    p += `\n${depthGuide}\n\n`;
    p += `이번 질문에서 "${keyword}" 관련 역량을 반드시 한 개 이상 포함하세요.\n\n`;
    p += `질문 1 — ${directType}. 시나리오·상황 설정 없이 곧장 묻는 짧고 직접적인 질문으로 작성하세요.\n`;
    p += `질문 2 — 직무상 문제 상황 대응: ${roleLabel}에서 실제로 발생하는 구체적 문제 상황을 제시하고 어떻게 접근했는지 판단력을 검증.\n`;
    p += `질문 3 — 트레이드오프 판단: 두 가지 방식 중 하나를 선택해야 하는 상황을 제시하고, 어떤 기준으로 결정하겠는지 사고 과정을 보는 질문.\n`;
    if (companyContext) p += `위에서 제시한 [회사 맥락]의 현실적 압박 상황을 질문 2 또는 3에 구체적으로 반영하세요.\n`;
    p += `\n작성 규칙:\n`;
    p += `- 각 질문은 하나의 완결된 문장, 물음표(?)는 끝에 하나만.\n`;
    p += `- 각 질문은 한 문장, 70자 이내로 작성하세요.\n`;
    p += `- 질문 2, 3: 상황을 먼저 제시하고 그 상황에서의 판단·경험을 묻는 형식. 상황 묘사는 짧은 구(예: '성능 저하 발생 시', '기술 부채 상황에서')로만 — 긴 배경 설명 절대 금지.\n`;
    p += `  좋은 예: "DB 쿼리 성능 저하 시 원인을 어떻게 파악하셨나요?" / 나쁜 예: "배포 후 API가 2배 느려지고 레거시와 신규 기능이 얽혀있는 상황에서 어떻게..." (금지)\n`;
    p += `- 질문 1: 시나리오·상황 설정 없이 곧장 묻는 짧고 직접적인 질문. "~란 무엇인가요", "~의 차이가 무엇인가요", "~해보신 적 있나요" 같은 단도직입적 어투도 허용됩니다.\n`;
    p += `- 어미: "~셨나요?", "~있으신가요?", "~하시겠습니까?", "~하셨습니까?", "~무엇인가요?", "~해주실 수 있나요?" 등 자연스러운 존댓말. "~이에요?", "~어떤가요?" 금지.\n`;
    p += `- 면접관 성격(${persona.tone}) 어투 유지.\n`;
    p += `- 반드시 아래 JSON 형식으로만 응답:\n`;
    p += `{"questions":["직무질문1","직무질문2","직무질문3"]}`;
  }

  return p;
}

// ── 꼬리질문 학습 데이터 생성 (신규) ─────────────────────────────────────
// Gemini에게 질문+답변+꼬리질문 triplet을 한 번에 생성 요청
async function generateFollowupTriplet(department, jobRole, level, style) {
  const persona = STYLE_PERSONAS[style] || STYLE_PERSONAS.friendly;
  const levelLabel = EXPERIENCE_MAP[level] || level;
  const keyword = getRandomKeyword(department, jobRole);
  const context = jobRole ? `${department} / ${jobRole}` : department;

  const prompt =
    `한국어 면접 대화 데이터를 생성하세요.\n\n` +
    `면접관: ${persona.role} (${persona.tone})\n` +
    `학과/직무: ${context}\n` +
    `지원자 수준: ${levelLabel}\n` +
    `주제 키워드: ${keyword}\n\n` +
    `[followup 작성 규칙]\n` +
    `- answer 속에 등장하는 ${keyword} 관련 구체적인 단어·수치·경험을 정확히 짚어 한 단계 더 깊이 파고드는 질문일 것.\n` +
    `- 가능하면 "~라고 하셨는데," 처럼 답변 내용을 짧게 되짚는 자연스러운 연결 표현으로 시작한 뒤 핵심 질문을 이을 것 (전체 길이는 짧고 날카롭게).\n` +
    `- 실제로 쓰이지 않는 어색한 조어·표현 금지, 자연스러운 한국어 존댓말만 사용.\n\n` +
    `아래 JSON 형식으로만 응답하세요:\n` +
    `{"question":"면접 질문 (한 문장, 물음표로 끝)","answer":"지원자의 현실적인 답변 (3~5문장, ${keyword} 관련 구체적 경험 포함)","followup":"위 규칙을 따른 꼬리질문 (한 문장, 물음표로 끝)"}`;

  const res = await generator.chat.completions.create({
    model: GENERATOR_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.9,
  });

  const raw = res.choices[0].message.content;
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(stripped);

  if (!parsed.question || !parsed.answer || !parsed.followup) throw new Error('불완전한 triplet');
  if (!parsed.question.trim().endsWith('?')) throw new Error('question이 물음표로 끝나지 않음');
  if (!parsed.followup.trim().endsWith('?')) throw new Error('followup이 물음표로 끝나지 않음');
  if (parsed.answer.trim().length < 30) throw new Error('answer가 너무 짧음');

  return { question: parsed.question.trim(), answer: parsed.answer.trim(), followup: parsed.followup.trim() };
}

// aiServer.js의 inference 프롬프트와 동일한 형식으로 학습 데이터 포맷
function formatFollowupTrainLine(department, jobRole, style, triplet) {
  const persona = STYLE_PERSONAS[style] || STYLE_PERSONAS.friendly;
  const context = [jobRole, department].filter(Boolean).join(' / ');

  const userPrompt =
    `면접관(${persona.role})이 지원자의 답변을 듣고 자연스럽게 이어지는 꼬리질문을 던집니다. 반드시 한국어로만 답변하세요.\n\n` +
    (context ? `직무: ${context}\n` : '') +
    `질문: ${triplet.question}\n` +
    `답변: ${triplet.answer}\n\n` +
    `[작성 규칙]\n` +
    `- 답변 속 ${context || '해당 분야'}의 구체적인 단어·기술·경험·수치를 정확히 짚어 그 부분을 한 단계 더 깊이 파고드세요. 답변 내용과 무관한 일반적·뻔한 질문 금지.\n` +
    `- 같은 표현이나 소재를 반복하지 말고, 답변에서 아직 다루지 않은 새로운 디테일에 집중하세요.\n` +
    `- 단답형으로 끝나지 않게: 가능하면 "~라고 하셨는데," "~말씀에서 ~부분이 인상 깊은데," 처럼 답변 내용을 짧게 되짚는 자연스러운 연결 표현으로 시작한 뒤 핵심 질문을 이으세요. 단, 전체적으로는 짧고 날카롭게 유지하세요.\n` +
    `- 실제로 쓰이지 않는 어색한 조어나 존재하지 않는 표현 사용 금지 — 자연스러운 한국어 존댓말만 사용하세요.\n` +
    `- 한 문장, 물음표(?) 하나로 끝내세요.\n` +
    `{"followup":"꼬리질문"}`;

  const assistantContent = JSON.stringify({ followup: triplet.followup });

  return JSON.stringify({
    messages: [
      { role: 'user', content: userPrompt },
      { role: 'assistant', content: assistantContent },
    ],
  });
}

// ── 유효성 검사 ───────────────────────────────────────────────────────────
function validate(raw) {
  try {
    const parsed = JSON.parse(raw);
    const qs = parsed.questions;
    if (!Array.isArray(qs) || qs.length < 3) return false;
    return qs.every(q =>
      typeof q === 'string' &&
      q.trim().length > 15 &&
      q.trim().endsWith('?')
    );
  } catch {
    return false;
  }
}

async function generateOne(prompt, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await generator.chat.completions.create({
        model: GENERATOR_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.85,
      });
      const raw = res.choices[0].message.content;
      const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
      if (!validate(stripped)) throw new Error('유효성 검사 실패');
      return JSON.stringify(JSON.parse(stripped));
    } catch (e) {
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, 1500 * (i + 1)));
    }
  }
}

function appendLine(line) {
  if (Math.random() < 0.1) {
    fs.appendFileSync('data/eval.jsonl', line + '\n', 'utf8');
    return 'eval';
  } else {
    fs.appendFileSync('data/train.jsonl', line + '\n', 'utf8');
    return 'train';
  }
}

// ── 메인 ─────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync('data')) fs.mkdirSync('data');

  // ── 1단계: 질문 생성 (기존 로직) ─────────────────────────────────────
  const combinations = [];
  for (const dept of DEPARTMENTS) {
    for (const jobRole of (DEPT_JOB_ROLES[dept] || [''])) {
      for (const company of COMPANY_TYPES) {
        for (const level of LEVELS) {
          for (const type of TYPES) {
            for (const style of STYLES) {
              combinations.push({ dept, jobRole, company, level, style, type });
            }
          }
        }
      }
    }
  }

  for (let i = combinations.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combinations[i], combinations[j]] = [combinations[j], combinations[i]];
  }

  const doneFile = 'data/done.txt';
  const done = new Set(
    fs.existsSync(doneFile)
      ? fs.readFileSync(doneFile, 'utf8').split('\n').filter(Boolean)
      : []
  );
  const remaining = combinations.filter(
    ({ dept, jobRole, company, level, style, type }) =>
      !done.has(`${dept}|${jobRole}|${company}|${level}|${style}|${type}`)
  );

  console.log(`\n[1단계] 면접 질문 생성`);
  console.log(`총 ${combinations.length}개 조합 중 ${done.size}개 완료, ${remaining.length}개 남음\n`);

  let qSuccess = 0, qFail = 0;

  for (let i = 0; i < remaining.length; i++) {
    const { dept, jobRole, company, level, style, type } = remaining[i];

    try {
      const prompt  = buildJobPrompt(dept, jobRole, company, level, style, type);
      const content = await generateOne(prompt);

      const line = JSON.stringify({
        messages: [
          { role: 'user',      content: prompt  },
          { role: 'assistant', content: content },
        ],
      });

      appendLine(line);
      fs.appendFileSync(doneFile, `${dept}|${jobRole}|${company}|${level}|${style}|${type}\n`, 'utf8');
      qSuccess++;
    } catch (e) {
      qFail++;
      console.error(`  ✗ [${jobRole || '직무없음'}/${company}/${level}/${style}/${type}] ${e.message}`);
    }

    if ((i + 1) % 20 === 0 || i + 1 === remaining.length) {
      const pct = (((i + 1) / remaining.length) * 100).toFixed(1);
      console.log(`[${pct}%] ${i + 1}/${remaining.length} — 성공 ${qSuccess} / 실패 ${qFail}`);
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  // ── 2단계: 꼬리질문 학습 데이터 생성 ──────────────────────────────────
  // 학과 4개 × 직무군 4개 × 스타일 4개 × 레벨 4개 × 5 반복
  const FOLLOWUP_REPEATS = 5;
  const followupCombos = [];
  for (const dept of FOLLOWUP_DEPARTMENTS) {
    for (const jobRole of (DEPT_JOB_ROLES[dept] || [''])) {
      for (const style of STYLES) {
        for (const level of LEVELS) {
          for (let r = 0; r < FOLLOWUP_REPEATS; r++) {
            followupCombos.push({ dept, jobRole, style, level, r });
          }
        }
      }
    }
  }

  for (let i = followupCombos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [followupCombos[i], followupCombos[j]] = [followupCombos[j], followupCombos[i]];
  }

  // 인덱스가 아닌 조합 내용 기반 키로 추적 (학과 추가로 조합 구조가 바뀌어도 안전)
  const comboKey = ({ dept, jobRole, style, level, r }) => `${dept}|${jobRole}|${style}|${level}|${r}`;

  const doneFFile = 'data/done_followup.txt';
  const doneF = new Set(
    fs.existsSync(doneFFile)
      ? fs.readFileSync(doneFFile, 'utf8').split('\n').filter(Boolean)
      : []
  );
  const remainingF = followupCombos.filter((c) => !doneF.has(comboKey(c)));

  console.log(`\n[2단계] 꼬리질문 학습 데이터 생성`);
  console.log(`총 ${followupCombos.length}개 중 ${doneF.size}개 완료, ${remainingF.length}개 남음\n`);

  let fSuccess = 0, fFail = 0;

  for (let i = 0; i < remainingF.length; i++) {
    const combo = remainingF[i];
    const { dept, jobRole, style, level } = combo;
    const key = comboKey(combo);

    try {
      const triplet = await generateFollowupTriplet(dept, jobRole, level, style);
      const line = formatFollowupTrainLine(dept, jobRole, style, triplet);
      appendLine(line);
      fs.appendFileSync(doneFFile, `${key}\n`, 'utf8');
      fSuccess++;
    } catch (e) {
      fFail++;
      console.error(`  ✗ [꼬리질문/${dept}/${jobRole || '직무없음'}/${style}/${level}] ${e.message}`);
    }

    if ((i + 1) % 20 === 0 || i + 1 === remainingF.length) {
      const pct = (((i + 1) / remainingF.length) * 100).toFixed(1);
      console.log(`[${pct}%] ${i + 1}/${remainingF.length} — 성공 ${fSuccess} / 실패 ${fFail}`);
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  // ── 최종 요약 ─────────────────────────────────────────────────────────
  const trainLines = fs.existsSync('data/train.jsonl')
    ? fs.readFileSync('data/train.jsonl', 'utf8').split('\n').filter(Boolean).length
    : 0;
  const evalLines = fs.existsSync('data/eval.jsonl')
    ? fs.readFileSync('data/eval.jsonl', 'utf8').split('\n').filter(Boolean).length
    : 0;

  console.log(`\n완료`);
  console.log(`  train.jsonl: ${trainLines}개`);
  console.log(`  eval.jsonl:  ${evalLines}개`);
  console.log(`  질문 생성 — 성공 ${qSuccess} / 실패 ${qFail}`);
  console.log(`  꼬리질문   — 성공 ${fSuccess} / 실패 ${fFail}`);
}

main().catch(console.error);
