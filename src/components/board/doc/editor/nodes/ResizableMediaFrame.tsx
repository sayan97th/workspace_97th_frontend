"use client";
import React, { useRef, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, Trash2 } from "lucide-react";
import type { MediaAlign } from "../extensions/media-nodes";

type ResizableMediaFrameProps = {
  width_percent: number | null;
  align: MediaAlign;
  selected: boolean;
  editable: boolean;
  onResize: (width_percent: number) => void;
  onAlign: (align: MediaAlign) => void;
  onDelete: () => void;
  /** Extra buttons for the floating toolbar, before Delete. */
  actions?: React.ReactNode;
  children: React.ReactNode;
};

const MIN_PERCENT = 15;

const ALIGN_OPTIONS: { value: MediaAlign; label: string; icon: React.ReactNode }[] = [
  { value: "left", label: "Align left", icon: <AlignLeft size={15} /> },
  { value: "center", label: "Align center", icon: <AlignCenter size={15} /> },
  { value: "right", label: "Align right", icon: <AlignRight size={15} /> },
];

/** Floating toolbar button, also reused by the media views for their extra actions. */
export const MediaToolbarButton: React.FC<{
  label: string;
  onClick: () => void;
  is_active?: boolean;
  children: React.ReactNode;
}> = ({ label, onClick, is_active = false, children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    aria-pressed={is_active}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    className={`doc-media-toolbar-button${is_active ? " is-active" : ""}`}
  >
    {children}
  </button>
);

/**
 * Frame around an image or a video: drag either side handle to resize (the
 * width is stored as a percent of the text column), and a floating toolbar
 * aligns the block left, center or right or deletes it. The size only
 * commits on release, so a drag is one undo step.
 */
const ResizableMediaFrame: React.FC<ResizableMediaFrameProps> = ({
  width_percent,
  align,
  selected,
  editable,
  onResize,
  onAlign,
  onDelete,
  actions,
  children,
}) => {
  const container_ref = useRef<HTMLDivElement>(null);
  const frame_ref = useRef<HTMLDivElement>(null);
  const [draft_percent, setDraftPercent] = useState<number | null>(null);

  const shown_percent = draft_percent ?? width_percent;

  const startResize = (event: React.PointerEvent, side: "left" | "right") => {
    if (!container_ref.current || !frame_ref.current) return;
    event.preventDefault();
    event.stopPropagation();
    const container_width = container_ref.current.clientWidth;
    const start_width = frame_ref.current.getBoundingClientRect().width;
    const start_x = event.clientX;
    // A centered block grows on both sides, so it follows the pointer twice as fast.
    const factor = align === "center" ? 2 : 1;
    let latest = (start_width / container_width) * 100;
    // Keeps the move events coming while the pointer crosses an embedded player's iframe.
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    setDraftPercent(latest);

    const handleMove = (move_event: PointerEvent) => {
      const delta = (move_event.clientX - start_x) * (side === "right" ? 1 : -1) * factor;
      latest = Math.min(100, Math.max(MIN_PERCENT, ((start_width + delta) / container_width) * 100));
      setDraftPercent(latest);
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setDraftPercent(null);
      onResize(Math.round(latest * 10) / 10);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <div ref={container_ref} className="doc-media-container" data-align={align}>
      <div
        ref={frame_ref}
        className={`doc-media-frame${selected ? " is-selected" : ""}${draft_percent !== null ? " is-resizing" : ""}`}
        style={shown_percent ? { width: `${shown_percent}%` } : undefined}
      >
        {children}

        {editable && (
          <>
            <span
              className="doc-media-handle is-left"
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
              onMouseDown={(event) => event.stopPropagation()}
              onPointerDown={(event) => startResize(event, "left")}
              aria-hidden="true"
            />
            <span
              className="doc-media-handle is-right"
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
              onMouseDown={(event) => event.stopPropagation()}
              onPointerDown={(event) => startResize(event, "right")}
              aria-hidden="true"
            />
            <div className="doc-media-toolbar" contentEditable={false}>
              {ALIGN_OPTIONS.map((option) => (
                <MediaToolbarButton
                  key={option.value}
                  label={option.label}
                  is_active={align === option.value}
                  onClick={() => onAlign(option.value)}
                >
                  {option.icon}
                </MediaToolbarButton>
              ))}
              {actions}
              <span className="doc-media-toolbar-divider" />
              <MediaToolbarButton label="Delete" onClick={onDelete}>
                <Trash2 size={15} />
              </MediaToolbarButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResizableMediaFrame;
