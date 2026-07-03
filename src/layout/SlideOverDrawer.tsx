"use client";
import React, { useEffect } from "react";

type SlideOverDrawerProps = {
  is_open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. */
  aria_label: string;
  /** Panel width in px; capped to the viewport. Design default is 392. */
  width?: number;
  children: React.ReactNode;
};

/**
 * Reusable right-side slide-over drawer used across the dark workspace shell
 * (notifications, update feed, etc.). Handles the dimmed overlay, slide
 * transition, Escape-to-close and body scroll lock. The drawer stays mounted so
 * it can animate both in and out; callers only toggle `is_open`.
 */
const SlideOverDrawer: React.FC<SlideOverDrawerProps> = ({
  is_open,
  onClose,
  aria_label,
  width = 392,
  children,
}) => {
  // Close on Escape and lock body scroll only while the drawer is open.
  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previous_overflow;
    };
  }, [is_open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-[200] ${is_open ? "" : "pointer-events-none"}`}
      aria-hidden={!is_open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-[#060e0e]/40 transition-opacity duration-300 ${
          is_open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={aria_label}
        style={{ width: `min(${width}px, 100vw)` }}
        className={`shell-scrollbar absolute right-0 top-0 flex h-screen flex-col overflow-hidden border-l border-white/[0.08] bg-[#0a1717] text-[#e9eded] shadow-[-18px_0_46px_rgba(0,0,0,0.42)] transition-transform duration-300 ease-out ${
          is_open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {children}
      </aside>
    </div>
  );
};

export default SlideOverDrawer;
