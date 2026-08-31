"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, WarningTriangleIcon } from "@/icons/workspace-icons";
import type { ApiError } from "@/types/auth";

export type ConfirmActionModalProps = {
  is_open: boolean;
  title: string;
  description: React.ReactNode;
  confirm_label: string;
  cancel_label?: string;
  /** Renders the warning icon + red confirm button for destructive actions. */
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

/**
 * Generic "are you sure?" dialog: an icon, a title/description, and a
 * cancel/confirm footer. Handles its own submitting state and surfaces the
 * backend's validation message (e.g. "Assign another owner before leaving
 * this workspace.") inline instead of failing silently. Reusable across any
 * destructive or consequential action — first used by the workspace options
 * menu's "Leave workspace" / "Delete workspace" rows.
 */
const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  is_open,
  title,
  description,
  confirm_label,
  cancel_label = "Cancel",
  danger = false,
  onConfirm,
  onClose,
}) => {
  const [is_submitting, setIsSubmitting] = useState(false);
  const [error_message, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (is_open) {
      setIsSubmitting(false);
      setErrorMessage(null);
    }
  }, [is_open]);

  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, onClose]);

  if (!is_open) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      const api_error = err as ApiError;
      const field_message = api_error.errors ? Object.values(api_error.errors)[0]?.[0] : undefined;
      setErrorMessage(field_message || api_error.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      // Reuses `MenuFlyout`'s own escape-hatch attribute (see its doc) so a parent
      // menu/popover's outside-click detection treats a click in here as "inside"
      // instead of unmounting the menu (this dialog included) out from under itself
      // before the click on Confirm/Cancel ever fires. Opened from a menu whenever
      // a destructive row (e.g. "Delete label") needs one more confirmation.
      data-board-menu-flyout
      className="fixed inset-0 z-[420] flex items-center justify-center p-6"
    >
      <div className="absolute inset-0 bg-[#060e0e]/[0.68]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[421] w-[420px] max-w-full overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-2xl">
        <div className="flex items-center justify-between border-b border-shell-border px-[22px] py-4">
          <div className="flex items-center gap-2.5">
            {danger && (
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-brand-500/[0.14] text-brand-200">
                <WarningTriangleIcon size={15} />
              </span>
            )}
            <span className="text-base font-semibold tracking-[-0.01em]">{title}</span>
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

        <div className="px-[22px] py-5 text-[13.5px] leading-relaxed text-shell-text-secondary">
          {description}
          {error_message && (
            <div className="mt-3 rounded-lg border border-brand-500/30 bg-brand-500/[0.1] px-3 py-2.5 text-[13px] font-medium text-brand-200">
              {error_message}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-shell-border px-[22px] py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2.5 text-[13.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover"
          >
            {cancel_label}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={is_submitting}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-default disabled:opacity-50"
          >
            {is_submitting ? "Please wait…" : confirm_label}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmActionModal;
