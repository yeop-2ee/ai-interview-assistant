"""
wav2lip_server.py  —  상시 실행 Wav2Lip 추론 서버

시작 시:
  1. Wav2Lip 모델을 메모리에 로드 (1회)
  2. 모든 아바타 이미지의 face detection 결과를 캐시 (1회)

요청 시:
  POST /synthesize  { "face": "<path>", "audio": "<path>", "output": "<path>" }
  → 로드된 모델로 즉시 추론 (모델 재로딩 없음)
"""

import json
import os
import sys
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = int(os.environ.get("WAV2LIP_SERVER_PORT", "19876"))
INFERENCE_PATH = os.environ.get("WAV2LIP_INFERENCE_PATH", "").strip()
CHECKPOINT_PATH = os.environ.get("WAV2LIP_CHECKPOINT_PATH", "").strip()
WAV2LIP_DIR = os.path.dirname(INFERENCE_PATH) if INFERENCE_PATH else ""
FRONTEND_PUBLIC_DIR = os.environ.get("FRONTEND_PUBLIC_DIR", "").strip()

# Wav2Lip 디렉토리를 경로에 추가
if WAV2LIP_DIR and WAV2LIP_DIR not in sys.path:
    sys.path.insert(0, WAV2LIP_DIR)

import numpy as np
import cv2
import torch
import audio as wav2lip_audio

from models import Wav2Lip
import face_detection as face_detection_module

IMG_SIZE = 96
MEL_STEP_SIZE = 16
WAV2LIP_BATCH_SIZE = 128
PADS = [0, 10, 0, 0]
MAX_FRAME_WIDTH = 1080  # 처리 해상도 상한 (원본이 크면 축소)

device = 'cuda' if torch.cuda.is_available() else ('mps' if torch.backends.mps.is_available() else 'cpu')

# 전역: 모델 및 face detection 캐시
_model = None
_face_cache = {}   # face_path → (y1, y2, x1, x2) — 리사이즈된 프레임 기준
_frame_cache = {}  # face_path → resized frame (ndarray)
_lock = threading.Lock()


def load_wav2lip_model(checkpoint_path):
    model = Wav2Lip()
    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=False)
    s = checkpoint["state_dict"]
    new_s = {k.replace('module.', ''): v for k, v in s.items()}
    model.load_state_dict(new_s)
    return model.to(device).eval()


def load_and_resize_frame(face_path):
    """이미지 로드 후 MAX_FRAME_WIDTH 이하로 리사이즈 (캐시됨)"""
    if face_path in _frame_cache:
        return _frame_cache[face_path]

    frame = cv2.imread(face_path)
    if frame is None:
        raise ValueError(f"이미지를 읽을 수 없습니다: {face_path}")
    h, w = frame.shape[:2]
    if w > MAX_FRAME_WIDTH:
        scale = MAX_FRAME_WIDTH / w
        frame = cv2.resize(frame, (MAX_FRAME_WIDTH, int(h * scale)))
    _frame_cache[face_path] = frame
    return frame


def detect_face(face_path):
    """얼굴 감지 결과 반환 (캐시됨) — 리사이즈된 프레임 기준 좌표"""
    if face_path in _face_cache:
        return _face_cache[face_path]

    frame = load_and_resize_frame(face_path)
    face_device = 'cpu' if device == 'mps' else device
    detector = face_detection_module.FaceAlignment(
        face_detection_module.LandmarksType._2D,
        flip_input=False, device=face_device
    )
    preds = detector.get_detections_for_batch(np.array([frame]))
    del detector

    pady1, pady2, padx1, padx2 = PADS
    rect = preds[0]
    if rect is None:
        raise ValueError("얼굴 감지 실패")

    y1 = max(0, rect[1] - pady1)
    y2 = min(frame.shape[0], rect[3] + pady2)
    x1 = max(0, rect[0] - padx1)
    x2 = min(frame.shape[1], rect[2] + padx2)

    result = (y1, y2, x1, x2)
    _face_cache[face_path] = result
    return result


def synthesize(face_path, audio_path, output_path):
    global _model

    if _model is None:
        _model = load_wav2lip_model(CHECKPOINT_PATH)

    frame = load_and_resize_frame(face_path)
    fps = 25.0

    # MP3 → WAV 변환 (ffmpeg)
    wav_path = audio_path.replace('.mp3', '_tmp.wav')
    subprocess.run(
        ['ffmpeg', '-y', '-i', audio_path, '-ar', '16000', '-ac', '1', wav_path],
        capture_output=True
    )

    wav = wav2lip_audio.load_wav(wav_path, 16000)
    mel = wav2lip_audio.melspectrogram(wav)
    os.remove(wav_path)

    mel_chunks = []
    mel_idx_multiplier = 80.0 / fps
    i = 0
    while True:
        start_idx = int(i * mel_idx_multiplier)
        if start_idx + MEL_STEP_SIZE > len(mel[0]):
            mel_chunks.append(mel[:, len(mel[0]) - MEL_STEP_SIZE:])
            break
        mel_chunks.append(mel[:, start_idx: start_idx + MEL_STEP_SIZE])
        i += 1

    y1, y2, x1, x2 = detect_face(face_path)
    full_frames = [frame.copy() for _ in mel_chunks]

    img_batch, mel_batch, frame_batch, coords_batch = [], [], [], []
    out_h, out_w = frame.shape[:2]
    tmp_avi = output_path.replace('.mp4', '_tmp.avi')
    # MJPG: macOS OpenCV에서 안정적으로 지원되며 빠른 인코딩
    out_writer = cv2.VideoWriter(tmp_avi, cv2.VideoWriter_fourcc(*'MJPG'), fps, (out_w, out_h))

    def flush_batch():
        ib = np.asarray(img_batch)
        mb = np.asarray(mel_batch)
        ib_masked = ib.copy()
        ib_masked[:, IMG_SIZE // 2:] = 0
        ib_in = np.concatenate((ib_masked, ib), axis=3) / 255.0
        mb_in = np.reshape(mb, [len(mb), mb.shape[1], mb.shape[2], 1])

        ib_t = torch.FloatTensor(np.transpose(ib_in, (0, 3, 1, 2))).to(device)
        mb_t = torch.FloatTensor(np.transpose(mb_in, (0, 3, 1, 2))).to(device)

        with torch.no_grad():
            pred = _model(mb_t, ib_t)

        pred = pred.cpu().numpy().transpose(0, 2, 3, 1) * 255.0
        for p, f, c in zip(pred, frame_batch, coords_batch):
            cy1, cy2, cx1, cx2 = c
            p = cv2.resize(p.astype(np.uint8), (cx2 - cx1, cy2 - cy1))
            f[cy1:cy2, cx1:cx2] = p
            out_writer.write(f)

    for i, m in enumerate(mel_chunks):
        f = full_frames[i]
        face = f[y1:y2, x1:x2]
        face = cv2.resize(face, (IMG_SIZE, IMG_SIZE))

        img_batch.append(face)
        mel_batch.append(m)
        frame_batch.append(f)
        coords_batch.append((y1, y2, x1, x2))

        if len(img_batch) >= WAV2LIP_BATCH_SIZE:
            flush_batch()
            img_batch, mel_batch, frame_batch, coords_batch = [], [], [], []

    if img_batch:
        flush_batch()

    out_writer.release()

    # AVI(MJPG) + 오디오 → MP4
    subprocess.run(
        ['ffmpeg', '-y', '-i', tmp_avi, '-i', audio_path,
         '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
         '-c:a', 'aac', '-shortest', output_path],
        capture_output=True
    )
    if os.path.exists(tmp_avi):
        os.remove(tmp_avi)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path == "/health":
            self._respond(200, {"ok": True})
        else:
            self._respond(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/synthesize":
            self._respond(404, {"error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            face = body["face"]
            audio_p = body["audio"]
            output = body["output"]
            os.makedirs(os.path.dirname(output), exist_ok=True)
            with _lock:
                synthesize(face, audio_p, output)
            self._respond(200, {"success": True})
        except Exception as e:
            self._respond(500, {"error": str(e)})

    def _respond(self, code, data):
        payload = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(payload))
        self.end_headers()
        self.wfile.write(payload)


if __name__ == "__main__":
    if not INFERENCE_PATH or not os.path.isfile(INFERENCE_PATH):
        print(json.dumps({"error": "WAV2LIP_INFERENCE_PATH not set"}))
        sys.exit(1)
    if not CHECKPOINT_PATH or not os.path.isfile(CHECKPOINT_PATH):
        print(json.dumps({"error": "WAV2LIP_CHECKPOINT_PATH not set"}))
        sys.exit(1)

    # 모델 미리 로드
    print("Wav2Lip 모델 로딩 중...", flush=True)
    _model = load_wav2lip_model(CHECKPOINT_PATH)

    # 아바타 이미지 face detection 사전 캐싱
    if FRONTEND_PUBLIC_DIR:
        avatars_dir = os.path.join(FRONTEND_PUBLIC_DIR, "avatars")
        if os.path.isdir(avatars_dir):
            for fname in ["friendly.png", "pressure.png", "professor.png", "practical.png"]:
                fpath = os.path.join(avatars_dir, fname)
                if os.path.isfile(fpath):
                    try:
                        detect_face(fpath)
                        print(f"  캐시 완료: {fname}", flush=True)
                    except Exception as e:
                        print(f"  캐시 실패: {fname} — {e}", flush=True)

    print(f"WAV2LIP_SERVER_READY:{PORT}", flush=True)

    server = HTTPServer(("127.0.0.1", PORT), Handler)
    server.serve_forever()
