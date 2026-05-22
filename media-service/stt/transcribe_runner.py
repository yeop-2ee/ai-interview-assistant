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

_platform = platform.system()
IS_MACOS = _platform == 'Darwin'
IS_WINDOWS = _platform == 'Windows'
# Linux 포함 그 외 → faster-whisper 사용

if IS_MACOS:
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

NO_SPEECH_THRESHOLD = 0.6
AVG_LOGPROB_THRESHOLD = -1.0


def postprocess(text: str) -> str:
    if not text:
        return text
    text = re.sub(r'(.{6,})\1+', r'\1', text)
    text = re.sub(r'\s{2,}', ' ', text).strip()
    return text


def convert_to_wav(input_path: str) -> str:
    """WebM/Opus → WAV 16kHz 모노 변환 + 오디오 전처리"""
    fd, wav_path = tempfile.mkstemp(suffix='.wav')
    os.close(fd)
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
        no_speech_threshold=0.6,
        compression_ratio_threshold=2.4,
    )
    segments = result.get("segments", [])
    if segments:
        avg_no_speech = sum(s.get("no_speech_prob", 0.0) for s in segments) / len(segments)
        avg_logprob = sum(s.get("avg_logprob", 0.0) for s in segments) / len(segments)
        if avg_no_speech >= NO_SPEECH_THRESHOLD or avg_logprob < AVG_LOGPROB_THRESHOLD:
            return {"text": ""}
    return {"text": result["text"].strip()}


def transcribe_windows(audio_path: str) -> dict:
    """Windows: faster-whisper 사용 (CPU / CUDA)"""
    try:
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"
    except ImportError:
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
        no_speech_threshold=0.6,
        compression_ratio_threshold=2.4,
        beam_size=5,
    )
    segments_list = list(segments)
    if not segments_list:
        return {"text": ""}
    avg_no_speech = sum(s.no_speech_prob for s in segments_list) / len(segments_list)
    avg_logprob = sum(s.avg_logprob for s in segments_list) / len(segments_list)
    if avg_no_speech >= NO_SPEECH_THRESHOLD or avg_logprob < AVG_LOGPROB_THRESHOLD:
        return {"text": ""}
    text = " ".join(seg.text for seg in segments_list).strip()
    return {"text": text}


def transcribe(audio_path: str) -> dict:
    wav_path = None
    try:
        wav_path = convert_to_wav(audio_path)
        transcribe_path = wav_path
    except Exception:
        transcribe_path = audio_path

    try:
        if IS_MACOS:
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
