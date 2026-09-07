"use client";
import React, { useEffect, useState } from "react";
import { CloseIcon } from "@/icons/workspace-icons";

export type GiveFeedbackModalProps = {
  is_open: boolean;
  onSubmit: (message: string) => Promise<void>;
  onClose: () => void;
};

/**
 * Board options menu's "Give feedback" — a free-form note about the
 * product, submitted through `POST /api/feedback`. Deliberately minimal
 * (one textarea, no category/severity picker) since it's meant as a quick
 * "here's a thought" channel, not a bug-report/support-ticket flow.
 */
const GiveFeedbackModal: React.FC<GiveFeedbackModalProps> = ({ is_open, onSubmit, onClose }) => {
  const [message, setMessage] = useState("");
  const [is_submitting, setIsSubmitting] = useState(false);
  const [is_sent, setIsSent] = useState(false);

  useEffect(() => {
    if (is_open) {
      setMessage("");
      setIsSubmitting(false);
      setIsSent(false);
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

  const trimmed_message = message.trim();
  const handleSubmit = async () => {
    if (!trimmed_message) return;
    setIsSubmitting(true);
    try {
      await onSubmit(trimmed_message);
      setIsSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Give feedback" className="fixed inset-0 z-[420] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[#060e0e]/[0.68]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[421] w-[460px] max-w-full overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-2xl">
        <div className="flex items-center justify-between border-b border-shell-border px-[22px] py-4">
          <span className="text-base font-semibold tracking-[-0.01em]">Give feedback</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="px-[22px] py-5">
          {is_sent ? (
            <p className="text-[13.5px] leading-relaxed text-shell-text-secondary">
              Thanks for letting us know — your feedback has been sent.
            </p>
          ) : (
            <>
              <p className="mb-3 text-[13px] leading-relaxed text-shell-text-muted">
                Tell us what&apos;s working, what isn&apos;t, or what you&apos;d like to see on this board.
              </p>
              <textarea
                autoFocus
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={4000}
                rows={5}
                placeholder="Write your feedback…"
                className="w-full resize-none rounded-lg border border-shell-border-strong bg-shell-bg px-3.5 py-2.5 text-[13.5px] text-shell-text outline-none focus:border-brand-500"
              />
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-shell-border px-[22px] py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2.5 text-[13.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover"
          >
            {is_sent ? "Close" : "Cancel"}
          </button>
          {!is_sent && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={is_submitting || !trimmed_message}
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-default disabled:opacity-50"
            >
              {is_submitting ? "Sending…" : "Send feedback"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GiveFeedbackModal;
