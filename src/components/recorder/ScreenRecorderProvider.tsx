"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CountdownOverlay, InPageCameraBubble, InPageControlBar, PictureInPicturePanel } from "./RecorderOverlays";
import RecorderSetupDialog from "./RecorderSetupDialog";
import RecordingReviewDialog from "./RecordingReviewDialog";
import { useRecorderEngine } from "./useRecorderEngine";
import { isRecordingSupported } from "./recorderUtils";
import "./screen-recorder.scss";

/** Where a finished recording should go. */
export type RecordingRequest = {
  /** Identifies the composer that asked, e.g. `item:12:345`. The video is handed to the composer registered under this key. */
  target_key: string;
  /**
   * Posts the video as its own update when that composer is gone by the time
   * the user finishes (the drawer was closed, or they moved to another page
   * while recording). Omitted where there is nothing to post to (mock boards).
   */
  postFallback?: (file: File, onProgress: (progress: number) => void) => Promise<void>;
};

type ScreenRecorderContextValue = {
  /** False on browsers without `MediaRecorder` or camera access, the Record button hides. */
  is_supported: boolean;
  /** True while a recording is being set up, captured or reviewed. Only one at a time. */
  is_busy: boolean;
  /** The composer the current recording belongs to. */
  active_target_key: string | null;
  requestRecording: (request: RecordingRequest) => void;
  /** Lets a composer receive finished videos while it is mounted. Returns the unregister function. */
  registerTarget: (target_key: string, onAttach: (file: File) => void) => () => void;
};

const ScreenRecorderContext = createContext<ScreenRecorderContextValue | null>(null);

/**
 * Loom style video recorder for the whole app, mounted once in the signed in
 * layout so a recording keeps going while the user closes the drawer or moves
 * to another board to show something. Any update composer asks for it through
 * {@link useScreenRecorder}; the finished video lands in that composer's file
 * tray, or is posted as its own update when the composer is gone.
 */
export function ScreenRecorderProvider({ children }: { children: React.ReactNode }) {
  const engine = useRecorderEngine();
  const [is_supported, setIsSupported] = useState(false);
  const [request, setRequest] = useState<RecordingRequest | null>(null);
  const targets_ref = useRef(new Map<string, (file: File) => void>());
  const [registered_keys, setRegisteredKeys] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    setIsSupported(isRecordingSupported());
  }, []);

  const is_busy = engine.phase !== "idle";

  // The request is forgotten once the recorder closes.
  useEffect(() => {
    if (engine.phase === "idle") setRequest(null);
  }, [engine.phase]);

  const { openSetup } = engine;
  const requestRecording = useCallback(
    (next_request: RecordingRequest) => {
      setRequest(next_request);
      openSetup();
    },
    [openSetup]
  );

  const registerTarget = useCallback((target_key: string, onAttach: (file: File) => void) => {
    targets_ref.current.set(target_key, onAttach);
    setRegisteredKeys((current) => new Set(current).add(target_key));
    return () => {
      if (targets_ref.current.get(target_key) !== onAttach) return;
      targets_ref.current.delete(target_key);
      setRegisteredKeys((current) => {
        const next = new Set(current);
        next.delete(target_key);
        return next;
      });
    };
  }, []);

  const context_value = useMemo<ScreenRecorderContextValue>(
    () => ({ is_supported, is_busy, active_target_key: request?.target_key ?? null, requestRecording, registerTarget }),
    [is_supported, is_busy, request?.target_key, requestRecording, registerTarget]
  );

  const is_live = engine.phase === "countdown" || engine.phase === "recording" || engine.phase === "paused" || engine.phase === "processing";
  const show_bubble = (engine.phase === "countdown" || engine.phase === "recording" || engine.phase === "paused") && engine.mode !== "screen";
  const control_props = {
    phase: engine.phase,
    elapsed_ms: engine.elapsed_ms,
    countdown: engine.countdown,
    microphone_stream: engine.microphone_stream,
    onPause: engine.pause,
    onResume: engine.resume,
    onFinish: engine.finish,
    onRestart: engine.restart,
    onCancel: engine.cancel,
  };

  const can_attach = request !== null && registered_keys.has(request.target_key);
  const post_fallback = request?.postFallback;

  return (
    <ScreenRecorderContext.Provider value={context_value}>
      {children}
      {is_busy && (
        <>
          <RecorderSetupDialog engine={engine} />
          {is_live && <InPageControlBar {...control_props} />}
          {engine.phase === "countdown" && <CountdownOverlay countdown={engine.countdown} />}
          {show_bubble && (engine.mode === "camera" || !engine.pip_window) && (
            <InPageCameraBubble stream={engine.camera_stream} variant={engine.mode === "camera" ? "stage" : "bubble"} />
          )}
          {engine.pip_window && is_live && (
            <PictureInPicturePanel {...control_props} pip_window={engine.pip_window} camera_stream={engine.camera_stream} show_camera={engine.mode === "screen_camera"} />
          )}
          <RecordingReviewDialog
            engine={engine}
            can_attach={can_attach}
            can_post={Boolean(post_fallback)}
            onAttach={(file) => request && targets_ref.current.get(request.target_key)?.(file)}
            onPost={(file, onProgress) => (post_fallback ? post_fallback(file, onProgress) : Promise.reject(new Error("No update to post to")))}
          />
        </>
      )}
    </ScreenRecorderContext.Provider>
  );
}

/** The app wide recorder, or null outside the signed in layout (the Record button then hides). */
export function useScreenRecorder(): ScreenRecorderContextValue | null {
  return useContext(ScreenRecorderContext);
}

/** Registers a composer as the destination of videos recorded for `target_key` while it is mounted. */
export function useRecordingTarget(target_key: string | null, onAttach: (file: File) => void) {
  const recorder = useScreenRecorder();
  const on_attach_ref = useRef(onAttach);
  useEffect(() => {
    on_attach_ref.current = onAttach;
  });
  const register = recorder?.registerTarget;
  useEffect(() => {
    if (!register || !target_key) return;
    const deliver = (file: File) => on_attach_ref.current(file);
    return register(target_key, deliver);
  }, [register, target_key]);
}
