"use client";
import React, { useEffect, useRef, useState } from "react";
import type { HomeBannerFraming } from "@/types/home-banner";
import { BANNER_DEVICES, type BannerDeviceId, type BannerPreviewImage } from "./BannerFrame";
import { MAX_BANNER_ZOOM, MIN_BANNER_ZOOM, clampFocal, clampZoom } from "./bannerFraming";

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const CORNERS: Corner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];

type BannerCropperProps = {
  device: BannerDeviceId;
  image: BannerPreviewImage;
  framing: HomeBannerFraming;
  /** Largest size the whole image may take on screen. */
  max_width: number;
  max_height: number;
  onFramingChange: (framing: Partial<HomeBannerFraming>) => void;
};

type Box = { left: number; top: number; width: number; height: number };

/**
 * The part of the image (in image pixels) the banner shows on this device. Same math as the
 * banner itself (`object-fit: cover`, centered on the focal point, zoomed around it), turned
 * into a rectangle people can move and resize.
 */
const visibleBox = (image: { width: number; height: number }, frame: { width: number; height: number }, framing: HomeBannerFraming): Box => {
  const scale = Math.max(frame.width / image.width, frame.height / image.height) * framing.zoom;
  const width = Math.min(image.width, frame.width / scale);
  const height = Math.min(image.height, frame.height / scale);
  return {
    left: (image.width - width) * (framing.focal_x / 100),
    top: (image.height - height) * (framing.focal_y / 100),
    width,
    height,
  };
};

/** Turns a box position back into the focal point the banner stores. */
const focalFromBox = (image: { width: number; height: number }, box: Box, fallback: HomeBannerFraming) => ({
  focal_x: image.width - box.width > 0.5 ? clampFocal((box.left / (image.width - box.width)) * 100) : fallback.focal_x,
  focal_y: image.height - box.height > 0.5 ? clampFocal((box.top / (image.height - box.height)) * 100) : fallback.focal_y,
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type DragState =
  | { kind: "move"; pointer_id: number; start_x: number; start_y: number; box: Box }
  | { kind: "resize"; pointer_id: number; corner: Corner; anchor_x: number; anchor_y: number };

/**
 * Crop mode of the banner editor: the whole image with the visible area as a bright box. Drag the
 * box anywhere (left, right, up, down), drag a corner to zoom, click outside it to jump there.
 */
const BannerCropper: React.FC<BannerCropperProps> = ({ device, image, framing, max_width, max_height, onFramingChange }) => {
  const frame = BANNER_DEVICES.find((item) => item.id === device) ?? BANNER_DEVICES[0];
  const display_scale = Math.min(max_width / image.width, max_height / image.height);
  const display_width = Math.round(image.width * display_scale);
  const display_height = Math.round(image.height * display_scale);
  const box = visibleBox(image, frame, framing);
  const base_box = visibleBox(image, frame, { ...framing, zoom: 1 });
  const can_move_x = image.width - box.width > 0.5;
  const can_move_y = image.height - box.height > 0.5;

  const surface_ref = useRef<HTMLDivElement>(null);
  const drag_ref = useRef<DragState | null>(null);
  const [is_dragging, setIsDragging] = useState(false);

  const latest = useRef({ framing, onFramingChange });
  useEffect(() => {
    latest.current = { framing, onFramingChange };
  }, [framing, onFramingChange]);

  // Wheel zooms around the box center, like the preview.
  useEffect(() => {
    const surface = surface_ref.current;
    if (!surface) return;
    const zoomOnWheel = (event: WheelEvent) => {
      event.preventDefault();
      const { framing: current, onFramingChange: change } = latest.current;
      change({ zoom: clampZoom(current.zoom * (event.deltaY < 0 ? 1.06 : 1 / 1.06)) });
    };
    surface.addEventListener("wheel", zoomOnWheel, { passive: false });
    return () => surface.removeEventListener("wheel", zoomOnWheel);
  }, []);

  /** Pointer position in image pixels. */
  const toImagePoint = (client_x: number, client_y: number) => {
    const rect = surface_ref.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (client_x - rect.left) / display_scale, y: (client_y - rect.top) / display_scale };
  };

  const moveBoxTo = (left: number, top: number, size: Box) => {
    const next_box = {
      ...size,
      left: clamp(left, 0, image.width - size.width),
      top: clamp(top, 0, image.height - size.height),
    };
    onFramingChange(focalFromBox(image, next_box, framing));
  };

  const startMove = (event: React.PointerEvent, start_box: Box) => {
    surface_ref.current?.setPointerCapture(event.pointerId);
    drag_ref.current = { kind: "move", pointer_id: event.pointerId, start_x: event.clientX, start_y: event.clientY, box: start_box };
    setIsDragging(true);
  };

  const handleSurfacePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    // A click outside the box centers the box on that spot, then keeps dragging from there.
    const point = toImagePoint(event.clientX, event.clientY);
    const inside =
      point.x >= box.left && point.x <= box.left + box.width && point.y >= box.top && point.y <= box.top + box.height;
    if (inside) {
      startMove(event, box);
      return;
    }
    const centered = {
      ...box,
      left: clamp(point.x - box.width / 2, 0, image.width - box.width),
      top: clamp(point.y - box.height / 2, 0, image.height - box.height),
    };
    onFramingChange(focalFromBox(image, centered, framing));
    startMove(event, centered);
  };

  const handleCornerPointerDown = (event: React.PointerEvent<HTMLSpanElement>, corner: Corner) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    surface_ref.current?.setPointerCapture(event.pointerId);
    // The opposite corner stays put while this one is dragged.
    const anchor_x = corner.endsWith("left") ? box.left + box.width : box.left;
    const anchor_y = corner.startsWith("top") ? box.top + box.height : box.top;
    drag_ref.current = { kind: "resize", pointer_id: event.pointerId, corner, anchor_x, anchor_y };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = drag_ref.current;
    if (!drag || drag.pointer_id !== event.pointerId) return;

    if (drag.kind === "move") {
      const delta_x = (event.clientX - drag.start_x) / display_scale;
      const delta_y = (event.clientY - drag.start_y) / display_scale;
      moveBoxTo(drag.box.left + delta_x, drag.box.top + delta_y, drag.box);
      return;
    }

    // Resizing keeps the device's shape: the wider of the two pointer distances wins.
    const point = toImagePoint(event.clientX, event.clientY);
    const aspect = base_box.width / base_box.height;
    const wanted_width = Math.max(Math.abs(point.x - drag.anchor_x), Math.abs(point.y - drag.anchor_y) * aspect);
    const zoom = clampZoom(base_box.width / Math.max(1, wanted_width));
    const width = base_box.width / zoom;
    const height = base_box.height / zoom;
    const left = drag.corner.endsWith("left") ? drag.anchor_x - width : drag.anchor_x;
    const top = drag.corner.startsWith("top") ? drag.anchor_y - height : drag.anchor_y;
    const next_box = {
      width,
      height,
      left: clamp(left, 0, image.width - width),
      top: clamp(top, 0, image.height - height),
    };
    onFramingChange({ zoom, ...focalFromBox(image, next_box, framing) });
  };

  const endDrag = () => {
    drag_ref.current = null;
    setIsDragging(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = (event.shiftKey ? 0.05 : 0.01) * Math.max(image.width, image.height);
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (moves[event.key]) {
      event.preventDefault();
      moveBoxTo(box.left + moves[event.key][0], box.top + moves[event.key][1], box);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      onFramingChange({ zoom: clampZoom(framing.zoom + 0.1) });
    } else if (event.key === "-") {
      event.preventDefault();
      onFramingChange({ zoom: clampZoom(framing.zoom - 0.1) });
    }
  };

  return (
    <div
      ref={surface_ref}
      className="hb-cropper"
      data-dragging={is_dragging || undefined}
      style={{ width: display_width, height: display_height }}
      onPointerDown={handleSurfacePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      tabIndex={0}
      role="application"
      aria-label="Crop area. Drag the box or use the arrow keys to move it, drag a corner or press plus and minus to zoom."
      onKeyDown={handleKeyDown}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- the uploaded image or a local preview URL. */}
      <img src={image.image_url} alt="" className="hb-cropper-image" draggable={false} />
      <div
        className="hb-crop-box"
        data-lock-x={!can_move_x || undefined}
        data-lock-y={!can_move_y || undefined}
        style={{
          left: box.left * display_scale,
          top: box.top * display_scale,
          width: box.width * display_scale,
          height: box.height * display_scale,
        }}
      >
        <span className="hb-crop-line" data-axis="x" style={{ left: "33.333%" }} />
        <span className="hb-crop-line" data-axis="x" style={{ left: "66.666%" }} />
        <span className="hb-crop-line" data-axis="y" style={{ top: "33.333%" }} />
        <span className="hb-crop-line" data-axis="y" style={{ top: "66.666%" }} />
        {CORNERS.map((corner) => (
          <span
            key={corner}
            className="hb-crop-handle"
            data-corner={corner}
            onPointerDown={(event) => handleCornerPointerDown(event, corner)}
            aria-hidden="true"
          />
        ))}
      </div>
      {!can_move_x && framing.zoom <= MIN_BANNER_ZOOM + 0.001 && MAX_BANNER_ZOOM > MIN_BANNER_ZOOM ? (
        <span className="hb-crop-tip" aria-hidden="true">
          Zoom in to move sideways
        </span>
      ) : null}
    </div>
  );
};

export default BannerCropper;
