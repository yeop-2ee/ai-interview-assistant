import json
import os
import subprocess
import sys


def run_cmd(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "command failed")


def run_wav2lip(face_path, audio_path, output_path):
    inference_path = os.environ.get("WAV2LIP_INFERENCE_PATH", "").strip()
    checkpoint_path = os.environ.get("WAV2LIP_CHECKPOINT_PATH", "").strip()

    if not inference_path or not os.path.isfile(inference_path):
        return False
    if not checkpoint_path or not os.path.isfile(checkpoint_path):
        return False

    cmd = [
        sys.executable,
        inference_path,
        "--checkpoint_path", checkpoint_path,
        "--face", face_path,
        "--audio", audio_path,
        "--outfile", output_path,
        "--resize_factor", "2",
        "--nosmooth",
        "--face_det_batch_size", "16",
        "--wav2lip_batch_size", "256",
    ]
    run_cmd(cmd)
    return True


def run_fallback_video(face_path, audio_path, output_path):
    # Wav2Lip 환경이 없을 때도 프론트 동작 검증이 가능하도록 정지 이미지 + 오디오 mp4를 생성
    cmd = [
        "ffmpeg",
        "-y",
        "-loop",
        "1",
        "-i",
        face_path,
        "-i",
        audio_path,
        "-vf",
        "scale=trunc(iw/2)*2:trunc(ih/2)*2",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        output_path,
    ]
    run_cmd(cmd)


def main():
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Usage: wav2lip_runner.py <face> <audio> <output>"}))
        sys.exit(1)

    face_path = sys.argv[1]
    audio_path = sys.argv[2]
    output_path = sys.argv[3]

    if not os.path.isfile(face_path):
        print(json.dumps({"error": f"face not found: {face_path}"}))
        sys.exit(1)
    if not os.path.isfile(audio_path):
        print(json.dumps({"error": f"audio not found: {audio_path}"}))
        sys.exit(1)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        used_wav2lip = False
        try:
            used_wav2lip = run_wav2lip(face_path, audio_path, output_path)
        except Exception:
            # Wav2Lip 추론 실패 시에도 서비스 중단 대신 fallback 비디오를 생성한다.
            used_wav2lip = False

        if not used_wav2lip:
            run_fallback_video(face_path, audio_path, output_path)
        print(json.dumps({"success": True, "mode": "wav2lip" if used_wav2lip else "fallback"}))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
