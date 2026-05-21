#!/usr/bin/env python3
"""
배치 STT: 오디오 파일 → 텍스트 변환

macOS  : mlx-whisper (Apple Silicon MPS 가속)
Windows: faster-whisper (CPU / CUDA)
"""
import sys
import json
import re
import os
import platform
import subprocess
import tempfile

IS_MAC = platform.system() == 'Darwin'

if IS_MAC:
    try:
        import mlx_whisper
    except ImportError:
        print(json.dumps({"error": "mlx-whisper가 설치되지 않았습니다. pip install mlx-whisper 실행 후 재시도하세요."}))
        sys.exit(1)
else:
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print(json.dumps({"error": "faster-whisper가 설치되지 않았습니다. pip install faster-whisper 실행 후 재시도하세요."}))
        sys.exit(1)

HALLUCINATION_PHRASES = [
    "MBC", "KBS", "SBS", "JTBC", "TV조선", "채널A",
    "자막 제공", "자막", "구독", "좋아요", "알림 설정",
    "다음 영상", "영상 시청", "시청해 주셔서", "감사합니다",
    "번역", "제공",
    "music", "Music", "MUSIC",
    "( 음악 )", "(음악)", "[ 음악 ]", "[음악]",
    "♪", "♫",
]

HALLUCINATION_SENT_RE = re.compile(
    r'(구독|좋아요|알림|시청해\s*주|다음\s*영상|자막|번역)[^\s]*'
)


def postprocess(text: str) -> str:
    if not text:
        return text
    text = re.sub(
        r'[\(\[（【《「]\s*(?:음악|박수|웃음|효과음|잡음|소음|침묵|music|noise|applause|laughter)\s*[\)\]）】》」]',
        '', text, flags=re.IGNORECASE,
    )
    for phrase in HALLUCINATION_PHRASES:
        text = text.replace(phrase, '')
    text = HALLUCINATION_SENT_RE.sub('', text)
    text = re.sub(r'^[\s\-–—]+', '', text).strip()
    text = re.sub(r'(.{6,})\1+', r'\1', text)
    text = re.sub(r'\s{2,}', ' ', text).strip()
    return text


def convert_to_wav(input_path: str) -> str:
    """WebM/Opus → WAV 16kHz 모노 변환 + 오디오 전처리"""
    wav_path = tempfile.mktemp(suffix='.wav')
    audio_filter = (
        "highpass=f=80,"
        "lowpass=f=8000,"
        "afftdn=nf=-20,"
        "loudnorm=I=-14:TP=-1.5"
    )
    cmd = ['ffmpeg', '-y', '-i', input_path, '-af', audio_filter,
           '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav_path]
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(f'ffmpeg 변환 실패: {result.stderr.decode()}')
    return wav_path


def transcribe_macos(audio_path: str) -> dict:
    """macOS: mlx-whisper 사용 (Apple Silicon MPS)"""
    model = os.environ.get("WHISPER_MODEL", "mlx-community/whisper-large-v3-turbo")
    result = mlx_whisper.transcribe(
        audio_path,
        path_or_hf_repo=model,
        language="ko",
        initial_prompt="이것은 한국어 면접 답변입니다.",
        word_timestamps=False,
        verbose=False,
        temperature=0.0,
        condition_on_previous_text=False,
        no_speech_threshold=0.7,
        compression_ratio_threshold=2.4,
    )
    return {"text": result["text"].strip()}


def transcribe_windows(audio_path: str) -> dict:
    """Windows/Linux: faster-whisper 사용 (CPU / CUDA)"""
    try:
        import torch
        import ctranslate2
        device = "cuda" if torch.cuda.is_available() and ctranslate2.get_cuda_device_count() > 0 else "cpu"
    except Exception:
        device = "cpu"
    compute = "float16" if device == "cuda" else "int8"
    model_size = os.environ.get("WHISPER_MODEL", "large-v3-turbo")
    model = WhisperModel(model_size, device=device, compute_type=compute)
    segments, _ = model.transcribe(
        audio_path,
        language="ko",
        initial_prompt="이것은 한국어 면접 답변입니다.",
        temperature=0.0,
        condition_on_previous_text=False,
        no_speech_threshold=0.7,
        compression_ratio_threshold=2.4,
        beam_size=5,
    )
    text = " ".join(seg.text for seg in segments).strip()
    return {"text": text}


def transcribe(audio_path: str) -> dict:
    wav_path = None
    try:
        wav_path = convert_to_wav(audio_path)
        transcribe_path = wav_path
    except Exception:
        transcribe_path = audio_path

    try:
        if IS_MAC:
            result = transcribe_macos(transcribe_path)
        else:
            result = transcribe_windows(transcribe_path)
    finally:
        if wav_path and os.path.exists(wav_path):
            os.unlink(wav_path)

    raw = result["text"]
    cleaned = postprocess(raw)
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
