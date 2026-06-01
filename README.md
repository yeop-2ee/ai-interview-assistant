# AI Interview Assistant

> AI 기반 실시간 면접 연습 서비스

이력서·자기소개서를 업로드하면 AI가 직무 맞춤형 면접 질문을 생성하고, AI 면접관 아바타와 실시간 화상 면접을 진행한 뒤, 상세한 결과 리포트를 제공합니다.

---

## 화면 Flow Map

> 실제 구현 화면과 동일한 UI로 제작된 인터랙티브 플로우맵입니다. 아래 링크를 클릭하면 브라우저에서 바로 확인할 수 있습니다.

**[► 화면 Flow Map 보기](https://htmlpreview.github.io/?https://github.com/yeop-2ee/ai-interview-assistant/blob/main/flowmap.html)**

| 플로우 | 포함 화면 |
|--------|-----------|
| 인증 플로우 | 랜딩 홈 · 로그인 · 회원가입 |
| 면접 플로우 | 면접 설정 · 자료 업로드 · 면접 진행 · 결과 리포트 |
| 프로필·관리 | 면접 기록 · 관리자 대시보드 |
| 모달·오버레이 | 면접 안내 모달 · 설문 모달(설문 → 이메일 → 완료) |

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **AI 맞춤 질문 생성** | 이력서·자소서 분석 → 직무·유형·스타일·난이도 반영 질문 자동 생성 |
| **이력서 AI 분석** | 업로드 즉시 이름·기술스택·경력·프로젝트·강점 요약 카드 표시 |
| **학과 관련성 검사** | AI가 이력서 내용과 선택 학과 일치 여부 판단 → 불일치 시 경고·진행 차단 |
| **AI 면접관 아바타** | 면접관 스타일별 아바타 + Wav2Lip 립싱크 영상으로 실제 면접관처럼 질문 |
| **실시간 STT** | 답변 녹음 → Whisper 변환 → 텍스트 직접 수정·재답변 가능 |
| **AI 꼬리질문** | 답변 분석 후 필요한 경우에만 꼬리질문 생성 (동문서답·근거 부족 등) |
| **얼굴 분석** | MediaPipe로 시선 방향·눈 깜빡임 실시간 감지 |
| **결과 리포트** | 종합 점수·영역별 점수·질문별 피드백·적합도 평가 |
| **PDF 다운로드** | 리포트 전체를 PDF로 저장 |
| **면접 기록 관리** | 과거 면접 기록 조회·상세보기·삭제 |

---

## 서비스 흐름

```
면접 설정 (학과 · 직무 · 유형 · 스타일 · 난이도)
        ↓
이력서 / 자기소개서 업로드
  ├─ AI 요약 분석 (이름 · 기술스택 · 경력 · 강점)
  └─ 학과 관련성 검사 (불일치 시 경고 + 진행 차단)
        ↓
AI 맞춤 질문 생성 (2-Pass SSE 스트리밍)
  ├─ 공통 질문 2개 (지원동기 · 약점)
  ├─ 직무/인성 질문 3개
  └─ 이력서 기반 질문 2개 (resume/mixed 유형)
        ↓
실시간 AI 화상 면접
  ├─ AI 면접관 아바타 질문 (스타일별 아바타 + Wav2Lip 립싱크)
  ├─ 답변 녹음 (최대 90초)
  ├─ STT 변환 → 답변 검토·수정·재답변
  └─ 다음 질문 클릭 시 꼬리질문 분석 + 다음 영상 생성 병렬 처리
        ↓
결과 리포트 생성
  ├─ 종합 점수 · 영역별 점수
  ├─ 강점/약점 · 주의사항
  ├─ 질문별 상세 피드백 (적절성 · 개선 답변 · 예상 꼬리질문)
  └─ 직무·조직·기업 적합도
        ↓
리포트 저장 · PDF 다운로드
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
| [Next.js](https://nextjs.org) | 16.2.1 | 프레임워크 |
| [React](https://react.dev) | 19.2.4 | UI 라이브러리 |
| [TypeScript](https://www.typescriptlang.org) | 6.0.2 | 타입 안전성 |
| [Tailwind CSS](https://tailwindcss.com) | 4.2.2 | 스타일링 |
| [MediaPipe Tasks Vision](https://developers.google.com/mediapipe) | 0.10.34 | 실시간 얼굴·시선 분석 |
| [jsPDF](https://github.com/parallax/jsPDF) | 4.2.1 | 리포트 PDF 다운로드 |
| [dom-to-image-more](https://github.com/1904labs/dom-to-image-more) | 3.7.2 | DOM → 이미지 변환 |
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
| [ts-node](https://typestrong.org/ts-node) | 10.9.2 | TypeScript 실행 |
| [Prisma](https://www.prisma.io) | 7.6.0 | ORM |
| [PostgreSQL](https://www.postgresql.org) | - | 데이터베이스 |
| [bcrypt](https://github.com/kelektiv/node.bcrypt.js) | 6.0.0 | 비밀번호 해싱 |
| [nodemailer](https://nodemailer.com) | 8.0.8 | 면접 결과 이메일 발송 (Gmail SMTP) |
| [pdf-parse](https://github.com/modesty/pdf2json) | 1.1.4 | PDF 텍스트 추출 |
| [mammoth](https://github.com/mwilliamson/mammoth.js) | 1.12.0 | DOCX 텍스트 추출 |
| [multer](https://github.com/expressjs/multer) | 2.1.1 | 파일 업로드 |

### AI Pipeline
[![Express](https://img.shields.io/badge/Express-4.22.1-000000?logo=express)](https://expressjs.com)
[![Ollama](https://img.shields.io/badge/Ollama-macOS%2FWindows%2FLinux-white?logo=ollama)](https://ollama.com)

AI Pipeline은 모든 플랫폼에서 **Ollama + gemma3:12b**를 사용합니다.

| 환경 | LLM 런타임 | 기본 모델 |
|------|-----------|----------|
| macOS / Windows / Linux | Ollama (GPU/CPU) | gemma3:12b |

| 기술 | 버전 | 용도 |
|------|------|------|
| [Ollama](https://ollama.com) | latest | 로컬 LLM 추론 서버 (전 플랫폼) |
| [openai](https://github.com/openai/openai-node) | 4.x | OpenAI 호환 API 클라이언트 |
| [Express](https://expressjs.com) | 4.22.1 | API 서버 + SSE 스트리밍 |

**AI 생성 엔드포인트**

| 엔드포인트 | 설명 |
|-----------|------|
| `POST /generate/questions` | 면접 질문 생성 (2-Pass SSE 스트리밍) |
| `POST /generate/summary` | 이력서 요약 분석 (SSE 스트리밍) |
| `POST /generate/relevance` | 이력서-학과 관련성 AI 판단 |
| `POST /generate/followup` | 꼬리질문 생성 (필요 시에만) |
| `POST /generate/report` | 면접 결과 리포트 생성 (SSE 스트리밍) |

### Media Service
[![Express](https://img.shields.io/badge/Express-4.22.1-000000?logo=express)](https://expressjs.com)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python)](https://www.python.org)

| 기술 | 버전 | 용도 |
|------|------|------|
| [Express](https://expressjs.com) | 4.22.1 | API 라우팅 |
| [mlx-whisper](https://github.com/ml-explore/mlx-examples/tree/main/whisper) | large-v3-turbo | 음성→텍스트 (Apple Silicon MPS) |
| [edge-tts](https://github.com/rany2/edge-tts) | ko-KR-SunHiNeural | 텍스트→음성 |
| [Wav2Lip](https://github.com/Rudrabha/Wav2Lip) | - | 립싱크 영상 생성 |
| [ffmpeg](https://ffmpeg.org) | - | 오디오·영상 전처리 |
| [aws-sdk](https://github.com/aws/aws-sdk-js) | 2.1693.0 | AWS 서비스 연동 |
| [multer](https://github.com/expressjs/multer) | 1.4.5-lts.2 | 파일 업로드 |

---

## 프로젝트 구조

```
ai-interview-assistant/
│
├── frontend/                              # Next.js 프론트엔드 (포트 3000)
│   ├── public/
│   │   └── avatars/                       # 면접관 스타일별 아바타 이미지
│   │       ├── friendly.png               # 친절한 스타일
│   │       ├── pressure.png               # 압박 스타일
│   │       ├── professor.png              # 교수형 스타일
│   │       └── practical.png              # 실무형 스타일
│   └── src/
│       ├── app/
│       │   ├── layout.tsx                 # 앱 공통 레이아웃
│       │   ├── globals.css                # 전역 스타일
│       │   ├── page.tsx                   # 메인(홈) 페이지
│       │   ├── login/page.tsx             # 로그인 (일반 / 관리자)
│       │   ├── signup/page.tsx            # 회원가입
│       │   ├── setup/page.tsx             # 면접 유형·스타일·난이도 설정
│       │   ├── upload/page.tsx            # 이력서·자소서 업로드 · AI 분석 · 관련성 검사
│       │   ├── interview/page.tsx         # 실시간 AI 화상 면접 (대기 → 진행 → 종료)
│       │   ├── report/page.tsx            # 결과 리포트 · PDF 다운로드
│       │   ├── profile/page.tsx           # 면접 기록 조회 · 상세보기 · 삭제
│       │   └── admin/page.tsx             # 전공지식 DB 관리 (관리자 전용)
│       ├── components/
│       │   ├── Navbar.tsx                 # 상단 네비게이션 바
│       │   ├── Icons.tsx                  # SVG 아이콘 컴포넌트 모음
│       │   ├── ScrollReveal.tsx           # 스크롤 애니메이션 래퍼
│       │   ├── StartButton.tsx            # 홈 CTA 버튼
│       │   └── TypewriterText.tsx         # 타이핑 효과 텍스트
│       ├── hooks/
│       │   ├── useFaceAnalysis.ts         # MediaPipe 얼굴·시선·눈깜빡임 분석 훅
│       │   ├── useCallMedia.ts            # 카메라·마이크 스트림 관리 훅
│       │   └── useInterviewQuestions.ts   # 면접 질문 로딩·상태 관리 훅
│       ├── lib/
│       │   └── sseStream.ts              # SSE 스트림 파싱 유틸리티
│       └── types/
│           └── dom-to-image-more.d.ts     # dom-to-image-more 타입 선언
│
├── backend/                               # Express API 서버 (포트 3001)
│   ├── prisma/
│   │   ├── schema.prisma                  # DB 모델 정의 (User · InterviewReport · KnowledgeEntry)
│   │   └── migrations/                    # Prisma 마이그레이션 이력
│   └── src/
│       ├── server.ts                      # Express 앱 진입점 · 미들웨어 등록
│       ├── lib/
│       │   └── prisma.ts                  # Prisma 클라이언트 싱글턴
│       ├── services/
│       │   └── fileTextExtractor.ts       # PDF · DOCX → 텍스트 추출
│       └── routes/
│           ├── authRoutes.ts              # 회원가입 / 로그인 / 회원탈퇴
│           ├── reportRoutes.ts            # 리포트 저장 / 조회 / 삭제
│           ├── uploadRoutes.ts            # 이력서·자소서 업로드 및 텍스트 추출
│           ├── interviewRoutes.ts         # AI 맞춤 질문 생성 (SSE 스트리밍 프록시)
│           ├── aiRoutes.ts                # AI 분석 프록시 (요약·관련성·꼬리질문·리포트)
│           └── knowledgeRoutes.ts         # 전공지식 CRUD (관리자 전용)
│
├── ai-pipeline/                           # AI 생성 서버 (포트 5050) [Node.js]
│   ├── aiServer.js                        # Express 서버 · 모든 AI 생성 엔드포인트 통합
│   ├── Modelfile                          # (레거시) Ollama 모델 설정 참고용
│   └── prompts/
│       ├── questionPrompt.md              # 맞춤 면접 질문 생성 프롬프트 레퍼런스
│       ├── reportPrompt.md                # 결과 리포트 생성 프롬프트 레퍼런스
│       └── followupPrompt.md              # 꼬리질문 생성 프롬프트 레퍼런스
│
├── media-service/                         # 미디어 처리 서버 (포트 4000)
│   ├── mediaServer.js                     # Express 앱 진입점 · 라우터 등록
│   ├── stt/
│   │   ├── sttService.js                  # STT API 라우터
│   │   └── transcribe_runner.py           # mlx-whisper 배치 STT · 후처리
│   ├── tts/
│   │   ├── ttsService.js                  # TTS API 라우터
│   │   └── tts_runner.py                  # edge-tts 음성 합성 실행기
│   ├── wav2lip/
│   │   ├── wav2lipService.js              # Wav2Lip API · 세션 관리
│   │   ├── wav2lip_server.py              # 상시 실행 Wav2Lip 추론 서버
│   │   └── wav2lip_runner.py              # Wav2Lip subprocess fallback
│   ├── face/
│   │   └── faceService.js                 # 얼굴 분석 데이터 수신
│   └── video/
│       └── videoCache.js                  # 생성된 영상 캐시 관리
│
├── gfpgan/
│   └── weights/                           # GFPGAN 얼굴 복원 모델 가중치
│       ├── detection_Resnet50_Final.pth
│       └── parsing_parsenet.pth
│
└── scripts/
    └── generate_avatar_videos.py          # 면접관 아바타 영상 사전 생성
```

---

## 시작하기 (로컬 개발)

### 사전 요구사항

| 항목 | macOS | Windows | Linux |
|------|-------|---------|-------|
| Node.js | 18+ | 18+ | 18+ |
| Python | 3.9+ | 3.9+ | 3.9+ |
| PostgreSQL | 필요 | 필요 | 필요 |
| LLM 런타임 | Ollama | Ollama | Ollama |
| STT | mlx-whisper | faster-whisper | faster-whisper |
| TTS | edge-tts | edge-tts | edge-tts |
| ffmpeg | 필요 | 필요 | 필요 |
| Wav2Lip | 선택 (fallback 가능) | 선택 (fallback 가능) | 선택 (fallback 가능) |

### 1. 저장소 클론

```bash
git clone https://github.com/yeop-2ee/ai-interview-assistant.git
cd ai-interview-assistant
```

### 2. 의존성 설치

```bash
# 프론트엔드
cd frontend && npm install

# 백엔드
cd ../backend && npm install

# AI 파이프라인
cd ../ai-pipeline && npm install

# 미디어 서비스
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

# 이메일 전송 (nodemailer + Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
```

**ai-pipeline/.env**
```env
PORT=5050
LLM_MODEL=gemma3:12b
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
npx prisma migrate deploy
npx prisma generate
```

### 5. LLM 서버 시작 (Ollama — 전 플랫폼 공통)

**macOS / Linux**

```bash
# Ollama 설치 (최초 1회)
curl -fsSL https://ollama.com/install.sh | sh

# 모델 다운로드
ollama pull gemma3:12b

# Ollama 서버는 설치 시 자동 실행됨
```

**Windows**

```bash
# https://ollama.com 에서 설치 파일 다운로드 후 실행

# 모델 다운로드 (PowerShell 또는 cmd)
ollama pull gemma3:12b
```

### 6. 서버 실행

터미널 4개를 열어 각각 실행합니다.

```bash
# 1. 프론트엔드
cd frontend && npm run dev              # http://localhost:3000

# 2. 백엔드
cd backend && npx ts-node src/server.ts # http://localhost:3001

# 3. 미디어 서비스
cd media-service && npm start           # http://localhost:4000

# 4. AI 파이프라인
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
| 권장 LLM 모델 | gemma3:12b |

### Nginx 설정 (`/etc/nginx/conf.d/app.conf`)

```nginx
server {
    client_max_body_size 20m;
    listen 80;
    server_name _;

    # SSE: 세션 만료 즉시 push (버퍼링 비활성화 필수)
    location /api/auth/events {
        proxy_pass http://localhost:3001/auth/events;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;
        proxy_cache off;
    }
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
    location /ai/ {
        proxy_pass http://localhost:5050/;
        proxy_set_header Host $host;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        proxy_buffering off;
    }
    location /media/ {
        proxy_pass http://localhost:4000/;
        proxy_set_header Host $host;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_read_timeout 300s;
    }
}
```

### EC2 환경변수

**backend/.env**
```env
PORT=3001
DATABASE_URL=postgresql://user:password@your-rds-endpoint:5432/ai_interview?sslmode=no-verify
AI_SERVER_URL=http://localhost:5050
MEDIA_SERVER_URL=http://localhost:4000

# 이메일 전송 (nodemailer + Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
```

**frontend/.env.local**
```env
NEXT_PUBLIC_BACKEND_URL=http://<EC2-PUBLIC-IP>/api
NEXT_PUBLIC_MEDIA_API=http://<EC2-PUBLIC-IP>/media
```

**ai-pipeline/.env**
```env
PORT=5050
LLM_MODEL=gemma3:12b
```

### PM2 실행

```bash
# 백엔드
pm2 start "npx ts-node src/server.ts" --name backend --cwd /data/app/backend

# AI 파이프라인
cd /data/app/ai-pipeline && pm2 start aiServer.js --name ai-pipeline

# 미디어 서비스
pm2 start "node mediaServer.js" --name media-service --cwd /data/app/media-service

# 프론트엔드
pm2 start "npm run start" --name frontend --cwd /data/app/frontend

# 재시작 시 자동 실행 등록
pm2 save && pm2 startup
```

### Ollama GPU 설정

```bash
# NVIDIA 드라이버 설치 확인
nvidia-smi

# Ollama 설치
curl -fsSL https://ollama.com/install.sh | sh

# 모델 다운로드
ollama pull gemma3:12b

# GPU 사용 확인 (ollama 프로세스가 GPU 메모리를 점유하면 정상)
nvidia-smi
```

### LLM 모델 선택 가이드 (Tesla T4 16GB 기준)

| 모델 | VRAM 사용량 | 특징 |
|------|------------|------|
| `gemma3:12b` | ~8GB | 권장 — 한국어 양호, 추론 우수 |
| `llama3.2:11b` | ~8GB | 멀티모달 지원 |
| `gemma3:9b` | ~5GB | 가볍고 빠름 |
| `phi4` | ~9GB | Microsoft 14B, 추론 강함 |
| `gemma3:27b` | ~17GB | VRAM 초과로 사용 불가 |

---

## 기능 상세

### 이력서 업로드 및 AI 분석

- PDF / DOCX 파일 드래그&드롭 또는 클릭 업로드
- 업로드 즉시 **AI 요약 분석** 카드 생성 (이름·한줄소개·기술스택·경력·학력·프로젝트·강점)
- **학과 관련성 검사**: AI가 이력서 내용을 그룹 분류하여 선택 학과와 비교
  - 불일치 시 빨간 경고 + "다음" 버튼 비활성화
  - 일치 시 정상 진행

### 실시간 AI 화상 면접

- 카메라·마이크 장치 직접 선택 가능
- **화면 레이아웃**: 화면 분할 / PiP / 면접관 전체화면 중 선택
- 최대 답변 시간 90초, 10초 이후 **답변 종료** 버튼 활성화
- 녹음 종료 → STT 변환 → **답변 검토 UI** (텍스트 수정 / 재답변 / 다음 질문)
- **다음 질문** 클릭 시:
  1. 답변 분석 후 꼬리질문 필요 여부 판단
  2. 다음 질문 립싱크 영상 생성 (병렬)
  3. 마지막 질문이면 종료 멘트 영상 즉시 재생
- 면접 종료 시 세션 임시 파일 즉시 삭제

### 면접관 아바타

- 면접관 스타일(친절·압박·교수형·실무형)에 따라 다른 아바타 이미지 사용
- Wav2Lip 립싱크 영상 실시간 생성
- ffmpeg unsharp 필터로 화질 보정

### AI 꼬리질문 생성 (비활성화)

- 답변이 충분히 완결되거나 깊이 있으면 꼬리질문 생성 안 함 (null)
- 꼬리질문이 필요한 경우:
  - 동문서답 → "방금 질문은 ~에 관한 것이었는데..." 형식으로 재안내
  - 근거·사례 부족 → 구체화 유도 질문

### 결과 리포트

| 항목 | 내용 |
|------|------|
| 종합 점수 | 100점 만점 |
| 영역별 점수 | 답변내용 · 논리구조 · 전달력 · 신뢰도 · 호감도 |
| 강점 / 약점 | AI 분석 기반 피드백 |
| 실제 면접 주의사항 | 면접 시 유의해야 할 행동 패턴 |
| 질문별 상세 피드백 | 답변 적절성 · 답변 길이 평가 · 개선 답변 예시 · 예상 꼬리질문 |
| 적합도 평가 | 직무 · 조직 · 기업 적합도 |
| PDF 다운로드 | 리포트 전체 파일 저장 |

### 얼굴 분석 (MediaPipe)

- 분석 주기: 200ms
- **시선 감지**: 코·볼 랜드마크 상대 위치 비교 → 정면 / 좌 / 우 / 위 / 아래
- **눈 깜빡임**: EAR(Eye Aspect Ratio) 기반 횟수 측정
