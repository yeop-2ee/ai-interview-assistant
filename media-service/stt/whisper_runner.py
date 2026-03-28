"""
whisper_runner.py
Node.js에서 child_process로 호출되는 Whisper STT 실행 스크립트

설치:
  pip install openai-whisper

사용:
  python whisper_runner.py <audio_file_path> [model_name]
"""

import sys
import json
import whisper


def transcribe(audio_path: str, model_name: str = "base") -> dict:
    model = whisper.load_model(model_name)
    result = model.transcribe(audio_path, language="ko", initial_prompt="면접 질문에 대한 답변입니다. 백엔드, 프론트엔드, 풀스택, 개발자, 지원 동기, 자기소개, 장단점, 직무 경험, 소프트웨어, 프레임워크, 데이터베이스 등에 대해 이야기합니다.")
    return {
        "text": result["text"].strip(),
        "language": result.get("language", "ko"),
        "segments": [
            {
                "start": seg["start"],
                "end": seg["end"],
                "text": seg["text"].strip(),
            }
            for seg in result.get("segments", [])
        ],
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "음성 파일 경로를 입력하세요."}))
        sys.exit(1)

    audio_path = sys.argv[1]
    model_name = sys.argv[2] if len(sys.argv) > 2 else "base"

    try:
        result = transcribe(audio_path, model_name)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
