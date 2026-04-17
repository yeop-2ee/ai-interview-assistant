"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const MEDIA_SERVICE_URL = process.env.NEXT_PUBLIC_MEDIA_API!;
const ANALYSIS_INTERVAL_MS = 200; // 5fps 분석
const BATCH_SIZE = 10;            // 10프레임 모아서 1회 전송

// EAR 계산용 랜드마크 인덱스
const LEFT_EYE  = { top: 159, bottom: 145, left: 33,  right: 133 };
const RIGHT_EYE = { top: 386, bottom: 374, left: 362, right: 263 };
const NOSE_TIP    = 4;
const LEFT_CHEEK  = 234;
const RIGHT_CHEEK = 454;

type GazeDirection = "center" | "left" | "right" | "up" | "down";

export interface FaceMetrics {
  gaze: GazeDirection;
  blinkCount: number;
  faceDetected: boolean;
}

function calcEAR(
  landmarks: { x: number; y: number; z: number }[],
  eye: typeof LEFT_EYE
): number {
  const vertical   = Math.abs(landmarks[eye.top].y    - landmarks[eye.bottom].y);
  const horizontal = Math.abs(landmarks[eye.right].x  - landmarks[eye.left].x);
  return horizontal > 0 ? vertical / horizontal : 0;
}

function calcGaze(
  landmarks: { x: number; y: number; z: number }[]
): GazeDirection {
  const nose       = landmarks[NOSE_TIP];
  const leftCheek  = landmarks[LEFT_CHEEK];
  const rightCheek = landmarks[RIGHT_CHEEK];

  const faceCenterX = (leftCheek.x + rightCheek.x) / 2;
  const faceWidth   = Math.abs(rightCheek.x - leftCheek.x);
  const faceCenterY = (leftCheek.y + rightCheek.y) / 2;
  if (faceWidth === 0) return "center";

  const dx = (nose.x - faceCenterX) / faceWidth;
  const dy = (nose.y - faceCenterY) / faceWidth;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx >  0.1) return "right";
    if (dx < -0.1) return "left";
  } else {
    if (dy >  0.08) return "down";
    if (dy < -0.08) return "up";
  }
  return "center";
}

export function useFaceAnalysis(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  sessionId: string,
  active: boolean
): FaceMetrics {
  const [metrics, setMetrics] = useState<FaceMetrics>({
    gaze: "center",
    blinkCount: 0,
    faceDetected: false,
  });

  const landmarkerRef    = useRef<import("@mediapipe/tasks-vision").FaceLandmarker | null>(null);
  const rafRef           = useRef<number>(0);
  const lastFrameTimeRef = useRef(0);
  const lastUIUpdateRef  = useRef(0);
  const blinkCountRef    = useRef(0);
  const wasBlinkingRef   = useRef(false);
  const batchRef         = useRef<{
    gazeDirection: GazeDirection;
  }[]>([]);

  const sendBatch = useCallback(
    async (
      batch: { gazeDirection: GazeDirection }[]
    ) => {
      if (!sessionId || batch.length === 0) return;
      try {
        await fetch(`${MEDIA_SERVICE_URL}/api/face/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            gazeDirection: batch[batch.length - 1].gazeDirection,
            blinkCount:    blinkCountRef.current,
            timestamp:     Date.now(),
          }),
        });
      } catch {
        // 네트워크 오류 무시
      }
    },
    [sessionId]
  );

  useEffect(() => {
    if (!active) return;

    let destroyed = false;

    async function init() {
      const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      // MediaPipe WASM 초기화 중 발생하는 XNNPACK/TFLite INFO 로그 억제
      const prevConsoleError = console.error;
      console.error = (...args: unknown[]) => {
        const msg = String(args[0] ?? "");
        if (msg.includes("XNNPACK") || msg.includes("TensorFlow Lite") || msg.includes("Created TensorFlow")) return;
        prevConsoleError(...args);
      };

      let landmarker: import("@mediapipe/tasks-vision").FaceLandmarker;
      try {
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
        });
      } catch {
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
        });
      } finally {
        console.error = prevConsoleError;
      }

      if (destroyed) { landmarker.close(); return; }
      landmarkerRef.current = landmarker;
      startLoop();
    }

    function startLoop() {
      function loop() {
        rafRef.current = requestAnimationFrame(loop);

        const video      = videoRef.current;
        const landmarker = landmarkerRef.current;
        if (!video || !landmarker || video.readyState < 2) return;
        if (!video.videoWidth || !video.videoHeight) return;

        const now = performance.now();
        if (now - lastFrameTimeRef.current < ANALYSIS_INTERVAL_MS) return;
        lastFrameTimeRef.current = now;

        let result;
        const prevConsoleError = console.error;
        console.error = () => {};
        try {
          result = landmarker.detectForVideo(video, now);
        } catch {
          console.error = prevConsoleError;
          return;
        }
        console.error = prevConsoleError;
        const faceDetected = result.faceLandmarks.length > 0;

        if (!faceDetected) {
          if (now - lastUIUpdateRef.current > 1000) {
            lastUIUpdateRef.current = now;
            setMetrics((prev) => ({ ...prev, faceDetected: false }));
          }
          return;
        }

        const landmarks = result.faceLandmarks[0];

        // 시선 방향
        const gaze = calcGaze(landmarks);

        // 눈 깜빡임 (EAR)
        const leftEAR  = calcEAR(landmarks, LEFT_EYE);
        const rightEAR = calcEAR(landmarks, RIGHT_EYE);
        const avgEAR   = (leftEAR + rightEAR) / 2;
        const isBlinking = avgEAR < 0.2;
        if (isBlinking && !wasBlinkingRef.current) blinkCountRef.current++;
        wasBlinkingRef.current = isBlinking;

        // 배치 누적
        batchRef.current.push({ gazeDirection: gaze });
        if (batchRef.current.length >= BATCH_SIZE) {
          sendBatch(batchRef.current);
          batchRef.current = [];
        }

        // UI 업데이트 (1초에 1회)
        if (now - lastUIUpdateRef.current > 1000) {
          lastUIUpdateRef.current = now;
          setMetrics({
            gaze,
            blinkCount:   blinkCountRef.current,
            faceDetected: true,
          });
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    init().catch(console.error);

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      if (batchRef.current.length > 0) {
        sendBatch(batchRef.current);
        batchRef.current = [];
      }
    };
  }, [active, videoRef, sendBatch]);

  return metrics;
}
