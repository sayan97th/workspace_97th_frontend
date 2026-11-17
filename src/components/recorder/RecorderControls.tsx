"use client";
import React, { useState } from "react";
import { EyeOff, Pause, Play, RotateCcw, Square, Trash2 } from "lucide-react";
import { MicrophoneLevelMeter } from "./RecorderMediaViews";
import { formatRecordingTime, type RecorderPhase } from "./recorderUtils";
import { shortcutLabel } from "./recorderPlatform";

export type RecorderControlsProps = {
  phase: RecorderPhase;
  elapsed_ms: number;
  countdown: number;
  microphone_stream: MediaStream | null;
  /** Longest take at the chosen quality, the timer warns in its last minute. */
  max_recording_ms: number;
  /** "1080p", shown as a small badge next to the timer. */
  quality_label?: string;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onRestart: () => void;
  onCancel: () => void;
  /** Hides the controls so they stay out of the video, the shortcut brings them back. */
  onHideControls?: () => void;
  /** "bar" floats over the page, "pip" fills the floating window. */
  layout?: "bar" | "pip";
};

/** The last minute before the limit shows the remaining time in amber. */
const LIMIT_WARNING_MS = 60 * 1000;

/**
 * Loom style recording controls: a pulsing dot with the timer, then pause or
 * resume, start over, delete and a red Finish button. Shared by the bar that
 * floats over the page and the always on top Picture in Picture window.
 * Delete asks once more inline, a slip of the mouse must not lose a take.
 */
export default function RecorderControls({
  phase,
  elapsed_ms,
  countdown,
  microphone_stream,
  max_recording_ms,
  quality_label,
  onPause,
  onResume,
  onFinish,
  onRestart,
  onCancel,
  onHideControls,
  layout = "bar",
}: RecorderControlsProps) {
  const [is_confirming_delete, setConfirmingDelete] = useState(false);
  const is_paused = phase === "paused";
  const is_countdown = phase === "countdown";
  const is_processing = phase === "processing";
  const remaining_ms = max_recording_ms - elapsed_ms;
  const is_near_limit = remaining_ms <= LIMIT_WARNING_MS;

  if (is_confirming_delete) {
    return (
      <div className={`screen-recorder__controls screen-recorder__controls--${layout}`} role="group" aria-label="Delete recording">
        <span className="screen-recorder__controls-question">Delete this recording?</span>
        <button type="button" className="screen-recorder__pill-button" onClick={() => setConfirmingDelete(false)}>
          Keep
        </button>
        <button
          type="button"
          className="screen-recorder__pill-button screen-recorder__pill-button--danger"
          onClick={() => {
            setConfirmingDelete(false);
            onCancel();
          }}
        >
          Delete
        </button>
      </div>
    );
  }

  return (
    <div className={`screen-recorder__controls screen-recorder__controls--${layout}`} role="group" aria-label="Recording controls">
      <span className="screen-recorder__status" data-state={is_countdown ? "countdown" : is_paused ? "paused" : is_processing ? "processing" : "recording"}>
        <span className="screen-recorder__status-dot" aria-hidden="true" />
        <span className="screen-recorder__time" aria-live="off">
          {is_countdown ? `Starting in ${countdown}` : is_processing ? "Saving" : formatRecordingTime(elapsed_ms)}
        </span>
        {!is_countdown && !is_processing && is_near_limit && (
          <span className="screen-recorder__limit">{formatRecordingTime(remaining_ms)} left</span>
        )}
        {quality_label && !is_near_limit && <span className="screen-recorder__quality-badge">{quality_label}</span>}
      </span>

      {!is_countdown && !is_processing && <MicrophoneLevelMeter stream={microphone_stream} className="screen-recorder__controls-meter" />}

      <span className="screen-recorder__controls-divider" aria-hidden="true" />

      {!is_processing && (
        <>
          {!is_countdown && (
            <button
              type="button"
              className="screen-recorder__icon-button"
              onClick={is_paused ? onResume : onPause}
              aria-label={is_paused ? "Resume recording" : "Pause recording"}
              aria-keyshortcuts="Alt+Shift+P"
              title={`${is_paused ? "Resume" : "Pause"} (${shortcutLabel("toggle_pause")})`}
            >
              {is_paused ? <Play size={17} /> : <Pause size={17} />}
            </button>
          )}
          <button type="button" className="screen-recorder__icon-button" onClick={onRestart} aria-label="Start over" title="Start over">
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            className="screen-recorder__icon-button screen-recorder__icon-button--danger"
            onClick={() => (is_countdown ? onCancel() : setConfirmingDelete(true))}
            aria-label={is_countdown ? "Cancel recording" : "Delete recording"}
            title={is_countdown ? "Cancel" : "Delete"}
          >
            <Trash2 size={16} />
          </button>
          {!is_countdown && (
            <button
              type="button"
              className="screen-recorder__finish"
              onClick={onFinish}
              aria-label="Finish recording"
              aria-keyshortcuts="Alt+Shift+S"
              title={`Finish (${shortcutLabel("finish")})`}
            >
              <Square size={12} fill="currentColor" strokeWidth={0} />
              <span>Finish</span>
            </button>
          )}
          {onHideControls && !is_countdown && (
            <button
              type="button"
              className="screen-recorder__icon-button screen-recorder__icon-button--subtle"
              onClick={onHideControls}
              aria-label="Hide the controls"
              aria-keyshortcuts="Alt+Shift+H"
              title={`Hide so they stay out of the video. ${shortcutLabel("toggle_controls")} shows them again`}
            >
              <EyeOff size={16} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
