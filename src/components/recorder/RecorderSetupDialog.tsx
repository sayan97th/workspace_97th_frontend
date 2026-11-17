"use client";
import React from "react";
import { AppWindow, Camera, Mic, MicOff, MonitorPlay, MonitorSmartphone, Video, X } from "lucide-react";
import MediaDialog from "@/components/media/MediaDialog";
import { LiveCameraView, MicrophoneLevelMeter } from "./RecorderMediaViews";
import RecorderSelect, { type RecorderSelectOption } from "./RecorderSelect";
import type { RecorderEngine } from "./useRecorderEngine";
import { RECORDING_QUALITY_PRESETS, formatMinutes, getDocumentPictureInPicture, maxRecordingMs, type RecordingMode, type RecordingQuality } from "./recorderUtils";

const MODES: { id: RecordingMode; label: string; caption: string; icon: React.ReactNode; needs_screen: boolean }[] = [
  { id: "screen", label: "Screen", caption: "Your screen and voice", icon: <AppWindow size={20} />, needs_screen: true },
  { id: "screen_camera", label: "Screen and camera", caption: "Your face in a bubble", icon: <MonitorPlay size={20} />, needs_screen: true },
  { id: "camera", label: "Camera only", caption: "Talk to your team", icon: <Video size={20} />, needs_screen: false },
];

/** Picker value for "record without a microphone". */
const MICROPHONE_OFF = "__off__";

export type RecorderSetupDialogProps = {
  engine: RecorderEngine;
};

/**
 * First step of the recorder, Loom's "new video" panel: choose what to record
 * (the screen with the microphone by default), the camera and microphone with
 * a live preview and level meter, and the video quality, then start. The
 * browser asks which screen, window or tab to share next.
 */
export default function RecorderSetupDialog({ engine }: RecorderSetupDialogProps) {
  const is_open = engine.phase === "setup" || engine.phase === "starting";
  const is_starting = engine.phase === "starting";
  const uses_camera = engine.mode !== "screen";
  const has_floating_bubble = getDocumentPictureInPicture() !== null;

  const camera_options: RecorderSelectOption[] = [
    { value: "", label: "Default camera", caption: "The one your system uses" },
    ...engine.devices.cameras.map((device) => ({ value: device.id, label: device.label })),
  ];
  const microphone_options: RecorderSelectOption[] = [
    { value: "", label: "Default microphone", caption: "The one your system uses" },
    ...engine.devices.microphones.map((device) => ({ value: device.id, label: device.label })),
    { value: MICROPHONE_OFF, label: "No microphone", caption: "Record without your voice" },
  ];

  const changeMicrophone = (value: string) => {
    if (value === MICROPHONE_OFF) {
      engine.setMicrophoneOn(false);
      return;
    }
    engine.setMicrophoneOn(true);
    engine.setMicrophoneId(value);
  };

  const tip =
    engine.mode === "screen_camera"
      ? has_floating_bubble
        ? "Share your entire screen to keep the camera bubble in the video. It floats above every window while you record."
        : "Your browser keeps the camera bubble inside this page. Share this tab, or your entire screen, to include it in the video."
      : engine.mode === "screen"
        ? "Next, pick your entire screen, a window or a single tab. Tick Share audio in that step to include its sound."
        : "Look at the camera and talk to your team, the video is added to this update when you finish.";

  return (
    <MediaDialog is_open={is_open} onClose={engine.cancel} aria_label="Record a video" panel_class_name="screen-recorder-setup" can_dismiss={!is_starting}>
      <header className="screen-recorder-setup__header">
        <span className="screen-recorder-setup__badge" aria-hidden="true">
          <span className="screen-recorder-setup__badge-dot" />
        </span>
        <div className="min-w-0">
          <h2 className="screen-recorder-setup__title">Record a video</h2>
          <p className="screen-recorder-setup__subtitle">Show what you mean. Record your screen and voice, then share it in this update.</p>
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
        <span className="screen-recorder-setup__stage-badge">{engine.quality}</span>
      </div>

      <div className="screen-recorder-setup__devices">
        {uses_camera && (
          <RecorderSelect label="Camera" icon={<Camera size={16} />} value={engine.camera_id} options={camera_options} onChange={engine.setCameraId} disabled={is_starting} />
        )}
        <RecorderSelect
          label="Microphone"
          icon={engine.is_microphone_on ? <Mic size={16} /> : <MicOff size={16} />}
          value={engine.is_microphone_on ? engine.microphone_id : MICROPHONE_OFF}
          options={microphone_options}
          onChange={changeMicrophone}
          disabled={is_starting}
          trailing={engine.is_microphone_on ? <MicrophoneLevelMeter stream={engine.microphone_stream} /> : <span className="recorder-select__muted-pill">Muted</span>}
        />
      </div>

      <fieldset className="screen-recorder-quality" disabled={is_starting}>
        <legend className="screen-recorder-quality__legend">Video quality</legend>
        <div className="screen-recorder-quality__options" role="radiogroup" aria-label="Video quality">
          {RECORDING_QUALITY_PRESETS.map((preset) => {
            const is_active = engine.quality === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={is_active}
                data-active={is_active || undefined}
                className="screen-recorder-quality__option"
                onClick={() => engine.setQuality(preset.id as RecordingQuality)}
                title={`${preset.caption}. Up to ${formatMinutes(maxRecordingMs(preset.id, engine.mode))} per video.`}
              >
                <span className="screen-recorder-quality__resolution">{preset.id}</span>
                <span className="screen-recorder-quality__name">{preset.label}</span>
                {preset.id === "1080p" && <span className="screen-recorder-quality__flag">Recommended</span>}
              </button>
            );
          })}
        </div>
      </fieldset>

      <p className="screen-recorder-setup__tip">{tip}</p>

      {engine.error && (
        <p className="screen-recorder-setup__error" role="alert">
          {engine.error}
        </p>
      )}

      <footer className="screen-recorder-setup__footer">
        <span className="screen-recorder-setup__limit">
          Up to {formatMinutes(engine.max_recording_ms)} at {engine.quality}
        </span>
        <button type="button" className="screen-recorder-setup__start" onClick={() => void engine.start()} disabled={is_starting}>
          <span className="screen-recorder-setup__start-dot" aria-hidden="true" />
          {is_starting ? (engine.mode === "camera" ? "Starting" : "Choose what to share") : "Start recording"}
        </button>
      </footer>
    </MediaDialog>
  );
}
