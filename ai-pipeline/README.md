# AI Pipeline

LLM 기반 AI 질문 생성·분석 서버입니다. (포트 5050)

OS를 자동 감지하여 macOS에서는 MLX LM Server, Windows에서는 Ollama를 사용합니다.

## 기술 스택

| 기술 | 용도 |
|------|------|
| Node.js 18+ | 런타임 |
| Express 4.x | API 서버 + SSE 스트리밍 |
| openai SDK | LLM 서버 OpenAI 호환 API 클라이언트 |
| **macOS** mlx-lm | MLX LM Server (Apple Silicon MPS) |
| **Windows** Ollama | 로컬 LLM 추론 서버 |

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/generate/questions` | 면접 질문 생성 (SSE 스트리밍) |
| POST | `/generate/summary` | 이력서 요약 분석 (SSE 스트리밍) |
| POST | `/generate/relevance` | 이력서-학과 관련성 판단 |
| POST | `/generate/followup` | 꼬리질문 생성 |
| POST | `/generate/report` | 면접 결과 리포트 생성 (SSE 스트리밍) |

## 환경변수 설정

`.env` 파일을 생성합니다. OS 자동 감지로 기본값이 설정되므로 아래 값은 모두 선택 사항입니다.

```env
PORT=5050

# macOS — MLX LM Server 사용 시
# MLX_SERVER_URL=http://localhost:8080
# MLX_MODEL=mlx-community/Meta-Llama-3.1-8B-Instruct-4bit

# Windows — Ollama 사용 시
# LLM_SERVER_URL=http://localhost:11434
# LLM_MODEL=llama3.1:8b
```

## 설치 및 실행

### macOS (Apple Silicon) — MLX LM Server

```bash
# 1. Python 패키지 설치 (최초 1회)
pip install mlx-lm

# 2. 의존성 설치
npm install

# 3. MLX LM 서버 시작 (터미널 1) — 모델 첫 실행 시 자동 다운로드 (~4GB)
bash start_mlx_server.sh

# 4. AI Pipeline 서버 시작 (터미널 2)
node aiServer.js   # http://localhost:5050
```

### Windows — Ollama

```powershell
# 1. Ollama 설치: https://ollama.com

# 2. 의존성 설치
npm install

# 3. Ollama 서버 및 모델 시작 (터미널 1)
powershell -ExecutionPolicy Bypass -File start_ollama_server.ps1

# 4. AI Pipeline 서버 시작 (터미널 2)
node aiServer.js   # http://localhost:5050
```

## 면접관 스타일

| 스타일 | 설명 |
|--------|------|
| `friendly` | 부드럽고 편안한 개방형 질문 |
| `pressure` | 날카롭고 압박적인 반론형 질문 |
| `professor` | 개념 원리를 파고드는 학문적 질문 |
| `practical` | 실무 상황 시나리오 기반 질문 |
| `random` | 위 4가지 중 랜덤 선택 |
