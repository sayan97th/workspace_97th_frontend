"use client";
import React, { useEffect, useState } from "react";
import { AppWindow, Camera, EyeOff, Info, Mic, MicOff, MonitorPlay, MonitorSmartphone, PanelBottom, PictureInPicture2, Video, X } from "lucide-react";
import MediaDialog from "@/components/media/MediaDialog";
import { LiveCameraView, MicrophoneLevelMeter } from "./RecorderMediaViews";
import RecorderPermissionNotice from "./RecorderPermissionNotice";
import RecorderSelect, { type RecorderSelectOption } from "./RecorderSelect";
import type { RecorderEngine } from "./useRecorderEngine";
import { RECORDING_QUALITY_PRESETS, formatMinutes, getDocumentPictureInPicture, maxRecordingMs, type ControlsLocation, type RecordingMode } from "./recorderUtils";
import { detectBrowser, isDeviceBlocked, isMacOS, shortcutLabel, type RecorderBrowser } from "./recorderPlatform";

const MODES: { id: RecordingMode; label: string; short_label: string; hint: string; icon: React.ReactNode; needs_screen: boolean }[] = [
  { id: "screen", label: "Screen", short_label: "Screen", hint: "Your screen and voice", icon: <AppWindow size={17} />, needs_screen: true },
  { id: "screen_camera", label: "Screen and camera", short_label: "Screen + cam", hint: "Your face in a bubble", icon: <MonitorPlay size={17} />, needs_screen: true },
  { id: "camera", label: "Camera only", short_label: "Camera", hint: "Talk to your team", icon: <Video size={17} />, needs_screen: false },
];

const CONTROLS_LOCATIONS: { id: ControlsLocation; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: "page", label: "Bottom bar", hint: "A bar at the bottom of this page with pause, start over and finish.", icon: <PanelBottom size={16} /> },
  { id: "floating", label: "Floating window", hint: "A small window that stays on top of every app, handy when you record other windows.", icon: <PictureInPicture2 size={16} /> },
  { id: "hidden", label: "Hidden", hint: "Nothing on screen, so the controls never show in the video. Use the shortcuts below.", icon: <EyeOff size={16} /> },
];

/** Picker value for "record without a microphone". */
const MICROPHONE_OFF = "__off__";

export type RecorderSetupDialogProps = {
  engine: RecorderEngine;
};

/** One short line under the preview, adapted to the mode, the browser and macOS. */
function setupTip(mode: RecordingMode, browser: RecorderBrowser, is_mac: boolean, has_floating_bubble: boolean): string {
  if (mode === "camera") return "Look at the camera and talk to your team.";
  if (mode === "screen_camera" && !has_floating_bubble) return "Your camera bubble stays in this page. Share this tab or your entire screen to include it.";
  if (mode === "screen_camera") return "Share your entire screen to keep the floating camera bubble in the video.";
  if (browser === "safari") return "Safari records your screen and voice. To also record a tab's sound, use Chrome.";
  if (is_mac) return "Pick a tab and turn on Also share tab audio to include its sound.";
  return "Pick a screen, a window or a tab. Turn on Share audio to include its sound.";
}

/**
 * First step of the recorder, Loom's "new video" panel. Two columns on a
 * wide screen (the live preview and what to record on the left, devices,
 * quality and controls on the right) and one scrolling column on a phone,
 * with the Start button always in view. Blocked permissions show as compact
 * notices with Try again, a way to record without that device, and the steps
 * to unblock it (macOS System Settings included).
 */
export default function RecorderSetupDialog({ engine }: RecorderSetupDialogProps) {
  const is_open = engine.phase === "setup" || engine.phase === "starting";
  const is_starting = engine.phase === "starting";
  const uses_camera = engine.mode !== "screen";
  const [platform, setPlatform] = useState<{ browser: RecorderBrowser; is_mac: boolean; has_floating_bubble: boolean }>({
    browser: "other",
    is_mac: false,
    has_floating_bubble: false,
  });
  useEffect(() => setPlatform({ browser: detectBrowser(), is_mac: isMacOS(), has_floating_bubble: getDocumentPictureInPicture() !== null }), []);

  const camera_blocked = uses_camera && isDeviceBlocked(engine.camera_access);
  const microphone_blocked = engine.is_microphone_on && isDeviceBlocked(engine.microphone_access);
  const can_start = !is_starting && !(engine.mode === "camera" && camera_blocked);

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

  return (
    <MediaDialog is_open={is_open} onClose={engine.cancel} aria_label="Record a video" panel_class_name="screen-recorder-setup" can_dismiss={!is_starting}>
      <header className="screen-recorder-setup__header">
        <span className="screen-recorder-setup__badge" aria-hidden="true">
          <span className="screen-recorder-setup__badge-dot" />
        </span>
        <div className="min-w-0">
          <h2 className="screen-recorder-setup__title">Record a video</h2>
          <p className="screen-recorder-setup__subtitle">Show what you mean, then share it in this update.</p>
        </div>
        <button type="button" className="screen-recorder-setup__close" onClick={engine.cancel} aria-label="Close recorder" disabled={is_starting}>
          <X size={18} />
        </button>
      </header>

      <div className="screen-recorder-setup__body">
        {/* Left: what to record and how it will look. */}
        <section className="screen-recorder-setup__visual" aria-label="Preview">
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
                  aria-label={`${mode.label}, ${mode.hint}`}
                  disabled={is_disabled || is_starting}
                  title={is_disabled ? "Screen recording needs a desktop browser" : mode.hint}
                  onClick={() => engine.setMode(mode.id)}
                  className="screen-recorder-setup__mode"
                  data-active={is_active || undefined}
                >
                  {mode.icon}
                  <span className="screen-recorder-setup__mode-label">{mode.label}</span>
                  <span className="screen-recorder-setup__mode-label--short" aria-hidden="true">
                    {mode.short_label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="screen-recorder-setup__stage" data-mode={engine.mode}>
            {engine.mode === "screen" ? (
              <div className="screen-recorder-setup__stage-screen">
                <MonitorSmartphone size={32} strokeWidth={1.5} />
                <span>You pick the screen, window or tab next</span>
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
                      <Camera size={20} />
                      {engine.mode === "camera" ? (camera_blocked ? "Camera unavailable" : "Waiting for your camera") : ""}
                    </span>
                  )}
                </div>
              </>
            )}
            <span className="screen-recorder-setup__stage-badge">{engine.quality}</span>
            <span className="screen-recorder-setup__stage-audio" data-off={!engine.is_microphone_on || microphone_blocked || undefined}>
              {engine.is_microphone_on && !microphone_blocked ? <Mic size={12} /> : <MicOff size={12} />}
              {engine.is_microphone_on && !microphone_blocked ? "Voice on" : "No voice"}
            </span>
          </div>

          <p className="screen-recorder-setup__tip">
            <Info size={14} aria-hidden="true" />
            <span>{setupTip(engine.mode, platform.browser, platform.is_mac, platform.has_floating_bubble)}</span>
          </p>
        </section>

        {/* Right: devices, quality and the controls while recording. */}
        <section className="screen-recorder-setup__settings" aria-label="Settings">
          {(engine.screen_access === "system_denied" || camera_blocked || microphone_blocked) && (
            <div className="screen-recorder-setup__notices">
              {engine.screen_access === "system_denied" && (
                <RecorderPermissionNotice
                  kind="screen"
                  access="system_denied"
                  onRetry={engine.retryAccess}
                  onContinueWithout={() => engine.setMode("camera")}
                  continue_label="Use camera only"
                />
              )}
              {camera_blocked && (
                <RecorderPermissionNotice
                  kind="camera"
                  access={engine.camera_access}
                  onRetry={engine.retryAccess}
                  onContinueWithout={engine.can_record_screen ? () => engine.continueWithout("camera") : undefined}
                  continue_label="Record screen only"
                />
              )}
              {microphone_blocked && (
                <RecorderPermissionNotice
                  kind="microphone"
                  access={engine.microphone_access}
                  onRetry={engine.retryAccess}
                  onContinueWithout={() => engine.continueWithout("microphone")}
                  continue_label="Record without voice"
                />
              )}
            </div>
          )}

          <div className="screen-recorder-setup__group">
            <h3 className="screen-recorder-setup__group-title">Devices</h3>
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

          <div className="screen-recorder-setup__group">
            <h3 className="screen-recorder-setup__group-title">Video quality</h3>
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
                    disabled={is_starting}
                    className="screen-recorder-quality__option"
                    onClick={() => engine.setQuality(preset.id)}
                    title={`${preset.caption}. Up to ${formatMinutes(maxRecordingMs(preset.id, engine.mode))} per video.`}
                  >
                    <span className="screen-recorder-quality__resolution">{preset.id}</span>
                    <span className="screen-recorder-quality__name">{preset.label}</span>
                    {preset.id === "1080p" && <span className="screen-recorder-quality__flag">Best</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="screen-recorder-setup__group">
            <h3 className="screen-recorder-setup__group-title">While recording</h3>
            <div className="screen-recorder-controls-location" role="radiogroup" aria-label="Where the controls show">
              {CONTROLS_LOCATIONS.map((location) => {
                const is_active = engine.controls_location === location.id;
                const is_unavailable = location.id === "floating" && !platform.has_floating_bubble;
                return (
                  <button
                    key={location.id}
                    type="button"
                    role="radio"
                    aria-checked={is_active}
                    data-active={is_active || undefined}
                    disabled={is_starting || is_unavailable}
                    title={is_unavailable ? "Needs Chrome or Edge on a computer" : location.hint}
                    className="screen-recorder-controls-location__option"
                    onClick={() => engine.setControlsLocation(location.id)}
                  >
                    {location.icon}
                    <span>{location.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="screen-recorder-controls-location__hint">
              {CONTROLS_LOCATIONS.find((location) => location.id === engine.controls_location)?.hint}
            </p>
            <dl className="screen-recorder-shortcuts">
              <div>
                <dt>Pause</dt>
                <dd>
                  <kbd>{shortcutLabel("toggle_pause", platform.is_mac)}</kbd>
                </dd>
              </div>
              <div>
                <dt>Finish</dt>
                <dd>
                  <kbd>{shortcutLabel("finish", platform.is_mac)}</kbd>
                </dd>
              </div>
              <div>
                <dt>Show controls</dt>
                <dd>
                  <kbd>{shortcutLabel("toggle_controls", platform.is_mac)}</kbd>
                </dd>
              </div>
            </dl>
          </div>

          {engine.error && (
            <p className="screen-recorder-setup__error" role="alert">
              {engine.error}
            </p>
          )}
        </section>
      </div>

      <footer className="screen-recorder-setup__footer">
        <span className="screen-recorder-setup__limit">
          Up to {formatMinutes(engine.max_recording_ms)} at {engine.quality}
        </span>
        <div className="screen-recorder-setup__footer-actions">
          <button type="button" className="screen-recorder-setup__cancel" onClick={engine.cancel} disabled={is_starting}>
            Cancel
          </button>
          <button type="button" className="screen-recorder-setup__start" onClick={() => void engine.start()} disabled={!can_start}>
            <span className="screen-recorder-setup__start-dot" aria-hidden="true" />
            {is_starting ? (engine.mode === "camera" ? "Starting" : "Choose what to share") : "Start recording"}
          </button>
        </div>
      </footer>
    </MediaDialog>
  );
}
