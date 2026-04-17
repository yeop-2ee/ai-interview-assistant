#!/usr/bin/env python3
"""
배치 STT: 오디오 파일 → 텍스트 변환
모델: mlx-community/whisper-large-v3-turbo
후처리: kiwipiepy 띄어쓰기 교정 + 환각/반복 제거
"""
import sys
import json
import re
import os
import subprocess
import tempfile
import mlx_whisper

# Whisper 환각 문구 (무음/노이즈 구간에서 자주 출력)
HALLUCINATION_PHRASES = [
    "MBC", "KBS", "SBS", "JTBC", "TV조선", "채널A",
    "자막 제공", "자막", "구독", "좋아요", "알림 설정",
    "다음 영상", "영상 시청", "시청해 주셔서", "감사합니다",
    "번역", "제공",
    "music", "Music", "MUSIC",
    "( 음악 )", "(음악)", "[ 음악 ]", "[음악]",
    "♪", "♫",
]

# Whisper가 자주 생성하는 환각 문장 패턴
HALLUCINATION_SENT_RE = re.compile(
    r'(구독|좋아요|알림|시청해\s*주|다음\s*영상|자막|번역)[^\s]*'
)


def postprocess(text: str) -> str:
    if not text:
        return text

    # 1. 괄호 태그 제거: 음악·박수·웃음 등 음향 효과 태그만 (일반 내용 오제거 방지)
    text = re.sub(
        r'[\(\[（【《「]\s*(?:음악|박수|웃음|효과음|잡음|소음|침묵|music|noise|applause|laughter)\s*[\)\]）】》」]',
        '',
        text,
        flags=re.IGNORECASE,
    )

    # 2. Whisper 환각 문구 제거
    for phrase in HALLUCINATION_PHRASES:
        text = text.replace(phrase, '')
    text = HALLUCINATION_SENT_RE.sub('', text)

    # 3. 앞뒤 대시/공백 제거 (기존 "-안녕하세요" 문제)
    text = re.sub(r'^[\s\-–—]+', '', text)
    text = text.strip()

    # 4. 문장 수준 반복 제거 (환각: 같은 문장이 2회 이상 반복)
    text = re.sub(r'(.{6,})\1+', r'\1', text)

    # 5. 연속 공백 정리
    text = re.sub(r'\s{2,}', ' ', text).strip()

    return text


def convert_to_wav(input_path: str) -> str:
    """WebM/Opus → WAV 16kHz 모노 변환 + 오디오 전처리"""
    wav_path = tempfile.mktemp(suffix='.wav')
    audio_filter = (
        "highpass=f=80,"           # 저음 잡음(책상 진동 등) 제거
        "lowpass=f=8000,"          # 8kHz 이상 고주파 잡음 제거
        "afftdn=nf=-20,"           # FFT 기반 노이즈 감소 (약하게 — 음성 손실 방지)
        "loudnorm=I=-14:TP=-1.5"   # 음량 정규화 (Whisper 최적 레벨, 약간 높게)
    )
    cmd = [
        'ffmpeg', '-y',
        '-i', input_path,
        '-af', audio_filter,
        '-ar', '16000',
        '-ac', '1',
        '-c:a', 'pcm_s16le',
        wav_path
    ]
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(f'ffmpeg 변환 실패: {result.stderr.decode()}')
    return wav_path


def transcribe(audio_path: str) -> dict:
    wav_path = None
    try:
        wav_path = convert_to_wav(audio_path)
        transcribe_path = wav_path
    except Exception:
        transcribe_path = audio_path  # 변환 실패 시 원본 사용

    model = os.environ.get("WHISPER_MODEL", "mlx-community/whisper-large-v3-turbo")
    result = mlx_whisper.transcribe(
        transcribe_path,
        path_or_hf_repo=model,
        language="ko",
        initial_prompt="이것은 한국어 면접 답변입니다.",
        word_timestamps=False,
        verbose=False,
        temperature=0.0,
        condition_on_previous_text=False,
        no_speech_threshold=0.7,   # 0.4 → 0.7: 더 많은 음성 인식 (빈 결과 방지)
        compression_ratio_threshold=2.4,
    )

    raw = result["text"].strip()
    cleaned = postprocess(raw)

    if wav_path and os.path.exists(wav_path):
        os.unlink(wav_path)

    return {"text": cleaned, "raw": raw}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "audio_path 인자가 필요합니다."}))
        sys.exit(1)

    try:
        output = transcribe(sys.argv[1])
        print(json.dumps(output, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        sys.exit(1)
