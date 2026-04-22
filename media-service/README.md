# Media Service

STT · TTS · Wav2Lip API 서버입니다. (포트 4000)

OS를 자동 감지하여 macOS에서는 mlx-whisper, Windows에서는 faster-whisper를 사용합니다.

## 기술 스택

| 기술 | 플랫폼 | 용도 |
|------|--------|------|
| Node.js 18+ | 공통 | 런타임 |
| Express 4.x | 공통 | API 라우팅 |
| edge-tts | 공통 | 텍스트 → 음성 (ko-KR-SunHiNeural) |
| Wav2Lip | 공통 | 립싱크 영상 생성 |
| ffmpeg | 공통 | 오디오·영상 전처리 |
| mlx-whisper | macOS | 음성 → 텍스트 (Apple Silicon MPS) |
| faster-whisper | Windows | 음성 → 텍스트 (CPU / CUDA) |

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/stt/transcribe` | 음성 파일 → 텍스트 |
| POST | `/api/tts/synthesize` | 텍스트 → 음성 |
| POST | `/api/wav2lip/synthesize` | 텍스트 → 립싱크 영상 |
| GET | `/api/wav2lip/video/:filename` | 생성된 영상 스트리밍 |
| GET | `/health` | 서비스 상태 확인 |

## 사전 준비

### 1. ffmpeg 설치

```bash
# macOS
brew install ffmpeg

# Windows (winget)
winget install ffmpeg
# 또는 https://ffmpeg.org 에서 직접 다운로드 후 PATH에 추가
```

### 2. Python 패키지 설치

```bash
# macOS
pip install mlx-whisper edge-tts

# Windows
pip install faster-whisper edge-tts torch
```

### 3. Wav2Lip 설치

```bash
# macOS / Windows 공통
git clone https://github.com/Rudrabha/Wav2Lip.git
cd Wav2Lip
python3 -m venv .venv

# macOS
source .venv/bin/activate

# Windows
.venv\Scripts\activate

pip install --upgrade pip
pip install -r requirements.txt
```

체크포인트 파일(`wav2lip_gan.pth`)을 `Wav2Lip/checkpoints/`에 배치합니다.

## 환경변수 설정

`media-service/.env` 파일을 생성합니다.

```env
PORT=4000

# Wav2Lip venv 사용 시 해당 Python 경로로 변경 (자동 감지: macOS=python3, Windows=python)
# PYTHON_PATH=/path/to/Wav2Lip/.venv/bin/python  (macOS)
# PYTHON_PATH=C:\path\to\Wav2Lip\.venv\Scripts\python.exe  (Windows)

# Wav2Lip 경로 (미설정 시 fallback 모드로 동작)
WAV2LIP_INFERENCE_PATH=/absolute/path/to/Wav2Lip/inference.py
WAV2LIP_CHECKPOINT_PATH=/absolute/path/to/Wav2Lip/checkpoints/wav2lip_gan.pth
```

## 설치 및 실행

```bash
npm install
npm start      # http://localhost:4000
```

> Wav2Lip 경로 미설정 시 **fallback 모드** (정지 이미지 + 오디오)로 동작합니다.
