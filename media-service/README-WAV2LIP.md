# Wav2Lip Local Setup (media-service)

`media-service`에서 로컬로 Wav2Lip을 실행하기 위한 최소 가이드입니다.

## 1) 필수 준비

- Python 3.9~3.11
- `ffmpeg` 설치
- Wav2Lip 저장소 + 체크포인트 파일

macOS(Homebrew) 예시:

```bash
brew install ffmpeg
```

## 2) Wav2Lip 저장소 준비

원하는 위치에 Wav2Lip을 설치합니다.

```bash
cd ~
git clone https://github.com/Rudrabha/Wav2Lip.git
cd Wav2Lip
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

체크포인트(`wav2lip_gan.pth` 또는 `wav2lip.pth`)를 `checkpoints/`에 둡니다.

## 3) media-service 환경변수 연결

`media-service/.env`에 아래 값을 채웁니다.

```env
PYTHON_PATH=python3
WAV2LIP_INFERENCE_PATH=/Users/<you>/Wav2Lip/inference.py
WAV2LIP_CHECKPOINT_PATH=/Users/<you>/Wav2Lip/checkpoints/wav2lip_gan.pth
```

- `PYTHON_PATH`는 Wav2Lip 의존성이 설치된 Python 실행파일을 가리켜야 합니다.
- 예: `/Users/<you>/Wav2Lip/.venv/bin/python`

## 4) media-service 실행

```bash
cd /path/to/ai-interview-assistant/media-service
npm install
npm run dev
```

## 5) 동작 확인

면접 화면에서 AI 발화가 시작되면:

- `POST /api/wav2lip/synthesize` 호출
- `frontend/public/avatar.jpeg`를 얼굴 입력으로 사용
- 생성된 결과를 `/api/wav2lip/video/:filename`로 재생

환경변수가 비어 있거나 경로가 틀리면, 현재 구현은 fallback 모드(`ffmpeg 정지 이미지 + 오디오`)로 동작합니다.
