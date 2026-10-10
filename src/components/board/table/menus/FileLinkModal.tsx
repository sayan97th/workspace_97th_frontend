"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

interface FileLinkModalProps {
  /** Persists the link. Rejecting keeps the dialog open and shows the error, resolving closes it. */
  onSave: (url: string, text: string) => Promise<void>;
  onClose: () => void;
}

const URL_MAX_LENGTH = 2048;
const TEXT_MAX_LENGTH = 255;

/** Adds `https://` to a bare "example.com/file.pdf", mirroring `StoreBoardItemCellFileLinkRequest` server side. */
function normalizeUrl(raw_url: string): string {
  const trimmed = raw_url.trim();
  if (!trimmed) return "";
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

/** Pulls the most useful message out of an `apiClient` rejection (`{ message, errors }`). */
function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const { errors, message } = error as { errors?: Record<string, string[]>; message?: string };
    const first_field_error = errors ? Object.values(errors).flat()[0] : undefined;
    if (first_field_error) return first_field_error;
    if (message) return message;
  }
  return "The link could not be saved. Please try again.";
}

/**
 * A Files cell's "From Link" dialog: any external URL (a PDF, Adobe, Miro or
 * Figma file, ...) plus optional display text, added to the cell next to its
 * uploaded files. Portaled to `document.body` so it sits above the table's
 * sticky columns and popovers, the same reason `PopoverPanel` portals.
 */
export default function FileLinkModal({ onSave, onClose }: FileLinkModalProps) {
  const [draft_url, setDraftUrl] = useState("");
  const [draft_text, setDraftText] = useState("");
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const [is_saving, setIsSaving] = useState(false);
  const url_input_id = useId();
  const text_input_id = useId();
  const title_id = useId();

  const can_save = draft_url.trim().length > 0 && !is_saving;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !is_saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_saving, onClose]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!can_save) return;

    const url = normalizeUrl(draft_url);
    if (!isValidUrl(url)) {
      setErrorMessage("Enter a valid http or https link.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      await onSave(url, draft_text.trim());
      onClose();
    } catch (error) {
      setErrorMessage(extractErrorMessage(error));
      setIsSaving(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-[rgba(30,34,55,0.45)] p-4"
      onClick={() => !is_saving && onClose()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={title_id}
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-[560px] max-w-full rounded-[14px] bg-boardtree-surface px-8 pb-7 pt-7 text-left shadow-[0_24px_60px_rgba(30,34,55,0.30)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={is_saving}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-[6px] text-boardtree-text-muted hover:bg-boardtree-hover disabled:opacity-50"
        >
          <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true">
            <path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <h2 id={title_id} className="text-center text-boardtree-text font-heading text-dialog-title">
          Upload file from link
        </h2>

        <LinkIllustration />

        <label htmlFor={url_input_id} className="mb-1.5 block text-[14px] text-boardtree-text">
          Paste any type of link
        </label>
        <input
          id={url_input_id}
          autoFocus
          type="text"
          inputMode="url"
          value={draft_url}
          maxLength={URL_MAX_LENGTH}
          onChange={(e) => {
            setDraftUrl(e.target.value);
            if (error_message) setErrorMessage(null);
          }}
          placeholder="e.g. pdf, adobe, miro, figma.."
          aria-invalid={error_message !== null}
          className={`w-full rounded-[6px] border bg-boardtree-surface px-3 py-2 text-[14px] text-boardtree-text outline-none placeholder:text-boardtree-text-faint focus:border-boardtree-accent ${
            error_message ? "border-boardtree-danger" : "border-boardtree-border"
          }`}
        />
        {error_message && (
          <p role="alert" className="mt-1.5 text-[12.5px] text-boardtree-danger">
            {error_message}
          </p>
        )}

        <label htmlFor={text_input_id} className="mb-1.5 mt-5 block text-[14px] text-boardtree-text">
          Text to display
        </label>
        <input
          id={text_input_id}
          type="text"
          value={draft_text}
          maxLength={TEXT_MAX_LENGTH}
          onChange={(e) => setDraftText(e.target.value)}
          placeholder="e.g. Design file V1"
          className="w-full rounded-[6px] border border-boardtree-border bg-boardtree-surface px-3 py-2 text-[14px] text-boardtree-text outline-none placeholder:text-boardtree-text-faint focus:border-boardtree-accent"
        />

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={!can_save}
            className="rounded-[6px] bg-boardtree-accent px-5 py-2 text-[14px] font-medium text-white hover:bg-boardtree-accent-hover disabled:cursor-not-allowed disabled:bg-boardtree-hover disabled:text-boardtree-text-faint"
          >
            {is_saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

/** Decorative header art: a few file type tiles joined by a link badge. */
function LinkIllustration() {
  return (
    <svg viewBox="0 0 240 110" className="mx-auto my-6 h-[110px] w-[240px]" aria-hidden="true">
      <rect x="42" y="30" width="44" height="44" rx="9" fill="#21a366" transform="rotate(-10 64 52)" />
      <path d="M55 42 L73 62 M73 42 L55 62" stroke="#fff" strokeWidth="4" strokeLinecap="round" transform="rotate(-10 64 52)" />

      <rect x="94" y="58" width="40" height="40" rx="9" fill="#ffcb00" />
      <path d="M104 88 L108 68 L113 88 L117 68 L122 88" fill="none" stroke="#1f1f39" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />

      <rect x="150" y="18" width="44" height="44" rx="9" fill="#2d2a6e" transform="rotate(10 172 40)" />
      <g transform="rotate(10 172 40)">
        <circle cx="166" cy="30" r="5" fill="#f24e1e" />
        <circle cx="178" cy="30" r="5" fill="#ff7262" />
        <circle cx="166" cy="41" r="5" fill="#a259ff" />
        <circle cx="178" cy="41" r="5" fill="#1abcfe" />
        <circle cx="166" cy="52" r="5" fill="#0acf83" />
      </g>

      <rect x="146" y="68" width="38" height="38" rx="8" fill="#00c875" />
      <path d="M153 98 L162 86 L168 93 L172 88 L178 98 Z" fill="#fff" />
      <circle cx="173" cy="78" r="3.5" fill="#fff" />

      <circle cx="120" cy="30" r="16" fill="#4f6bed" />
      <path
        d="M116 34 L124 26 M117.5 24.5 l2.3-2.3 a3.8 3.8 0 0 1 5.4 5.4 L122.9 29.9 M122.5 35.5 l-2.3 2.3 a3.8 3.8 0 0 1-5.4-5.4 L117.1 30.1"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
