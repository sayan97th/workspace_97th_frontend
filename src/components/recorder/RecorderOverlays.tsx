"use client";
import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2 } from "lucide-react";
import RecorderControls, { type RecorderControlsProps } from "./RecorderControls";
import { LiveCameraView } from "./RecorderMediaViews";

type BubbleSize = "small" | "large";

const BUBBLE_SIZES: Record<BubbleSize, number> = { small: 168, large: 264 };
const EDGE_GAP = 24;

/**
 * The camera bubble drawn inside the page, used when the browser has no
 * Document Picture in Picture (Firefox, Safari) or the floating window was
 * closed. Drag it anywhere, the corner button switches between two sizes.
 * In camera only mode it becomes a large 16:9 stage instead.
 */
export function InPageCameraBubble({ stream, variant }: { stream: MediaStream | null; variant: "bubble" | "stage" }) {
  const [size, setSize] = useState<BubbleSize>("small");
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const drag_ref = useRef<{ offset_x: number; offset_y: number } | null>(null);
  const bubble_ref = useRef<HTMLDivElement>(null);

  if (typeof document === "undefined") return null;

  if (variant === "stage") {
    return createPortal(
      <div className="screen-recorder__stage" aria-label="Camera preview">
        <LiveCameraView stream={stream} />
      </div>,
      document.body
    );
  }

  const diameter = BUBBLE_SIZES[size];

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    const rect = bubble_ref.current?.getBoundingClientRect();
    if (!rect) return;
    drag_ref.current = { offset_x: event.clientX - rect.left, offset_y: event.clientY - rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = drag_ref.current;
    if (!drag) return;
    const max_left = window.innerWidth - diameter - 8;
    const max_top = window.innerHeight - diameter - 8;
    setPosition({
      left: Math.min(Math.max(8, event.clientX - drag.offset_x), max_left),
      top: Math.min(Math.max(8, event.clientY - drag.offset_y), max_top),
    });
  };

  const style: React.CSSProperties = {
    width: diameter,
    height: diameter,
    ...(position ? { left: position.left, top: position.top } : { left: EDGE_GAP, bottom: EDGE_GAP + 64 }),
  };

  return createPortal(
    <div
      ref={bubble_ref}
      className="screen-recorder__bubble"
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={() => (drag_ref.current = null)}
      onPointerCancel={() => (drag_ref.current = null)}
      aria-label="Camera bubble, drag to move"
    >
      <LiveCameraView stream={stream} />
      <button
        type="button"
        className="screen-recorder__bubble-size"
        onClick={() => setSize((current) => (current === "small" ? "large" : "small"))}
        aria-label={size === "small" ? "Make the camera bubble larger" : "Make the camera bubble smaller"}
      >
        {size === "small" ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
      </button>
    </div>,
    document.body
  );
}

/** Big 3, 2, 1 in the middle of the page before the capture starts. Clicks pass through it. */
export function CountdownOverlay({ countdown }: { countdown: number }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="screen-recorder__countdown" aria-live="assertive">
      <span key={countdown} className="screen-recorder__countdown-number">
        {countdown}
      </span>
    </div>,
    document.body
  );
}

/** The recording controls pinned to the bottom of the page. */
export function InPageControlBar(props: RecorderControlsProps) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="screen-recorder__bar-dock">
      <RecorderControls {...props} layout="bar" />
    </div>,
    document.body
  );
}

/**
 * Content of the always on top Document Picture in Picture window: the round
 * camera bubble (screen and camera mode) above the controls. Rendered with a
 * portal into that window's own document, the styles were copied in when it
 * opened (`copyStylesInto`).
 */
export function PictureInPicturePanel({
  pip_window,
  camera_stream,
  show_camera,
  show_controls,
  countdown,
  ...control_props
}: RecorderControlsProps & { pip_window: Window; camera_stream: MediaStream | null; show_camera: boolean; show_controls: boolean }) {
  return createPortal(
    <div className={`screen-recorder__pip ${show_camera ? "screen-recorder__pip--camera" : ""} ${show_controls ? "" : "screen-recorder__pip--bubble-only"}`}>
      {show_camera && (
        <div className="screen-recorder__pip-bubble">
          <LiveCameraView stream={camera_stream} />
          {control_props.phase === "countdown" && <span className="screen-recorder__pip-countdown">{countdown}</span>}
        </div>
      )}
      {show_controls && <RecorderControls {...control_props} countdown={countdown} layout="pip" />}
    </div>,
    pip_window.document.body
  );
}
