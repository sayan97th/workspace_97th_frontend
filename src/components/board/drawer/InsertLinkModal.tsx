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
  /** True when the toolbar's Link button was clicked with the cursor already inside a link, shows "Remove link" alongside Cancel/Insert. */
  is_editing_existing: boolean;
  onInsert: (url: string, text: string) => void;
  onRemove: () => void;
  onClose: () => void;
};

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * "Insert link" dialog for `RichTextComposer`'s toolbar Link button,
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
      aria-label={is_editing_existing ? "Edit link" : "Insert link"}
      // See `ConfirmActionModal`'s own doc for why: exempts this dialog from
      // a parent popover's outside-click detection, in case the toolbar
      // that opened it is ever itself nested inside one.
      data-board-menu-flyout
      className="fixed inset-0 z-[420] flex items-center justify-center p-6"
    >
      <div className="rich-text-dialog__backdrop" onClick={onClose} aria-hidden="true" />

      <form onSubmit={handleSubmit} ref={panel_ref} className="rich-text-dialog">
        <div className="rich-text-dialog__header">
          <span className="font-heading text-dialog-title">{is_editing_existing ? "Edit link" : "Insert link"}</span>
          <button type="button" onClick={onClose} aria-label="Close" className="rich-text-tool rich-text-tool--lg">
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="rich-text-dialog__body">
          <label className="block">
            <span className="rich-text-field__label">
              Write or paste a link <span className="rich-text-field__required">*</span>
            </span>
            <input
              ref={url_input_ref}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="www.example.com"
              className="rich-text-input"
            />
          </label>
          <label className="block">
            <span className="rich-text-field__label">Text to display</span>
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Example text"
              className="rich-text-input"
            />
          </label>
        </div>

        <div className="rich-text-dialog__footer">
          {is_editing_existing ? (
            <button type="button" onClick={onRemove} className="rich-text-button rich-text-button--danger">
              Remove link
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="rich-text-button rich-text-button--ghost">
              Cancel
            </button>
            <button type="submit" disabled={!can_insert} className="rich-text-button rich-text-button--primary">
              {is_editing_existing ? "Save" : "Insert"}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
};

export default InsertLinkModal;
