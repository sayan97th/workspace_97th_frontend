"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/icons/board-icons";

export type InsertLinkModalProps = {
  is_open: boolean;
  /** Prefilled from the existing link's `href` when re-opened on a link the cursor already sits inside; empty for a brand new link. */
  initial_url: string;
  /** Prefilled from the current selection's text (or the existing link's label). */
  initial_text: string;
  /** True when the toolbar's Link button was clicked with the cursor already inside a link — shows "Remove link" alongside Cancel/Insert. */
  is_editing_existing: boolean;
  onInsert: (url: string, text: string) => void;
  onRemove: () => void;
  onClose: () => void;
};

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * "Insert link" dialog for `RichTextComposer`'s toolbar Link button —
 * replaces the browser's own blocking, unstyled `window.prompt("Link URL")`.
 * Mirrors {@link "@/components/ui/modal/CopyLinkModal"}/`ConfirmActionModal`'s
 * chrome (backdrop, centered panel, header with a close button, footer with
 * Cancel + a primary action) rather than a new one-off dialog shell, plus
 * `ConfirmActionModal`'s focus trap since this one has real form fields to
 * tab through.
 */
const InsertLinkModal: React.FC<InsertLinkModalProps> = ({
  is_open,
  initial_url,
  initial_text,
  is_editing_existing,
  onInsert,
  onRemove,
  onClose,
}) => {
  const [url, setUrl] = useState(initial_url);
  const [text, setText] = useState(initial_text);
  const panel_ref = useRef<HTMLFormElement>(null);
  const url_input_ref = useRef<HTMLInputElement>(null);
  const previously_focused_el = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!is_open) return;
    setUrl(initial_url);
    setText(initial_text);
    previously_focused_el.current = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => url_input_ref.current?.focus());
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is_open]);

  useEffect(() => {
    if (!is_open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
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
  }, [is_open, onClose]);

  if (!is_open) return null;

  const can_insert = url.trim().length > 0;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!can_insert) return;
    onInsert(url.trim(), text.trim());
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Insert link"
      // See `ConfirmActionModal`'s own doc for why: exempts this dialog from
      // a parent popover's outside-click detection, in case the toolbar
      // that opened it is ever itself nested inside one.
      data-board-menu-flyout
      className="fixed inset-0 z-[420] flex items-center justify-center p-6"
    >
      <div className="absolute inset-0 bg-[#060e0e]/[0.68] backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />

      <form
        onSubmit={handleSubmit}
        ref={panel_ref}
        className="relative z-[421] w-[420px] max-w-full overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-shell-border px-[22px] py-4">
          <span className="text-base font-semibold tracking-[-0.01em]">Insert link</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="space-y-4 px-[22px] py-5">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-shell-text">
              Write or paste a link <span className="text-[#e2445c]">*</span>
            </span>
            <input
              ref={url_input_ref}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="www.example.com"
              className="w-full rounded-lg border border-shell-border-strong bg-shell-bg px-3.5 py-[11px] text-[13.5px] text-shell-text outline-none transition-colors focus:border-[#00c875]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-shell-text">Text to display</span>
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Example text"
              className="w-full rounded-lg border border-shell-border-strong bg-shell-bg px-3.5 py-[11px] text-[13.5px] text-shell-text outline-none transition-colors focus:border-[#00c875]"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-2.5 border-t border-shell-border px-[22px] py-4">
          {is_editing_existing ? (
            <button type="button" onClick={onRemove} className="text-[13px] font-semibold text-[#e2445c] hover:underline">
              Remove link
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3.5 py-2.5 text-[13.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!can_insert}
              className={`rounded-lg px-5 py-2.5 text-[13.5px] font-semibold transition-colors ${
                can_insert
                  ? "bg-[#00c875] text-[#04241a] hover:bg-[#00e084]"
                  : "cursor-not-allowed bg-shell-hover text-shell-text-faint"
              }`}
            >
              Insert
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
};

export default InsertLinkModal;
