# AI Interview Assistant

> AI 기반 실시간 면접 연습 서비스

이력서·자기소개서를 업로드하면 AI가 직무 맞춤형 면접 질문을 생성하고, AI 면접관 아바타와 실시간 화상 면접을 진행한 뒤, 상세한 결과 리포트를 제공합니다.

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
AI 맞춤 질문 생성 (Ollama 2-Pass)
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
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss)

| 기술 | 용도 |
|------|------|
| Next.js 16 + React 18 + TypeScript | 프레임워크 |
| Tailwind CSS v4 | 스타일링 |
| MediaPipe FaceLandmarker | 실시간 얼굴·시선 분석 |
| MediaRecorder API | 음성 녹음 |
| Web Audio API | 마이크 레벨 감지 |
| dom-to-image-more + jsPDF | 리포트 PDF 다운로드 |

### Backend
![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-336791?logo=postgresql)

| 기술 | 용도 |
|------|------|
| Node.js + Express + TypeScript | 서버 |
| Prisma 7 + PostgreSQL | ORM + 데이터베이스 |
| bcrypt | 비밀번호 해싱 |
| pdf-parse / mammoth | PDF / DOCX 텍스트 추출 |

### AI Pipeline
![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)

| 기술 | 용도 |
|------|------|
| Ollama | 로컬 LLM 실행 환경 |
| EEVE-Korean-Instruct-10.8B | 한국어 특화 로컬 LLM |
| Express + SSE | 스트리밍 응답 |

**AI 생성 엔드포인트**

| 엔드포인트 | 설명 |
|-----------|------|
| `POST /generate/questions` | 면접 질문 생성 (2-Pass SSE 스트리밍) |
| `POST /generate/summary` | 이력서 요약 분석 (SSE 스트리밍) |
| `POST /generate/relevance` | 이력서-학과 관련성 AI 판단 |
| `POST /generate/followup` | 꼬리질문 생성 (필요 시에만) |
| `POST /generate/report` | 면접 결과 리포트 생성 (SSE 스트리밍) |

### Media Service
![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)
![Python](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python)

| 기술 | 용도 |
|------|------|
| Express | API 라우팅 |
| mlx-whisper large-v3-turbo | 음성→텍스트 (Apple Silicon MPS) |
| ffmpeg | 오디오 전처리 |
| edge-tts (ko-KR-SunHiNeural) | 텍스트→음성 |
| Wav2Lip | 립싱크 영상 생성 (MPS 가속) |

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
│   ├── Modelfile                          # Ollama 모델 설정 (EEVE Korean 10.8B)
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

## 시작하기

### 사전 요구사항

- Node.js 18+
- Python 3.9+ (Apple Silicon 권장)
- PostgreSQL
- Ollama
- ffmpeg
- Wav2Lip (별도 설치)

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

# Python 패키지
pip install mlx-whisper edge-tts
```

### 3. 환경변수 설정

**frontend/.env.local**
```env
NEXT_PUBLIC_MEDIA_API=http://localhost:4000
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

**backend/.env**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ai_interview
JWT_SECRET=your_jwt_secret
AI_SERVER_URL=http://localhost:5050
MEDIA_SERVER_URL=http://localhost:4000
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

### 5. Ollama 모델 등록

```bash
cd ai-pipeline
ollama create ai-interview-assistant -f Modelfile
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

# 4. AI 파이프라인 (Ollama 실행 후)
cd ai-pipeline && node aiServer.js      # http://localhost:5050
```

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
- Wav2Lip 립싱크 영상 실시간 생성 (Apple Silicon MPS 가속)
- ffmpeg unsharp 필터로 화질 보정

### AI 꼬리질문 생성

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
