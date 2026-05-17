import 'dotenv/config';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// ── 로컬 Ollama로 데이터 생성 (무료, 레이트 리밋 없음) ─────────────────
// 실행 전 Ollama가 켜져 있어야 합니다
const generator = new OpenAI({
  apiKey: 'ollama',
  baseURL: 'http://localhost:11434/v1',
});
const GENERATOR_MODEL = process.env.GENERATOR_MODEL || 'llama3.1:8b';
const DELAY_MS = Number(process.env.DELAY_MS) || 0;

// ── aiServer.js와 동일한 상수 ─────────────────────────────────────────────
const STYLE_PERSONAS = {
  friendly: {
    role: '신입 채용 전담 HR 매니저',
    tone: '부드럽고 편안하게 유도하는',
    desc: '지원자가 긴장하지 않도록 따뜻하고 배려하는 어투로 질문합니다. "~에 대해 편하게 말씀해 주시겠어요?", "~하신 경험이 있으시면 공유해 주세요." 같은 개방형 형식을 선호합니다. 부담스럽지 않은 표현으로 지원자가 자연스럽게 속내를 드러낼 수 있도록 유도합니다.',
  },
  pressure: {
    role: '창업 10년차 회사 대표 겸 투자자 출신 임원',
    tone: '날카롭고 압박적인',
    desc: '지원자의 말 한 마디 한 마디를 검증하며 논리 허점을 파고드는 성격입니다. "그게 정말 본인이 직접 한 건가요?", "왜 그 방법밖에 생각 못 하셨죠?" 같은 직접적이고 도발적인 반론형 어투를 선호합니다.',
  },
  professor: {
    role: '15년 경력의 시니어 개발자 출신 기술 면접관',
    tone: '개념을 깊게 파고드는 교수형',
    desc: '원리와 배경 이해를 중시하며 학문적·분석적 어투로 질문합니다. 표면적 답변에 만족하지 않고 "그래서 그 선택이 왜 최선이라고 생각하십니까?" 처럼 한 단계 더 파고드는 성격입니다.',
  },
  practical: {
    role: '실무 프로젝트를 직접 이끄는 현업 개발팀 팀장',
    tone: '실무 연계 현실적인',
    desc: '이론보다 실제 업무에서 바로 써먹을 수 있는지를 봅니다. "실무에서 ○○ 상황이 생겼을 때 어떻게 대처하시겠습니까?" 같은 시나리오 기반 질문을 선호합니다.',
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
  startup:  '스타트업 맥락을 질문에 반드시 반영하세요: 인력·시간·예산이 부족한 상황, 혼자 넓은 영역을 담당해야 하는 상황, 완벽한 설계보다 빠른 출시가 우선되는 상황.',
  smb:      '중소기업 맥락을 질문에 반영하세요: 제한된 리소스 안에서 실용적 해결책, 즉시 투입 가능한 실무 역량, 체계보다 실행력이 중요한 환경.',
  midsize:  '중견기업 맥락을 질문에 반영하세요: 성장 중인 조직에서 체계와 속도의 균형, 기존 레거시와 새 기술 사이의 조율.',
  large:    '대기업 맥락을 질문에 반영하세요: 여러 팀·부서 간 협업과 조율, 대규모 처리, 표준화된 프로세스 안에서의 결정.',
  public:   '공공기관 맥락을 질문에 반영하세요: 규정·보안·안정성 최우선, 민감 데이터 처리, 변경에 신중해야 하는 환경.',
  foreign:  '외국계 기업 맥락을 질문에 반영하세요: 다국적 팀과의 협업, 글로벌 스탠다드와 로컬 요구사항의 조율.',
};

const EXPERIENCE_MAP = {
  newcomer: '신입 (0년차) — 기초 역량·학습 의지·성장 가능성 위주 질문, 깊은 실무 경험 전제 금지',
  junior:   '주니어 (1~3년차) — 실무 경험·문제 해결 방식·기초 설계 역량 위주 질문',
  mid:      '미드레벨 (3~5년차) — 주도적 프로젝트 경험·기술 깊이·팀 협업 방식 위주 질문',
  senior:   '시니어 (5년 이상) — 리더십·아키텍처 설계·기술 의사결정·멘토링 역량 위주 질문',
};

// ── 직무별 랜덤 키워드 (다양성 확보)
const TOPIC_KEYWORDS = {
  '':              ['자료구조', '알고리즘', '운영체제', '네트워크', '데이터베이스', '객체지향', '디자인패턴', '버전관리', '테스트'],
  '프론트엔드 개발자': ['React', 'Vue', '상태관리', '렌더링 최적화', 'CSS', '웹 접근성', 'TypeScript', '번들러', 'SEO', '크로스브라우저'],
  '백엔드 개발자':   ['REST API', '데이터베이스 설계', '캐싱', '인증/인가', '메시지 큐', '마이크로서비스', 'SQL 최적화', '트랜잭션', '보안'],
  'AI 엔지니어':    ['모델 학습', '데이터 전처리', '파인튜닝', '추론 최적화', '벡터 DB', 'RAG', 'MLOps', '과적합 방지', '평가지표'],
};

function getRandomKeyword(jobRole) {
  const keywords = TOPIC_KEYWORDS[jobRole] || TOPIC_KEYWORDS[''];
  return keywords[Math.floor(Math.random() * keywords.length)];
}

// ── 학과 + 직무 (IT 계열 — 직무 없으면 빈 문자열)
const DEPARTMENTS = ['컴퓨터소프트웨어과'];
const JOB_ROLES   = [
  '',                   // 직무 미지정
  '프론트엔드 개발자',
  '백엔드 개발자',
  'AI 엔지니어',
];

const COMPANY_TYPES = ['startup', 'large', 'public'];
const LEVELS        = ['newcomer', 'junior', 'mid', 'senior'];
const STYLES        = ['friendly', 'pressure', 'professor', 'practical'];
const TYPES         = ['major', 'personality'];

// ── aiServer.js와 동일한 프롬프트 빌더 ───────────────────────────────────
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
  const keyword   = getRandomKeyword(jobRole);

  let p = `당신은 한국어로만 대답하는 채용 전문 면접관입니다.\n`;
  p += `면접관 역할: ${persona.role}\n`;
  p += `지원자 정보: ${target}\n`;
  p += `회사 유형: ${companyLabel}\n`;
  p += `지원자 수준: ${level}\n`;
  p += `면접관 성격: ${persona.tone} — ${persona.desc}\n\n`;

  p += `이번 질문에서 "${keyword}" 관련 역량을 반드시 한 개 이상 포함하세요.\n\n`;

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
    p += `질문 1 — 의견 충돌 또는 우선순위 갈등 상황: 어떻게 설득하고 조율했는지 구체적 경험을 묻는 질문.\n`;
    p += `질문 2 — 예상치 못한 장애·일정 압박·리소스 부족 상황: 실제로 어떻게 대응했는지 묻는 질문.`;
    if (companyContext) p += ` 위에서 제시한 [회사 맥락]의 현실적 압박 상황을 질문 안에 반영하세요.`;
    p += `\n`;
    p += `질문 3 — 본인이 결정을 주도했거나 방향을 바꾼 경험: 그 판단 근거와 결과를 묻는 질문.\n\n`;
    p += `작성 규칙:\n`;
    p += `- 각 질문은 하나의 완결된 문장, 물음표(?)는 끝에 하나만.\n`;
    p += `- 추상적 질문 금지 — 구체적인 상황을 먼저 설정하고 그 상황에서의 대응을 묻는 형식.\n`;
    p += `- 어미: "~셨나요?", "~있으신가요?", "~하셨습니까?" 등 자연스러운 존댓말.\n`;
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
    p += `질문 1 — 핵심 개념 실무 적용: 실제 사용할 때 어떤 판단을 했는지, 어떤 문제가 생겼는지를 묻는 상황 기반 질문.\n`;
    p += `질문 2 — 직무상 문제 상황 대응: ${roleLabel}에서 실제로 발생하는 구체적 문제 상황을 제시하고 어떻게 접근했는지 판단력을 검증.\n`;
    p += `질문 3 — 트레이드오프 판단: 두 가지 방식 중 하나를 선택해야 하는 상황을 제시하고, 어떤 기준으로 결정하겠는지 사고 과정을 보는 질문.\n`;
    if (companyContext) p += `위에서 제시한 [회사 맥락]의 현실적 압박 상황을 질문 2 또는 3에 구체적으로 반영하세요.\n`;
    p += `\n작성 규칙:\n`;
    p += `- 각 질문은 하나의 완결된 문장, 물음표(?)는 끝에 하나만.\n`;
    p += `- 상황을 먼저 제시하고 그 상황에서의 판단·경험을 묻는 형식.\n`;
    p += `- 어미: "~셨나요?", "~있으신가요?", "~하시겠습니까?", "~하셨습니까?" 등 자연스러운 존댓말.\n`;
    p += `- 면접관 성격(${persona.tone}) 어투 유지.\n`;
    p += `- 반드시 아래 JSON 형식으로만 응답:\n`;
    p += `{"questions":["직무질문1","직무질문2","직무질문3"]}`;
  }

  return p;
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

// ── 단일 항목 생성 (재시도 포함) ─────────────────────────────────────────
async function generateOne(prompt, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await generator.chat.completions.create({
        model: GENERATOR_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.85,
      });
      const content = res.choices[0].message.content;
      if (!validate(content)) throw new Error('유효성 검사 실패');
      return content;
    } catch (e) {
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, 1500 * (i + 1)));
    }
  }
}

// ── 메인 ─────────────────────────────────────────────────────────────────
async function main() {
  // data 폴더 생성
  if (!fs.existsSync('data')) fs.mkdirSync('data');

  // 전체 조합 생성
  const combinations = [];
  for (const dept of DEPARTMENTS) {
    for (const jobRole of JOB_ROLES) {
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

  // 셔플 (특정 학과가 앞에 몰리지 않도록)
  for (let i = combinations.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combinations[i], combinations[j]] = [combinations[j], combinations[i]];
  }

  // 파일 초기화 (이어쓰기 방지)
  fs.writeFileSync('data/train.jsonl', '', 'utf8');
  fs.writeFileSync('data/eval.jsonl',  '', 'utf8');

  console.log(`총 ${combinations.length}개 조합 생성 시작 (모델: ${GENERATOR_MODEL})\n`);

  let success = 0;
  let fail    = 0;
  let trainCount = 0;
  let evalCount  = 0;

  for (let i = 0; i < combinations.length; i++) {
    const { dept, jobRole, company, level, style, type } = combinations[i];

    try {
      const prompt  = buildJobPrompt(dept, jobRole, company, level, style, type);
      const content = await generateOne(prompt);

      const line = JSON.stringify({
        messages: [
          { role: 'user',      content: prompt  },
          { role: 'assistant', content: content },
        ],
      });

      // 10% 확률로 eval, 나머지는 train에 즉시 저장
      if (Math.random() < 0.1) {
        fs.appendFileSync('data/eval.jsonl',  line + '\n', 'utf8');
        evalCount++;
      } else {
        fs.appendFileSync('data/train.jsonl', line + '\n', 'utf8');
        trainCount++;
      }
      success++;
    } catch (e) {
      fail++;
      console.error(`  ✗ [${dept}/${jobRole || '직무없음'}/${company}/${level}/${style}/${type}] ${e.message}`);
    }

    // 진행률 출력
    if ((i + 1) % 20 === 0 || i + 1 === combinations.length) {
      const pct = (((i + 1) / combinations.length) * 100).toFixed(1);
      console.log(`[${pct}%] ${i + 1}/${combinations.length} — 성공 ${success} / 실패 ${fail}`);
    }

    // 레이트 리밋 방지
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n완료`);
  console.log(`  train.jsonl: ${trainCount}개`);
  console.log(`  eval.jsonl:  ${evalCount}개`);
  console.log(`  실패: ${fail}개`);
}

main().catch(console.error);
