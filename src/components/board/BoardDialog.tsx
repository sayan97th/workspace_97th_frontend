"use client";
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/icons/workspace-icons";

export type BoardDialogProps = {
  is_open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Buttons row at the bottom, usually Cancel plus the main action. */
  footer?: React.ReactNode;
  /** Dialog width in pixels. Defaults to 480. */
  width?: number;
  /** Optional line under the title. */
  subtitle?: string;
};

/**
 * The dialog shell shared by the board's own modals (Rename board, Duplicate
 * board, Save as template, the Template center, the Dashboard widget
 * editor): a dimmed backdrop, a header with a close button, a scrolling body
 * and an optional footer. Escape and a click on the backdrop close it.
 */
const BoardDialog: React.FC<BoardDialogProps> = ({ is_open, title, onClose, children, footer, width = 480, subtitle }) => {
  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, onClose]);

  if (!is_open || typeof document === "undefined") return null;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[420] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-[#060e0e]/[0.68]" onClick={onClose} aria-hidden="true" />

      <div
        className="relative z-[421] flex max-h-[calc(100vh-32px)] max-w-full flex-col overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-2xl"
        style={{ width }}
      >
        <div className="flex flex-none items-start justify-between gap-3 border-b border-shell-border px-[22px] py-4">
          <div className="min-w-0">
            <div className="text-base font-semibold tracking-[-0.01em]">{title}</div>
            {subtitle && <div className="mt-0.5 text-[13px] text-shell-text-muted">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-[22px] py-5">{children}</div>

        {footer && <div className="flex flex-none items-center justify-end gap-2.5 border-t border-shell-border px-[22px] py-4">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

/** The two footer buttons every board dialog uses. */
export const DialogSecondaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = "", ...props }) => (
  <button
    type="button"
    {...props}
    className={`rounded-lg px-3.5 py-2.5 text-[13.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover ${className}`}
  />
);

export const DialogPrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = "", ...props }) => (
  <button
    type="button"
    {...props}
    className={`rounded-lg bg-brand-500 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-default disabled:opacity-50 ${className}`}
  />
);

export default BoardDialog;
