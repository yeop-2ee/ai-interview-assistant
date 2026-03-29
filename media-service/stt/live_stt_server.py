"""
live_stt_server.py
WhisperLiveKit 기반 실시간 STT 서버 (CPU 전용)

설치:
  pip install whisperlivekit uvicorn fastapi

실행:
  python stt/live_stt_server.py

WebSocket 엔드포인트:
  ws://localhost:8000/asr
"""

import sys

sys.argv = [
    "live_stt_server",
    "--model", "small",
    "--language", "ko",
    "--host", "0.0.0.0",
    "--port", "8000",
    "--pcm-input",
    "--backend-policy", "localagreement",
    "--backend", "whisper",
    "--no-vac",
    "--init-prompt", "면접 질문에 대한 답변입니다. 백엔드, 프론트엔드, 풀스택, 개발자, 지원 동기, 자기소개.",
]

from whisperlivekit.basic_server import main

if __name__ == "__main__":
    main()
