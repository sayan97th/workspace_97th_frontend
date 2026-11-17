"use client";
import React from "react";
import { AppWindow, Camera, Mic, MicOff, MonitorPlay, MonitorSmartphone, Video, X } from "lucide-react";
import MediaDialog from "@/components/media/MediaDialog";
import { LiveCameraView, MicrophoneLevelMeter } from "./RecorderMediaViews";
import type { RecorderEngine } from "./useRecorderEngine";
import { MAX_RECORDING_MS, getDocumentPictureInPicture, type RecordingMode } from "./recorderUtils";

const MODES: { id: RecordingMode; label: string; caption: string; icon: React.ReactNode; needs_screen: boolean }[] = [
  { id: "screen_camera", label: "Screen and camera", caption: "Your face in a bubble", icon: <MonitorPlay size={20} />, needs_screen: true },
  { id: "screen", label: "Screen only", caption: "Just what you show", icon: <AppWindow size={20} />, needs_screen: true },
  { id: "camera", label: "Camera only", caption: "Talk to your team", icon: <Video size={20} />, needs_screen: false },
];

/** A device's label, or a numbered fallback before the browser reveals labels. */
const deviceLabel = (device: MediaDeviceInfo, index: number, kind: string) => device.label || `${kind} ${index + 1}`;

export type RecorderSetupDialogProps = {
  engine: RecorderEngine;
};

/**
 * First step of the recorder, Loom's "new video" panel: choose what to record,
 * check the camera and the microphone with a live preview and level meter,
 * then start. The browser asks which screen, window or tab to share next.
 */
export default function RecorderSetupDialog({ engine }: RecorderSetupDialogProps) {
  const is_open = engine.phase === "setup" || engine.phase === "starting";
  const is_starting = engine.phase === "starting";
  const uses_camera = engine.mode !== "screen";
  const has_floating_bubble = getDocumentPictureInPicture() !== null;

  const tip =
    engine.mode === "screen_camera"
      ? has_floating_bubble
        ? "Share your entire screen to keep the camera bubble in the video. It floats above every window while you record."
        : "Your browser keeps the camera bubble inside this page. Share this tab, or your entire screen, to include it in the video."
      : engine.mode === "screen"
        ? "You can share your entire screen, a single window or one browser tab. Tick Share audio to include its sound."
        : "Look at the camera and talk to your team, the video is added to this update when you finish.";

  return (
    <MediaDialog is_open={is_open} onClose={engine.cancel} aria_label="Record a video" panel_class_name="screen-recorder-setup" can_dismiss={!is_starting}>
      <header className="screen-recorder-setup__header">
        <span className="screen-recorder-setup__badge" aria-hidden="true">
          <span className="screen-recorder-setup__badge-dot" />
        </span>
        <div className="min-w-0">
          <h2 className="screen-recorder-setup__title">Record a video</h2>
          <p className="screen-recorder-setup__subtitle">Show what you mean. Record your screen and camera, then share it in this update.</p>
        </div>
        <button type="button" className="screen-recorder-setup__close" onClick={engine.cancel} aria-label="Close recorder" disabled={is_starting}>
          <X size={18} />
        </button>
      </header>

      <div className="screen-recorder-setup__modes" role="radiogroup" aria-label="What to record">
        {MODES.map((mode) => {
          const is_disabled = mode.needs_screen && !engine.can_record_screen;
          const is_active = engine.mode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={is_active}
              disabled={is_disabled || is_starting}
              title={is_disabled ? "Screen recording needs a desktop browser" : undefined}
              onClick={() => engine.setMode(mode.id)}
              className="screen-recorder-setup__mode"
              data-active={is_active || undefined}
            >
              <span className="screen-recorder-setup__mode-icon">{mode.icon}</span>
              <span className="screen-recorder-setup__mode-label">{mode.label}</span>
              <span className="screen-recorder-setup__mode-caption">{mode.caption}</span>
            </button>
          );
        })}
      </div>

      <div className="screen-recorder-setup__stage" data-mode={engine.mode}>
        {engine.mode === "screen" ? (
          <div className="screen-recorder-setup__stage-screen">
            <MonitorSmartphone size={34} strokeWidth={1.5} />
            <span>Pick a screen, window or tab in the next step</span>
          </div>
        ) : (
          <>
            {engine.mode === "screen_camera" && (
              <div className="screen-recorder-setup__stage-screen screen-recorder-setup__stage-screen--behind" aria-hidden="true">
                <span className="screen-recorder-setup__fake-window" />
              </div>
            )}
            <div className={`screen-recorder-setup__preview screen-recorder-setup__preview--${engine.mode}`}>
              <LiveCameraView stream={engine.camera_stream} />
              {!engine.camera_stream && (
                <span className="screen-recorder-setup__preview-empty">
                  <Camera size={22} />
                  {engine.mode === "camera" ? "Waiting for your camera" : ""}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <div className="screen-recorder-setup__devices">
        {uses_camera && (
          <label className="screen-recorder-setup__device">
            <span className="screen-recorder-setup__device-icon">
              <Camera size={16} />
            </span>
            <select
              value={engine.camera_id}
              onChange={(event) => engine.setCameraId(event.target.value)}
              disabled={is_starting}
              aria-label="Camera"
              className="screen-recorder-setup__select"
            >
              <option value="">Default camera</option>
              {engine.devices.cameras.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {deviceLabel(device, index, "Camera")}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="screen-recorder-setup__device">
          <button
            type="button"
            className="screen-recorder-setup__device-icon screen-recorder-setup__device-toggle"
            onClick={() => engine.setMicrophoneOn(!engine.is_microphone_on)}
            aria-pressed={engine.is_microphone_on}
            aria-label={engine.is_microphone_on ? "Turn the microphone off" : "Turn the microphone on"}
            title={engine.is_microphone_on ? "Microphone on" : "Microphone off"}
            data-off={!engine.is_microphone_on || undefined}
            disabled={is_starting}
          >
            {engine.is_microphone_on ? <Mic size={16} /> : <MicOff size={16} />}
          </button>
          {engine.is_microphone_on ? (
            <>
              <select
                value={engine.microphone_id}
                onChange={(event) => engine.setMicrophoneId(event.target.value)}
                disabled={is_starting}
                aria-label="Microphone"
                className="screen-recorder-setup__select"
              >
                <option value="">Default microphone</option>
                {engine.devices.microphones.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {deviceLabel(device, index, "Microphone")}
                  </option>
                ))}
              </select>
              <MicrophoneLevelMeter stream={engine.microphone_stream} />
            </>
          ) : (
            <span className="screen-recorder-setup__muted">No microphone, the video will be silent</span>
          )}
        </div>
      </div>

      <p className="screen-recorder-setup__tip">{tip}</p>

      {engine.error && (
        <p className="screen-recorder-setup__error" role="alert">
          {engine.error}
        </p>
      )}

      <footer className="screen-recorder-setup__footer">
        <span className="screen-recorder-setup__limit">Up to {Math.round(MAX_RECORDING_MS / 60000)} minutes per video</span>
        <button type="button" className="screen-recorder-setup__start" onClick={() => void engine.start()} disabled={is_starting}>
          <span className="screen-recorder-setup__start-dot" aria-hidden="true" />
          {is_starting ? (engine.mode === "camera" ? "Starting" : "Choose what to share") : "Start recording"}
        </button>
      </footer>
    </MediaDialog>
  );
}
