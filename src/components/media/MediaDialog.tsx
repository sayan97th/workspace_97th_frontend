"use client";
import React, { useEffect, useEffectEvent, useRef } from "react";
import { createPortal } from "react-dom";
import "./media-dialog.scss";

export type MediaDialogProps = {
  is_open: boolean;
  onClose: () => void;
  aria_label: string;
  /** "light" for forms (recorder setup, review), "dark" for viewing media (gallery, theater). */
  tone?: "light" | "dark";
  /** Extra class on the panel, sets its width. */
  panel_class_name?: string;
  /** False while something must not be interrupted (an upload, the countdown). */
  can_dismiss?: boolean;
  children: React.ReactNode;
};

/**
 * Centered dialog shell for the media features: portaled to `<body>` above
 * the drawer, closes on Escape and on a backdrop click, locks the page
 * scroll and gives focus back to whatever had it when it closes.
 */
export default function MediaDialog({ is_open, onClose, aria_label, tone = "light", panel_class_name, can_dismiss = true, children }: MediaDialogProps) {
  const panel_ref = useRef<HTMLDivElement>(null);
  const closeIfAllowed = () => {
    if (can_dismiss) onClose();
  };
  // Escape listener reads the latest can_dismiss/onClose without re-subscribing.
  const handleClose = useEffectEvent(closeIfAllowed);

  useEffect(() => {
    if (!is_open) return;
    const previously_focused = document.activeElement as HTMLElement | null;
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => panel_ref.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // A video in full screen and the PhotoSwipe lightbox handle their own Escape first.
      if (document.fullscreenElement || document.querySelector(".pswp")) return;
      // With dialogs stacked (gallery, then a video on top), only the topmost one closes.
      const open_dialogs = document.querySelectorAll(".media-dialog");
      if (open_dialogs[open_dialogs.length - 1] !== panel_ref.current?.parentElement) return;
      event.stopPropagation();
      event.preventDefault();
      handleClose();
    };
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previous_overflow;
      previously_focused?.focus?.();
    };
  }, [is_open]);

  if (!is_open || typeof document === "undefined") return null;

  return createPortal(
    <div className={`media-dialog media-dialog--${tone}`} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeIfAllowed()}>
      <div ref={panel_ref} role="dialog" aria-modal="true" aria-label={aria_label} tabIndex={-1} className={`media-dialog__panel ${panel_class_name ?? ""}`}>
        {children}
      </div>
    </div>,
    document.body
  );
}
