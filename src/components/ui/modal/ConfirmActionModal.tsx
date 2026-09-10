"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircleIcon, CloseIcon, WarningTriangleIcon } from "@/icons/workspace-icons";
import type { ApiError } from "@/types/auth";

/**
 * Visual tone of the dialog. Colors the icon badge, the optional risk
 * callout, and the confirm button's focus ring:
 *  - "neutral": routine confirmations (archive, deactivate) — no icon.
 *  - "warning": reversible-but-costly actions (leave a workspace) — amber.
 *  - "danger": destructive/irreversible actions (delete) — brand red.
 */
export type ConfirmActionModalVariant = "neutral" | "warning" | "danger";

export type ConfirmActionModalProps = {
  is_open: boolean;
  title: string;
  description: React.ReactNode;
  confirm_label: string;
  cancel_label?: string;
  /**
   * @deprecated Pass `variant="danger"` instead. Kept so existing callers
   * (e.g. "Delete workspace") don't need to change; ignored when `variant`
   * is also given.
   */
  danger?: boolean;
  /** Visual tone; defaults to "danger" when `danger` is true, else "neutral". */
  variant?: ConfirmActionModalVariant;
  /**
   * Short, scannable list of what the user is about to lose — rendered as a
   * tinted callout under the description. Use it whenever the consequences
   * aren't obvious from the title alone (e.g. leaving vs. deleting a
   * workspace behave very differently).
   */
  risk_items?: string[];
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const VARIANT_STYLES: Record<
  ConfirmActionModalVariant,
  { badge: string; icon: React.ReactNode; callout: string; callout_icon: string }
> = {
  neutral: {
    badge: "",
    icon: null,
    callout: "border-shell-border-strong bg-shell-hover text-shell-text-secondary",
    callout_icon: "text-shell-text-muted",
  },
  warning: {
    badge: "bg-warning-500/[0.14] text-warning-600",
    icon: <WarningTriangleIcon size={15} />,
    callout: "border-warning-500/30 bg-warning-500/[0.08] text-shell-text-secondary",
    callout_icon: "text-warning-600",
  },
  danger: {
    badge: "bg-brand-500/[0.14] text-brand-200",
    icon: <WarningTriangleIcon size={15} />,
    callout: "border-brand-500/30 bg-brand-500/[0.08] text-shell-text-secondary",
    callout_icon: "text-brand-300",
  },
};

/**
 * Generic "are you sure?" dialog: an icon, a title/description, an optional
 * bullet list of consequences, and a cancel/confirm footer. Handles its own
 * submitting state and surfaces the backend's validation message (e.g.
 * "Assign another owner before leaving this workspace.") inline instead of
 * failing silently. Reusable across any destructive or consequential
 * action — first used by the workspace options menu's "Leave workspace" /
 * "Delete workspace" rows.
 *
 * While a confirm request is in flight, closing (backdrop click, Escape, or
 * Cancel) is disabled so the dialog can't be dismissed mid-request and the
 * user always sees the outcome — success closes it, failure shows the error
 * inline. Focus starts on Cancel (the safe default for a destructive
 * choice), is trapped inside the dialog while open, and returns to whatever
 * triggered it on close.
 */
const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  is_open,
  title,
  description,
  confirm_label,
  cancel_label = "Cancel",
  danger = false,
  variant,
  risk_items,
  onConfirm,
  onClose,
}) => {
  const [is_submitting, setIsSubmitting] = useState(false);
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const panel_ref = useRef<HTMLDivElement>(null);
  const cancel_button_ref = useRef<HTMLButtonElement>(null);
  const previously_focused_el = useRef<HTMLElement | null>(null);

  const resolved_variant: ConfirmActionModalVariant = variant ?? (danger ? "danger" : "neutral");
  const styles = VARIANT_STYLES[resolved_variant];

  useEffect(() => {
    if (is_open) {
      setIsSubmitting(false);
      setErrorMessage(null);
    }
  }, [is_open]);

  useEffect(() => {
    if (!is_open) return;

    previously_focused_el.current = document.activeElement as HTMLElement | null;
    cancel_button_ref.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!is_submitting) onClose();
        return;
      }
      if (event.key !== "Tab" || !panel_ref.current) return;

      const focusable = Array.from(panel_ref.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previously_focused_el.current?.focus();
    };
  }, [is_open, is_submitting, onClose]);

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

  const handleBackdropClick = () => {
    if (!is_submitting) onClose();
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
      <div
        className="absolute inset-0 bg-[#060e0e]/[0.68] backdrop-blur-[2px] animate-[confirm-modal-backdrop-in_160ms_ease-out]"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      <div
        ref={panel_ref}
        className="relative z-[421] w-[420px] max-w-full origin-center overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-2xl animate-[confirm-modal-in_180ms_cubic-bezier(0.16,1,0.3,1)]"
      >
        <div className="flex items-center justify-between border-b border-shell-border px-[22px] py-4">
          <div className="flex items-center gap-2.5">
            {resolved_variant !== "neutral" && (
              <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg ${styles.badge}`}>
                {styles.icon}
              </span>
            )}
            <span className="text-base font-semibold tracking-[-0.01em]">{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={is_submitting}
            aria-label="Close"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="px-[22px] py-5 text-[13.5px] leading-relaxed text-shell-text-secondary">
          {description}

          {risk_items && risk_items.length > 0 && (
            <ul className={`mt-3.5 space-y-2 rounded-lg border px-3.5 py-3 ${styles.callout}`}>
              {risk_items.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-[12.5px] leading-snug">
                  <span className={`mt-0.5 flex-none ${styles.callout_icon}`}>
                    <AlertCircleIcon size={12} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}

          {error_message && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-brand-500/30 bg-brand-500/[0.1] px-3 py-2.5 text-[13px] font-medium text-brand-200">
              <span className="mt-0.5 flex-none">
                <AlertCircleIcon size={13} />
              </span>
              <span>{error_message}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-shell-border px-[22px] py-4">
          <button
            ref={cancel_button_ref}
            type="button"
            onClick={onClose}
            disabled={is_submitting}
            className="rounded-lg px-3.5 py-2.5 text-[13.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover disabled:cursor-default disabled:opacity-50"
          >
            {cancel_label}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={is_submitting}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-shell-panel disabled:cursor-default disabled:opacity-50"
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
