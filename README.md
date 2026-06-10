# AI Interview Assistant

> AI 기반 실시간 면접 연습 서비스

이력서·자기소개서를 업로드하면 AI가 직무 맞춤형 면접 질문을 생성하고, AI 면접관 아바타와 실시간 화상 면접을 진행한 뒤, 상세한 결과 리포트를 이메일로 받아볼 수 있습니다.

---

## 시스템 구성도

![시스템 구성도](docs/system-diagram.png)

---

## 화면 Flow Map

> 실제 구현 화면과 동일한 UI로 제작된 인터랙티브 플로우맵입니다.

**[► 화면 Flow Map 보기](https://yeop-2ee.github.io/ai-interview-assistant/flowmap.html)**

| 플로우 | 포함 화면 |
|--------|-----------|
| 인증 플로우 | 랜딩 홈 · 로그인 · 회원가입 (이메일 인증) |
| 면접 플로우 | 면접 설정 · 자료 업로드 · 면접 진행 · 결과 리포트 |
| 프로필·관리 | 면접 기록 · 관리자 대시보드 |
| 모달·오버레이 | 면접 안내 모달 · 설문 모달(설문 → 이메일 → 완료) |

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **이메일 인증 회원가입** | 6자리 인증코드 발송 · 3분 타이머 · 비밀번호 강도 측정 (12자+ · 대소문자 · 특수문자) |
| **AI 맞춤 질문 생성** | 이력서·자소서 분석 → 직무·유형·스타일·난이도 반영 질문 자동 생성 (2~3 Pass SSE) |
| **이력서 AI 분석** | 업로드 즉시 이름·기술스택·경력·프로젝트·강점 요약 카드 표시 |
| **학과 관련성 검사** | AI가 이력서 내용과 선택 학과 일치 여부 판단 → 불일치 시 경고·진행 차단 |
| **AI 면접관 아바타** | 면접관 스타일별 아바타 + Wav2Lip 립싱크 영상으로 실제 면접관처럼 질문 |
| **실시간 STT** | 답변 녹음 → Whisper 변환 → 텍스트 직접 수정·재답변 가능 |
| **AI 꼬리질문** | 답변 분석 후 필요한 경우에만 꼬리질문 생성 (동문서답·근거 부족 등) |
| **얼굴 분석** | MediaPipe로 시선 방향·눈 깜빡임 실시간 감지 |
| **결과 리포트** | 종합 점수·영역별 점수·질문별 피드백·강점·약점·적합도 평가 |
| **리포트 이메일 발송** | 리포트 전체를 HTML 이메일로 발송 (점수 카드·피드백·꼬리질문 포함) |
| **Q&A 이메일 발송** | 면접 질문·답변 내역을 이메일로 발송 (꼬리질문 배지 표시) |
| **면접 기록 관리** | 과거 면접 기록 조회·상세보기·삭제 |
| **SSE 세션 관리** | 다른 기기 로그인 시 서버 SSE push로 즉시 세션 무효화 |
| **모바일 반응형 UI** | 전체 페이지 모바일 최적화 (햄버거 메뉴·카드 레이아웃·반응형 그리드) |

---

## 서비스 흐름

```
회원가입 (이메일 인증 코드 · 비밀번호 강도 검증)
        ↓
면접 설정 (학과 · 직무 · 유형 · 스타일 · 난이도)
        ↓
이력서 / 자기소개서 업로드
  ├─ AI 요약 분석 (이름 · 기술스택 · 경력 · 강점)
  └─ 학과 관련성 검사 (불일치 시 경고 + 진행 차단)
        ↓
AI 맞춤 질문 생성 (2~3 Pass SSE 스트리밍)
  ├─ Pass 1: 공통 질문 2개 (지원동기 · 실패/갈등 경험)
  ├─ Pass 2: 직무/인성 질문 3개 (전공지식 DB 주입)
  └─ Pass 3: 이력서 기반 질문 2개 (resume/mixed 유형)
        ↓
실시간 AI 화상 면접
  ├─ AI 면접관 아바타 질문 (스타일별 아바타 + Wav2Lip 립싱크)
  ├─ 답변 녹음 (최대 90초)
  ├─ STT 변환 → 답변 검토·수정·재답변
  └─ 다음 질문 클릭 시 꼬리질문 분석 + 다음 영상 생성 병렬 처리
        ↓
결과 리포트 생성 (SSE 스트리밍)
  ├─ 종합 점수 · 영역별 점수 (내용·논리·전달력·신뢰도·호감도)
  ├─ 강점 / 약점 · 주의사항
  ├─ 질문별 상세 피드백 (적절성 · 개선 답변 · 예상 꼬리질문)
  └─ 직무·조직·기업 적합도
        ↓
리포트 저장 · 이메일 발송 (리포트 HTML · Q&A 꼬리질문 포함)
```

---

## 기술 스택

### Frontend
[![Next.js](https://img.shields.io/badge/Next.js-16.2.1-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2.4-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.2-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.2.2-06B6D4?logo=tailwindcss)](https://tailwindcss.com)

| 기술 | 버전 | 용도 |
|------|------|------|
| [Next.js](https://nextjs.org) | 16.2.1 | 프레임워크 · App Router |
| [React](https://react.dev) | 19.2.4 | UI 라이브러리 |
| [TypeScript](https://www.typescriptlang.org) | 6.0.2 | 타입 안전성 |
| [Tailwind CSS](https://tailwindcss.com) | 4.2.2 | 스타일링 |
| [@mediapipe/tasks-vision](https://developers.google.com/mediapipe) | 0.10.34 | 실시간 얼굴·시선 분석 |
| MediaRecorder API | 브라우저 내장 | 음성 녹음 |
| Web Audio API | 브라우저 내장 | 마이크 레벨 감지 |

### Backend
[![Express](https://img.shields.io/badge/Express-5.2.1-000000?logo=express)](https://expressjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0.2-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7.6.0-2D3748?logo=prisma)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?logo=postgresql)](https://www.postgresql.org)

| 기술 | 버전 | 용도 |
|------|------|------|
| [Node.js](https://nodejs.org) | 18+ | 런타임 |
| [Express](https://expressjs.com) | 5.2.1 | 서버 프레임워크 |
| [TypeScript](https://www.typescriptlang.org) | 6.0.2 | 타입 안전성 |
| [Prisma](https://www.prisma.io) | 7.6.0 | ORM · 5개 테이블 |
| [PostgreSQL](https://www.postgresql.org) | - | 데이터베이스 |
| [bcrypt](https://github.com/kelektiv/node.bcrypt.js) | 6.0.0 | 비밀번호 해싱 |
| [nodemailer](https://nodemailer.com) | 8.0.8 | 인증코드·Q&A·리포트 이메일 발송 |
| [pdf-parse](https://github.com/modesty/pdf2json) | 1.1.4 | PDF 텍스트 추출 |
| [mammoth](https://github.com/mwilliamson/mammoth.js) | 1.12.0 | DOCX 텍스트 추출 |
| [multer](https://github.com/expressjs/multer) | 2.1.1 | 파일 업로드 |

**DB 테이블 (5종)**

| 테이블 | 용도 |
|--------|------|
| `User` | 사용자 계정 · 세션 토큰 |
| `EmailVerification` | 이메일 인증 코드 · 토큰 · 만료시각 |
| `InterviewReport` | 면접 결과 저장 |
| `SurveyResponse` | 면접 후 설문 응답 |
| `KnowledgeEntry` | 전공지식 DB (Pass2 프롬프트 주입) |

**Backend 주요 엔드포인트**

| 경로 | 설명 |
|------|------|
| `GET /auth/check-email` | 이메일 중복 실시간 확인 |
| `POST /auth/send-verification` | 6자리 인증코드 이메일 발송 |
| `POST /auth/verify-code` | 인증코드 검증 · verifiedToken 반환 |
| `POST /auth/signup` | 회원가입 (verifiedToken 필수) |
| `POST /email/send-results` | Q&A 이메일 발송 (꼬리질문 배지 포함) |
| `POST /email/send-report` | 리포트 HTML 이메일 발송 |

### AI Pipeline
[![Ollama](https://img.shields.io/badge/Ollama-macOS%2FWindows%2FLinux-white?logo=ollama)](https://ollama.com)

| 모델 | 용도 |
|------|------|
| `llama3.1:8b` | 면접 질문 생성 · 꼬리질문 생성 |
| `gemma3:12b` | 이력서 분석 · 결과 리포트 생성 |

| 기술 | 버전 | 용도 |
|------|------|------|
| [Ollama](https://ollama.com) | latest | 로컬 LLM 추론 서버 |
| [openai](https://github.com/openai/openai-node) | 4.x | OpenAI 호환 API 클라이언트 |
| [Express](https://expressjs.com) | 4.22.1 | API 서버 + SSE 스트리밍 |

**AI 생성 엔드포인트**

| 엔드포인트 | 모델 | 설명 |
|-----------|------|------|
| `POST /generate/questions` | llama3.1:8b | 면접 질문 생성 (2~3 Pass SSE) |
| `POST /generate/followup` | llama3.1:8b | 꼬리질문 생성 |
| `POST /generate/summary` | gemma3:12b | 이력서 요약 분석 (SSE) |
| `POST /generate/relevance` | gemma3:12b | 이력서-학과 관련성 판단 |
| `POST /generate/report` | gemma3:12b | 결과 리포트 생성 (SSE) |

### Media Service

| 기술 | 버전 | 용도 |
|------|------|------|
| [mlx-whisper](https://github.com/ml-explore/mlx-examples/tree/main/whisper) | large-v3-turbo | 음성→텍스트 (Apple Silicon) |
| [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | large-v3-turbo | 음성→텍스트 (Windows/Linux) |
| [edge-tts](https://github.com/rany2/edge-tts) | ko-KR-SunHiNeural | 텍스트→음성 |
| [Wav2Lip](https://github.com/Rudrabha/Wav2Lip) | - | 립싱크 영상 생성 |
| [ffmpeg](https://ffmpeg.org) | - | 오디오·영상 전처리 |

---

## 프로젝트 구조

```
ai-interview-assistant/
│
├── docs/                                  # 문서 · 이미지
│   └── system-diagram.png                 # 시스템 구성도
│
├── frontend/                              # Next.js 프론트엔드 (포트 3000)
│   └── src/
│       ├── app/
│       │   ├── page.tsx                   # 메인(홈) 페이지
│       │   ├── login/page.tsx             # 로그인
│       │   ├── signup/page.tsx            # 회원가입 (이메일 인증 · 비밀번호 강도)
│       │   ├── setup/page.tsx             # 면접 유형·스타일·난이도 설정
│       │   ├── upload/page.tsx            # 이력서·자소서 업로드 · AI 분석
│       │   ├── interview/page.tsx         # 실시간 AI 화상 면접
│       │   ├── report/page.tsx            # 결과 리포트 · 이메일 발송
│       │   ├── profile/page.tsx           # 면접 기록 조회·삭제
│       │   └── admin/page.tsx             # 관리자 대시보드
│       └── components/
│           ├── Navbar.tsx                 # 네비게이션 바
│           ├── SessionGuardProvider.tsx   # SSE 세션 만료 감지
│           └── SurveyEmailModal.tsx       # 설문 + Q&A 이메일 발송 모달
│
├── backend/                               # Express API 서버 (포트 3001)
│   ├── prisma/
│   │   └── schema.prisma                  # DB 모델 (5개 테이블)
│   └── src/routes/
│       ├── authRoutes.ts                  # 회원가입·로그인·이메일 인증·세션
│       ├── emailRoutes.ts                 # Q&A·리포트 이메일 발송
│       ├── reportRoutes.ts                # 리포트 저장·조회·삭제
│       ├── uploadRoutes.ts                # 이력서 업로드·텍스트 추출
│       ├── interviewRoutes.ts             # 면접 질문 생성 SSE 프록시
│       ├── aiRoutes.ts                    # AI 분석 프록시
│       └── knowledgeRoutes.ts             # 전공지식 CRUD
│
├── ai-pipeline/                           # AI 생성 서버 (포트 5050)
│   └── aiServer.js                        # 질문·꼬리질문(llama3.1:8b) · 분석·리포트(gemma3:12b)
│
└── media-service/                         # 미디어 처리 서버 (포트 4000)
    ├── stt/                               # Whisper STT
    ├── tts/                               # edge-tts TTS
    └── wav2lip/                           # Wav2Lip 립싱크
```

---

## 시작하기 (로컬 개발)

### 사전 요구사항

| 항목 | macOS | Windows | Linux |
|------|-------|---------|-------|
| Node.js | 18+ | 18+ | 18+ |
| Python | 3.9+ | 3.9+ | 3.9+ |
| PostgreSQL | 필요 | 필요 | 필요 |
| Ollama | 필요 | 필요 | 필요 |
| STT | mlx-whisper | faster-whisper | faster-whisper |
| TTS | edge-tts | edge-tts | edge-tts |
| ffmpeg | 필요 | 필요 | 필요 |
| Wav2Lip | 선택 | 선택 | 선택 |

### 1. 저장소 클론

```bash
git clone https://github.com/yeop-2ee/ai-interview-assistant.git
cd ai-interview-assistant
```

### 2. 의존성 설치

```bash
cd frontend && npm install
cd ../backend && npm install
cd ../ai-pipeline && npm install
cd ../media-service && npm install
```

```bash
# Python 패키지 — macOS
pip install mlx-whisper edge-tts

# Python 패키지 — Windows / Linux
pip install faster-whisper edge-tts torch
```

### 3. 환경변수 설정

**frontend/.env.local**
```env
NEXT_PUBLIC_MEDIA_API=http://localhost:4000
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

**backend/.env**
```env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/ai_interview
AI_SERVER_URL=http://localhost:5050
MEDIA_SERVER_URL=http://localhost:4000

# 이메일 (nodemailer + Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
```

**ai-pipeline/.env**
```env
PORT=5050
LLM_MODEL_QA=llama3.1:8b
LLM_MODEL_REPORT=gemma3:12b
```

**media-service/.env**
```env
PORT=4000
PYTHON_PATH=/path/to/python3
WAV2LIP_INFERENCE_PATH=/path/to/Wav2Lip/inference.py
```

### 4. DB 마이그레이션

```bash
cd backend
npx prisma generate
npx prisma db push
```

### 5. LLM 모델 준비 (Ollama)

```bash
# Ollama 설치 후
ollama pull llama3.1:8b
ollama pull gemma3:12b
```

### 6. 서버 실행

```bash
# 터미널 4개에서 각각 실행
cd frontend && npm run dev              # http://localhost:3000
cd backend && npx ts-node src/server.ts # http://localhost:3001
cd media-service && npm start           # http://localhost:4000
cd ai-pipeline && node aiServer.js      # http://localhost:5050
```

---

## AWS EC2 배포 가이드

### 인프라 구성

| 구성 요소 | 사양 |
|----------|------|
| EC2 인스턴스 | g4dn.xlarge (Tesla T4 16GB GPU, 4 vCPU, 16GB RAM) |
| OS | Amazon Linux 2023 |
| 데이터베이스 | Amazon RDS PostgreSQL |
| 프로세스 관리 | PM2 |
| 리버스 프록시 | Nginx |
| LLM 런타임 | Ollama (GPU 가속) |

### Nginx 설정 (`/etc/nginx/conf.d/app.conf`)

```nginx
server {
    client_max_body_size 20m;
    listen 80;
    server_name _;

    location /api/auth/events {
        proxy_pass http://localhost:3001/auth/events;
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
        proxy_buffering off;
        proxy_cache off;
    }
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host $host;
        proxy_read_timeout 300s;
    }
    location /ai/ {
        proxy_pass http://localhost:5050/;
        proxy_set_header Host $host;
        proxy_read_timeout 300s;
        proxy_buffering off;
    }
    location /media/ {
        proxy_pass http://localhost:4000/;
        proxy_set_header Host $host;
        proxy_read_timeout 300s;
    }
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_read_timeout 300s;
    }
}
```

### PM2 실행

```bash
pm2 start "npx ts-node src/server.ts" --name backend --cwd /data/app/backend
pm2 start aiServer.js --name ai-pipeline --cwd /data/app/ai-pipeline
pm2 start "node mediaServer.js" --name media-service --cwd /data/app/media-service
pm2 start "npm run start" --name frontend --cwd /data/app/frontend
pm2 save && pm2 startup
```

### LLM 모델 선택 가이드 (Tesla T4 16GB 기준)

| 모델 | VRAM | 용도 |
|------|------|------|
| `llama3.1:8b` | ~5GB | 질문·꼬리질문 생성 (권장) |
| `gemma3:12b` | ~8GB | 이력서 분석·리포트 생성 (권장) |
| `gemma3:9b` | ~5GB | 리포트 경량 대안 |
| `gemma3:27b` | ~17GB | VRAM 초과로 사용 불가 |

---

## 기능 상세

### 회원가입 보안

- **이메일 인증**: 6자리 코드 발송 → 3분 타이머 내 인증 → verifiedToken 발급
- **이메일 중복 확인**: 입력 중 실시간 중복 체크
- **비밀번호 강도**: 12자 이상 · 대문자 · 소문자 · 특수문자 4가지 조건 충족 필수
- **비밀번호 강도 표시**: 심각 / 보통 / 양호 / 강력 4단계 실시간 표시

### 이력서 업로드 및 AI 분석

- PDF / DOCX 파일 드래그&드롭 또는 클릭 업로드
- 업로드 즉시 **AI 요약 분석** 카드 (이름·한줄소개·기술스택·경력·학력·프로젝트·강점)
- **학과 관련성 검사**: 불일치 시 경고 + "다음" 버튼 비활성화

### 실시간 AI 화상 면접

- 카메라·마이크 장치 직접 선택
- **화면 레이아웃**: 화면 분할 / PiP / 면접관 전체화면
- 최대 답변 시간 90초, STT 변환 후 텍스트 수정·재답변 가능
- 꼬리질문 필요 시 자동 생성 (동문서답·근거 부족 등)

### 결과 리포트

| 항목 | 내용 |
|------|------|
| 종합 점수 | 100점 만점 |
| 영역별 점수 | 답변내용 · 논리구조 · 전달력 · 신뢰도 · 호감도 |
| 강점 / 약점 | AI 분석 기반 피드백 |
| 주의사항 | 실제 면접 시 유의 행동 패턴 |
| 질문별 피드백 | 적절성 · 개선 답변 · 예상 꼬리질문 |
| 적합도 평가 | 직무 · 조직 · 기업 적합도 |
| 이메일 발송 | 리포트 전체를 HTML 이메일로 수신 |

### 얼굴 분석 (MediaPipe)

- 분석 주기: 200ms
- **시선 감지**: 정면 / 좌 / 우 / 위 / 아래
- **눈 깜빡임**: EAR(Eye Aspect Ratio) 기반 횟수 측정
