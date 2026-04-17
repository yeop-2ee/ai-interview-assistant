import { useState, useRef, useCallback, useEffect, RefObject } from "react";

/**
 * 면접 중 카메라·마이크·스피커 장치 관리 훅.
 * videoRef, pipVideoRef 에 스트림을 직접 연결하고,
 * audioRef 에 setSinkId 로 스피커 출력을 적용한다.
 *
 * @returns startCam — 성공 시 true, 실패 시 false 반환 (실패 처리는 호출 측에서)
 */
export function useCallMedia(
  videoRef: RefObject<HTMLVideoElement | null>,
  pipVideoRef: RefObject<HTMLVideoElement | null>,
  audioRef: RefObject<HTMLAudioElement | null>,
) {
  const streamRef = useRef<MediaStream | null>(null);

  const [callVideoDevices, setCallVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [callAudioDevices, setCallAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [callSpeakerDevices, setCallSpeakerDevices] = useState<MediaDeviceInfo[]>([]);
  const [callSelectedCamId, setCallSelectedCamId] = useState("");
  const [callSelectedMicId, setCallSelectedMicId] = useState("");
  const [callSelectedSpeakerId, setCallSelectedSpeakerId] = useState("");
  // 비동기 TTS 콜백에서 최신 스피커 ID 참조용
  const callSelectedSpeakerIdRef = useRef("");

  const applySpeaker = useCallback((sinkId: string) => {
    const el = audioRef.current;
    if (el && typeof (el as HTMLMediaElement & { setSinkId?: (id: string) => Promise<void> }).setSinkId === "function") {
      (el as HTMLMediaElement & { setSinkId: (id: string) => Promise<void> })
        .setSinkId(sinkId)
        .catch(() => {});
    }
  }, [audioRef]);

  useEffect(() => {
    callSelectedSpeakerIdRef.current = callSelectedSpeakerId;
    if (callSelectedSpeakerId) applySpeaker(callSelectedSpeakerId);
  }, [callSelectedSpeakerId, applySpeaker]);

  const startCam = useCallback(async (): Promise<boolean> => {
    try {
      const camId = sessionStorage.getItem("selectedCamId");
      const micId = sessionStorage.getItem("selectedMicId");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: camId ? { deviceId: { exact: camId } } : true,
        audio: micId ? { deviceId: { exact: micId } } : true,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCallVideoDevices(devices.filter((d) => d.kind === "videoinput"));
      setCallAudioDevices(devices.filter((d) => d.kind === "audioinput"));
      setCallSpeakerDevices(devices.filter((d) => d.kind === "audiooutput"));
      const vt = stream.getVideoTracks()[0];
      const at = stream.getAudioTracks()[0];
      if (vt) setCallSelectedCamId(vt.getSettings().deviceId ?? (camId ?? ""));
      if (at) setCallSelectedMicId(at.getSettings().deviceId ?? (micId ?? ""));
      const speakerId = sessionStorage.getItem("selectedSpeakerId");
      if (speakerId) setCallSelectedSpeakerId(speakerId);
      return true;
    } catch {
      return false;
    }
  }, [videoRef]);

  const switchCallDevices = useCallback(async (camId?: string, micId?: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: camId ? { deviceId: { exact: camId } } : true,
        audio: micId ? { deviceId: { exact: micId } } : true,
      });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      if (pipVideoRef.current) pipVideoRef.current.srcObject = stream;
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCallVideoDevices(devices.filter((d) => d.kind === "videoinput"));
      setCallAudioDevices(devices.filter((d) => d.kind === "audioinput"));
      setCallSpeakerDevices(devices.filter((d) => d.kind === "audiooutput"));
      const vt = stream.getVideoTracks()[0];
      const at = stream.getAudioTracks()[0];
      if (vt) setCallSelectedCamId(vt.getSettings().deviceId ?? (camId ?? ""));
      if (at) setCallSelectedMicId(at.getSettings().deviceId ?? (micId ?? ""));
    } catch { /* 무시 */ }
  }, [videoRef, pipVideoRef]);

  return {
    streamRef,
    callVideoDevices,
    callAudioDevices,
    callSpeakerDevices,
    callSelectedCamId,
    callSelectedMicId,
    callSelectedSpeakerId,
    callSelectedSpeakerIdRef,
    setCallSelectedCamId,
    setCallSelectedMicId,
    setCallSelectedSpeakerId,
    startCam,
    switchCallDevices,
    applySpeaker,
  };
}
