"use client";
import React, { useEffect, useState } from "react";

export type SlideOverPanelProps = {
  is_open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Layout/appearance of the panel itself (width, background, border, shadow, …). */
  panel_class_name: string;
  /** Layout/appearance of the backdrop. Defaults to the shared board-drawer scrim. */
  overlay_class_name?: string;
};

const TRANSITION_DURATION_MS = 200;

/**
 * Right-edge slide-over shell shared by every board item drawer
 * (`BoardItemDrawer`, `KanbanItemDrawer`, …future ones): fades the backdrop
 * in/out and slides the panel in/out from the right, instead of the panel
 * just popping in and vanishing instantly.
 *
 * Stays mounted for one extra `TRANSITION_DURATION_MS` after `is_open` flips
 * to `false` so the close has something to animate — callers should pair
 * this with {@link useLatchWhileOpen} so the panel keeps showing its last
 * row's content while it slides away, instead of going blank mid-animation.
 */
function SlideOverPanel({ is_open, onClose, children, panel_class_name, overlay_class_name }: SlideOverPanelProps) {
  const [is_mounted, setIsMounted] = useState(is_open);
  const [is_visible, setIsVisible] = useState(false);

  useEffect(() => {
    if (is_open) {
      setIsMounted(true);
      const raf_id = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf_id);
    }
    setIsVisible(false);
    const timeout_id = setTimeout(() => setIsMounted(false), TRANSITION_DURATION_MS);
    return () => clearTimeout(timeout_id);
  }, [is_open]);

  if (!is_mounted) return null;

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[400] transition-opacity duration-200 ease-out ${
          overlay_class_name ?? "bg-[rgba(4,12,12,0.42)]"
        } ${is_visible ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`fixed bottom-0 right-0 top-0 z-[401] flex flex-col transition-transform duration-200 ease-out ${panel_class_name} ${
          is_visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {children}
      </div>
    </>
  );
}

export default SlideOverPanel;
