"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CAMERA_CONSTRAINTS,
  CAMERA_VIDEO_BITS_PER_SECOND,
  COUNTDOWN_SECONDS,
  DISPLAY_MEDIA_OPTIONS,
  MAX_RECORDING_MS,
  MICROPHONE_CONSTRAINTS,
  SCREEN_VIDEO_BITS_PER_SECOND,
  copyStylesInto,
  defaultRecordingTitle,
  describeMediaError,
  getDocumentPictureInPicture,
  isPickerDismissed,
  isScreenCaptureSupported,
  pickRecordingMimeType,
  recordingFileName,
  stopStreams,
  type RecorderPhase,
  type RecordingMode,
  type RecordingResult,
} from "./recorderUtils";

export type RecorderDevices = { cameras: MediaDeviceInfo[]; microphones: MediaDeviceInfo[] };

export type RecorderEngine = {
  phase: RecorderPhase;
  mode: RecordingMode;
  setMode: (mode: RecordingMode) => void;
  is_microphone_on: boolean;
  setMicrophoneOn: (is_on: boolean) => void;
  camera_id: string;
  setCameraId: (device_id: string) => void;
  microphone_id: string;
  setMicrophoneId: (device_id: string) => void;
  devices: RecorderDevices;
  /** Live camera, for the setup preview, the bubble and the camera only recording. */
  camera_stream: MediaStream | null;
  /** Live microphone, for the level meter. */
  microphone_stream: MediaStream | null;
  countdown: number;
  elapsed_ms: number;
  error: string | null;
  result: RecordingResult | null;
  /** The floating always on top window with the camera bubble and controls, when the browser supports it. */
  pip_window: Window | null;
  can_record_screen: boolean;
  openSetup: () => void;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  /** Ends the capture and opens the review. */
  finish: () => void;
  /** Throws the take away and counts down again on the same screen. */
  restart: () => void;
  /** Throws everything away and closes the recorder. */
  cancel: () => void;
  /** Back to the setup dialog from the review, the take is thrown away. */
  recordAgain: () => void;
  /** Renames the reviewed file, keeping its contents. */
  renameResult: (title: string) => RecordingResult | null;
};

const EMPTY_DEVICES: RecorderDevices = { cameras: [], microphones: [] };
const TICK_MS = 250;
/** `MediaRecorder` hands over a chunk every second, so a crash loses at most that much. */
const RECORDER_TIMESLICE_MS = 1000;

const now = () => performance.now();

/**
 * The recording state machine behind `ScreenRecorderProvider`, modeled on
 * Loom's web recorder:
 *
 * setup (pick mode and devices, live camera preview and mic meter)
 *   -> starting (the browser's screen picker, plus the floating camera window)
 *   -> countdown 3, 2, 1 -> recording <-> paused -> processing -> review.
 *
 * The screen and the microphone (and the tab or system audio when shared) are
 * mixed into one stream and written by `MediaRecorder`. The camera is not
 * painted into the video: like Loom, it floats in an always on top Document
 * Picture in Picture window, so it is captured as part of the shared screen.
 * Browsers without that API show the bubble inside the page instead.
 */
export function useRecorderEngine(): RecorderEngine {
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [mode, setMode] = useState<RecordingMode>("screen_camera");
  const [is_microphone_on, setMicrophoneOn] = useState(true);
  const [camera_id, setCameraId] = useState("");
  const [microphone_id, setMicrophoneId] = useState("");
  const [devices, setDevices] = useState<RecorderDevices>(EMPTY_DEVICES);
  const [camera_stream, setCameraStream] = useState<MediaStream | null>(null);
  const [microphone_stream, setMicrophoneStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [elapsed_ms, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [pip_window, setPipWindow] = useState<Window | null>(null);
  const [can_record_screen, setCanRecordScreen] = useState(true);

  const display_stream_ref = useRef<MediaStream | null>(null);
  const recorder_ref = useRef<MediaRecorder | null>(null);
  const chunks_ref = useRef<Blob[]>([]);
  const mixer_ref = useRef<AudioContext | null>(null);
  const accumulated_ms_ref = useRef(0);
  const segment_started_at_ref = useRef(0);
  const tick_ref = useRef<number | null>(null);
  const countdown_ref = useRef<number | null>(null);
  /** What `onstop` should do with the take: keep it, drop it, or drop it and count down again. */
  const stop_intent_ref = useRef<"keep" | "discard" | "restart">("keep");
  /** Set after the screen picker refused to open because the Picture in Picture window took the click, the next try skips that window. */
  const skip_pip_ref = useRef(false);
  const result_ref = useRef<RecordingResult | null>(null);

  // Read through refs by the long lived callbacks (track `ended`, recorder `onstop`).
  const camera_stream_ref = useRef<MediaStream | null>(null);
  const microphone_stream_ref = useRef<MediaStream | null>(null);
  const pip_window_ref = useRef<Window | null>(null);
  const mode_ref = useRef(mode);
  useEffect(() => {
    camera_stream_ref.current = camera_stream;
    microphone_stream_ref.current = microphone_stream;
    pip_window_ref.current = pip_window;
    mode_ref.current = mode;
  });

  useEffect(() => {
    setCanRecordScreen(isScreenCaptureSupported());
  }, []);

  const is_capturing_phase = phase === "setup" || phase === "starting" || phase === "countdown" || phase === "recording" || phase === "paused";
  const needs_camera = is_capturing_phase && mode !== "screen";
  const needs_microphone = is_capturing_phase && is_microphone_on;

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const all_devices = await navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[]);
    setDevices({
      cameras: all_devices.filter((device) => device.kind === "videoinput" && device.deviceId),
      microphones: all_devices.filter((device) => device.kind === "audioinput" && device.deviceId),
    });
  }, []);

  // Camera: opened for the setup preview and kept through the recording.
  useEffect(() => {
    if (!needs_camera) return;
    let is_cancelled = false;
    let opened: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { ...CAMERA_CONSTRAINTS, ...(camera_id ? { deviceId: { exact: camera_id } } : {}) }, audio: false })
      .then((stream) => {
        if (is_cancelled) return stopStreams(stream);
        opened = stream;
        setCameraStream(stream);
        void refreshDevices();
      })
      .catch((camera_error) => !is_cancelled && setError(describeMediaError(camera_error)));
    return () => {
      is_cancelled = true;
      stopStreams(opened);
      setCameraStream(null);
    };
  }, [needs_camera, camera_id, refreshDevices]);

  // Microphone: same lifetime as the camera.
  useEffect(() => {
    if (!needs_microphone) return;
    let is_cancelled = false;
    let opened: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ audio: { ...MICROPHONE_CONSTRAINTS, ...(microphone_id ? { deviceId: { exact: microphone_id } } : {}) }, video: false })
      .then((stream) => {
        if (is_cancelled) return stopStreams(stream);
        opened = stream;
        setMicrophoneStream(stream);
        void refreshDevices();
      })
      .catch((microphone_error) => !is_cancelled && setError(describeMediaError(microphone_error)));
    return () => {
      is_cancelled = true;
      stopStreams(opened);
      setMicrophoneStream(null);
    };
  }, [needs_microphone, microphone_id, refreshDevices]);

  const clearTimers = () => {
    if (tick_ref.current !== null) window.clearInterval(tick_ref.current);
    if (countdown_ref.current !== null) window.clearTimeout(countdown_ref.current);
    tick_ref.current = null;
    countdown_ref.current = null;
  };

  /** Ends the screen share, the audio mix and the floating window. Camera and microphone follow `phase` (effects above). */
  const releaseCapture = useCallback(() => {
    clearTimers();
    stopStreams(display_stream_ref.current);
    display_stream_ref.current = null;
    void mixer_ref.current?.close().catch(() => {});
    mixer_ref.current = null;
    pip_window_ref.current?.close();
    setPipWindow(null);
  }, []);

  const releaseResult = () => {
    if (result_ref.current) URL.revokeObjectURL(result_ref.current.url);
    result_ref.current = null;
    setResult(null);
  };

  const currentElapsed = () => accumulated_ms_ref.current + (segment_started_at_ref.current ? now() - segment_started_at_ref.current : 0);

  /** Mixes microphone and shared audio into one track; a single source is passed through untouched. */
  const buildAudioTracks = (): MediaStreamTrack[] => {
    const sources = [microphone_stream_ref.current, display_stream_ref.current].filter(
      (stream): stream is MediaStream => Boolean(stream && stream.getAudioTracks().length > 0)
    );
    if (sources.length === 0) return [];
    if (sources.length === 1) return [sources[0].getAudioTracks()[0]];
    const context = new AudioContext();
    const destination = context.createMediaStreamDestination();
    sources.forEach((stream) => context.createMediaStreamSource(new MediaStream(stream.getAudioTracks())).connect(destination));
    mixer_ref.current = context;
    return destination.stream.getAudioTracks();
  };

  const finalize = async (mime_type: string) => {
    const intent = stop_intent_ref.current;
    stop_intent_ref.current = "keep";
    const chunks = chunks_ref.current;
    chunks_ref.current = [];
    recorder_ref.current = null;
    if (tick_ref.current !== null) window.clearInterval(tick_ref.current);
    tick_ref.current = null;

    if (intent === "discard") return;
    if (intent === "restart") {
      runCountdown();
      return;
    }

    const duration_ms = currentElapsed();
    segment_started_at_ref.current = 0;
    releaseCapture();

    // Stopped before the browser wrote anything (a click right after the countdown): nothing to review.
    if (chunks.length === 0) {
      setError("That take was too short to save. Press Start recording to try again.");
      setPhase("setup");
      return;
    }
    setPhase("processing");

    const container_type = mime_type.split(";")[0] || "video/webm";
    let blob: Blob = new Blob(chunks, { type: container_type });
    // A WebM written while recording has no duration in its header, players then can't seek. Patch it in.
    if (container_type === "video/webm") {
      try {
        const { default: fixWebmDuration } = await import("fix-webm-duration");
        blob = await fixWebmDuration(blob, duration_ms, { logger: false });
      } catch {
        // The video still plays, `VideoPlayer` works the duration out itself.
      }
    }

    const file = new File([blob], recordingFileName(defaultRecordingTitle(), container_type), { type: container_type });
    const next_result: RecordingResult = { file, url: URL.createObjectURL(file), duration_ms };
    result_ref.current = next_result;
    setResult(next_result);
    setPhase("review");
  };

  const beginRecording = () => {
    const video_track =
      mode_ref.current === "camera" ? camera_stream_ref.current?.getVideoTracks()[0] : display_stream_ref.current?.getVideoTracks()[0];
    if (!video_track || video_track.readyState === "ended") {
      releaseCapture();
      setError("The screen or camera stopped before the recording started. Please try again.");
      setPhase("setup");
      return;
    }

    void mixer_ref.current?.close().catch(() => {});
    mixer_ref.current = null;
    const stream = new MediaStream([video_track, ...buildAudioTracks()]);
    const mime_type = pickRecordingMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        ...(mime_type ? { mimeType: mime_type } : {}),
        videoBitsPerSecond: mode_ref.current === "camera" ? CAMERA_VIDEO_BITS_PER_SECOND : SCREEN_VIDEO_BITS_PER_SECOND,
        audioBitsPerSecond: 128_000,
      });
    } catch (recorder_error) {
      releaseCapture();
      setError(describeMediaError(recorder_error));
      setPhase("setup");
      return;
    }

    chunks_ref.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks_ref.current.push(event.data);
    };
    recorder.onstop = () => void finalize(recorder.mimeType || mime_type);
    recorder_ref.current = recorder;
    recorder.start(RECORDER_TIMESLICE_MS);

    accumulated_ms_ref.current = 0;
    segment_started_at_ref.current = now();
    setElapsedMs(0);
    setPhase("recording");
    tick_ref.current = window.setInterval(() => {
      const elapsed = currentElapsed();
      setElapsedMs(elapsed);
      if (elapsed >= MAX_RECORDING_MS) stopRecorder("keep");
    }, TICK_MS);
  };

  function runCountdown() {
    clearTimers();
    setPhase("countdown");
    setCountdown(COUNTDOWN_SECONDS);
    let remaining = COUNTDOWN_SECONDS;
    const step = () => {
      remaining -= 1;
      if (remaining <= 0) {
        countdown_ref.current = null;
        beginRecording();
        return;
      }
      setCountdown(remaining);
      countdown_ref.current = window.setTimeout(step, 1000);
    };
    countdown_ref.current = window.setTimeout(step, 1000);
  }

  function stopRecorder(intent: "keep" | "discard" | "restart") {
    const recorder = recorder_ref.current;
    if (intent !== "restart") {
      // Freeze the clock now, `onstop` arrives a moment later.
      accumulated_ms_ref.current = currentElapsed();
      segment_started_at_ref.current = 0;
    }
    if (!recorder || recorder.state === "inactive") {
      if (intent === "restart") runCountdown();
      else if (intent === "keep") void finalize("");
      return;
    }
    stop_intent_ref.current = intent;
    recorder.stop();
  }

  const openSetup = useCallback(() => {
    setError(null);
    setPhase((current) => (current === "idle" ? "setup" : current));
  }, []);

  const start = async () => {
    setError(null);
    setPhase("starting");
    const current_mode = mode;

    // The floating camera window has to open on this click: the browser only allows it during a user gesture.
    let pip: Window | null = null;
    const document_pip = getDocumentPictureInPicture();
    if (current_mode !== "camera" && document_pip && !skip_pip_ref.current) {
      try {
        pip = await document_pip.requestWindow(current_mode === "screen_camera" ? { width: 264, height: 340 } : { width: 340, height: 84 });
        copyStylesInto(pip);
      } catch {
        pip = null;
      }
    }

    if (current_mode !== "camera") {
      try {
        const display_stream = await navigator.mediaDevices.getDisplayMedia(DISPLAY_MEDIA_OPTIONS);
        display_stream_ref.current = display_stream;
        // "Stop sharing" in the browser's own bar ends the recording like the Finish button.
        display_stream.getVideoTracks()[0]?.addEventListener("ended", () => {
          if (recorder_ref.current) stopRecorder("keep");
          else {
            releaseCapture();
            setPhase("setup");
          }
        });
      } catch (display_error) {
        pip?.close();
        if (display_error instanceof DOMException && display_error.name === "InvalidStateError") skip_pip_ref.current = true;
        setError(isPickerDismissed(display_error) ? "Screen sharing was cancelled. Press Start recording to pick a screen, window or tab." : describeMediaError(display_error));
        setPhase("setup");
        return;
      }
    } else if (!camera_stream_ref.current) {
      setError("Your camera is not ready yet. Allow camera access and try again.");
      setPhase("setup");
      return;
    }

    if (pip) {
      // Closing the floating window keeps recording, the bubble moves back into the page.
      pip.addEventListener("pagehide", () => setPipWindow((current) => (current === pip ? null : current)), { once: true });
      setPipWindow(pip);
    }
    runCountdown();
  };

  const pause = () => {
    const recorder = recorder_ref.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.pause();
    accumulated_ms_ref.current = currentElapsed();
    segment_started_at_ref.current = 0;
    setElapsedMs(accumulated_ms_ref.current);
    setPhase("paused");
  };

  const resume = () => {
    const recorder = recorder_ref.current;
    if (!recorder || recorder.state !== "paused") return;
    recorder.resume();
    segment_started_at_ref.current = now();
    setPhase("recording");
  };

  const finish = () => {
    if (phase === "countdown") {
      // Nothing was captured yet, finishing during the countdown just cancels.
      cancel();
      return;
    }
    stopRecorder("keep");
  };

  const restart = () => {
    if (phase === "countdown") {
      runCountdown();
      return;
    }
    accumulated_ms_ref.current = 0;
    segment_started_at_ref.current = 0;
    setElapsedMs(0);
    stopRecorder("restart");
  };

  function cancel() {
    if (recorder_ref.current && recorder_ref.current.state !== "inactive") {
      stop_intent_ref.current = "discard";
      recorder_ref.current.stop();
    }
    releaseCapture();
    releaseResult();
    accumulated_ms_ref.current = 0;
    segment_started_at_ref.current = 0;
    setElapsedMs(0);
    setError(null);
    setPhase("idle");
  }

  const recordAgain = () => {
    releaseResult();
    setElapsedMs(0);
    setError(null);
    setPhase("setup");
  };

  const renameResult = (title: string): RecordingResult | null => {
    const current = result_ref.current;
    if (!current) return null;
    const file_name = recordingFileName(title, current.file.type);
    if (file_name === current.file.name) return current;
    const renamed: RecordingResult = { ...current, file: new File([current.file], file_name, { type: current.file.type }) };
    result_ref.current = renamed;
    setResult(renamed);
    return renamed;
  };

  // Leaving the page mid recording asks first, and unmounting never leaves the camera light on.
  const is_live = phase === "countdown" || phase === "recording" || phase === "paused" || phase === "processing";
  useEffect(() => {
    if (!is_live) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [is_live]);

  useEffect(
    () => () => {
      if (recorder_ref.current && recorder_ref.current.state !== "inactive") {
        stop_intent_ref.current = "discard";
        recorder_ref.current.stop();
      }
      releaseCapture();
      if (result_ref.current) URL.revokeObjectURL(result_ref.current.url);
    },
    [releaseCapture]
  );

  return {
    phase,
    mode,
    setMode: (next_mode) => {
      setError(null);
      setMode(next_mode);
    },
    is_microphone_on,
    setMicrophoneOn,
    camera_id,
    setCameraId,
    microphone_id,
    setMicrophoneId,
    devices,
    camera_stream,
    microphone_stream,
    countdown,
    elapsed_ms,
    error,
    result,
    pip_window,
    can_record_screen,
    openSetup,
    start,
    pause,
    resume,
    finish,
    restart,
    cancel,
    recordAgain,
    renameResult,
  };
}
