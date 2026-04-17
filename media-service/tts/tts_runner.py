"""
tts_runner.py
Node.js에서 child_process로 호출되는 edge-tts 실행 스크립트

설치:
  pip install edge-tts

사용:
  python tts_runner.py <text> <output_path> [voice]

음성 옵션:
  ko-KR-SunHiNeural   (여성, 기본값)
  ko-KR-InJoonNeural  (남성)
"""

import sys
import json
import asyncio
import edge_tts


async def synthesize(text: str, output_path: str, voice: str) -> None:
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "사용법: tts_runner.py <text> <output_path> [voice]"}))
        sys.exit(1)

    text = sys.argv[1]
    output_path = sys.argv[2]
    voice = sys.argv[3] if len(sys.argv) > 3 else "ko-KR-SunHiNeural"

    try:
        asyncio.run(synthesize(text, output_path, voice))
        print(json.dumps({"success": True, "outputPath": output_path, "voice": voice}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
