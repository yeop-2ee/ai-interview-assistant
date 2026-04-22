"""
면접 질문별 아바타 립싱크 영상 사전 생성 스크립트

사용법:
  cd /Users/sangyeop/Desktop/ai-interview-assistant
  python3 scripts/generate_avatar_videos.py

생성 결과: frontend/public/avatar_videos/{key}.mp4 (7개)

속도 최적화:
  - Phase 1: TTS + WAV 변환 전체 병렬 실행
  - Phase 2: Wav2Lip 순차 실행 (MPS 단독 사용)
  - Phase 3: ffmpeg unsharp 화질 보정 병렬 실행 (GFPGAN 대체, ~0.5초/영상)
"""

import subprocess
import os
import sys
import shutil
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed

# ── 경로 설정 ──────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AVATAR_SRC  = os.path.join(BASE_DIR, "frontend", "public", "avatar.png")
OUTPUT_DIR  = os.path.join(BASE_DIR, "frontend", "public", "avatar_videos")
WAV2LIP_DIR = os.environ.get("WAV2LIP_DIR", os.path.expanduser("~/Desktop/Wav2Lip"))
CHECKPOINT  = os.path.join(WAV2LIP_DIR, "checkpoints", "wav2lip_gan.pth")
TMP_DIR     = "/tmp/avatar_gen"

# ── 생성할 텍스트 목록 ──────────────────────────────────
# q0, done: PRERENDERED 맵에서 직접 사용
SCRIPTS = {
    "q0":   "안녕하세요. 간단한 자기소개 부탁드립니다.",
    "done": "모든 질문이 끝났습니다. 오늘 면접 정말 수고하셨습니다!",
}

TTS_RUNNER = os.path.join(BASE_DIR, "media-service", "tts", "tts_runner.py")


# ── 단계별 함수 ────────────────────────────────────────

def tts_and_wav(key: str, text: str) -> str:
    """TTS → mp3 → wav 변환 (병렬 실행용)"""
    mp3_path = os.path.join(TMP_DIR, f"{key}.mp3")
    wav_path = os.path.join(TMP_DIR, f"{key}.wav")

    result = subprocess.run(
        [sys.executable, TTS_RUNNER, text, mp3_path],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(f"TTS 실패 ({key}): {result.stderr}")

    subprocess.run(
        ["ffmpeg", "-y", "-i", mp3_path,
         "-ar", "16000", "-ac", "1", "-f", "wav", wav_path],
        check=True, capture_output=True
    )
    return key


def run_wav2lip(key: str) -> str:
    """Wav2Lip 립싱크 렌더링 (MPS, 순차 실행)"""
    wav_path = os.path.join(TMP_DIR, f"{key}.wav")
    out_path = os.path.join(TMP_DIR, f"{key}.mp4")

    subprocess.run(
        [sys.executable, "inference.py",
         "--checkpoint_path", CHECKPOINT,
         "--face", AVATAR_SRC,
         "--audio", wav_path,
         "--outfile", out_path,
         "--static", "True",
         "--wav2lip_batch_size", "128",
         "--nosmooth"],
        cwd=WAV2LIP_DIR,
        check=True
    )
    return key


def sharpen_and_finalize(key: str) -> str:
    """ffmpeg unsharp로 화질 보정 후 최종 위치로 이동 (병렬 실행용)"""
    tmp_path = os.path.join(TMP_DIR, f"{key}.mp4")
    out_path = os.path.join(OUTPUT_DIR, f"{key}.mp4")

    subprocess.run(
        ["ffmpeg", "-y", "-i", tmp_path,
         "-vf", "unsharp=5:5:1.2:5:5:0.0",
         "-c:v", "libx264", "-preset", "fast", "-crf", "18",
         "-c:a", "copy",
         out_path],
        check=True, capture_output=True
    )
    os.remove(tmp_path)
    return key


# ── 메인 ──────────────────────────────────────────────

def main():
    os.makedirs(TMP_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    pending = [
        (key, text) for key, text in SCRIPTS.items()
        if not os.path.exists(os.path.join(OUTPUT_DIR, f"{key}.mp4"))
    ]

    if not pending:
        print("모든 영상이 이미 존재합니다.")
        return

    print(f"생성할 영상: {len(pending)}개\n")

    # ── Phase 1: TTS + WAV 변환 (전체 병렬) ───────────
    print(f"=== Phase 1: TTS + WAV 변환 (병렬 {len(pending)}개) ===")
    with ThreadPoolExecutor(max_workers=len(pending)) as executor:
        futures = {executor.submit(tts_and_wav, key, text): key for key, text in pending}
        for future in as_completed(futures):
            key = futures[future]
            try:
                future.result()
                print(f"  {key} TTS 완료")
            except Exception as e:
                print(f"  {key} TTS 실패: {e}")

    # ── Phase 2: Wav2Lip (순차, MPS) ──────────────────
    print(f"\n=== Phase 2: Wav2Lip 렌더링 (순차, MPS) ===")
    wav2lip_done = []
    for key, _ in pending:
        wav_path = os.path.join(TMP_DIR, f"{key}.wav")
        if not os.path.exists(wav_path):
            print(f"  {key} WAV 없음, 건너뜀")
            continue
        print(f"  {key} 렌더링 중...")
        try:
            run_wav2lip(key)
            wav2lip_done.append(key)
            print(f"  {key} 완료")
        except Exception as e:
            print(f"  {key} 실패: {e}")

    # ── Phase 3: ffmpeg 화질 보정 (전체 병렬) ─────────
    print(f"\n=== Phase 3: 화질 보정 (병렬 {len(wav2lip_done)}개) ===")
    with ProcessPoolExecutor(max_workers=min(len(wav2lip_done), os.cpu_count())) as executor:
        futures = {executor.submit(sharpen_and_finalize, key): key for key in wav2lip_done}
        for future in as_completed(futures):
            key = futures[future]
            try:
                future.result()
                print(f"  {key} 완료 → {OUTPUT_DIR}/{key}.mp4")
            except Exception as e:
                print(f"  {key} 실패: {e}")
                # 보정 실패 시 원본 그대로 이동
                tmp = os.path.join(TMP_DIR, f"{key}.mp4")
                if os.path.exists(tmp):
                    shutil.move(tmp, os.path.join(OUTPUT_DIR, f"{key}.mp4"))

    print(f"\n모든 영상 생성 완료! ({OUTPUT_DIR})")
    shutil.rmtree(TMP_DIR, ignore_errors=True)


if __name__ == "__main__":
    for check, label in [(AVATAR_SRC, "avatar.png"), (CHECKPOINT, "Wav2Lip 모델"), (WAV2LIP_DIR, "Wav2Lip 폴더")]:
        if not os.path.exists(check):
            print(f"오류: {label} 를 찾을 수 없습니다: {check}")
            sys.exit(1)

    if not os.path.exists(TTS_RUNNER):
        print(f"오류: tts_runner.py를 찾을 수 없습니다: {TTS_RUNNER}")
        sys.exit(1)

    main()
