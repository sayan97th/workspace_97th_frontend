"use client";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, CloseIcon, LinkIcon } from "@/icons/workspace-icons";

export type CopyLinkModalProps = {
  is_open: boolean;
  title: string;
  description?: React.ReactNode;
  link: string;
  onClose: () => void;
};

/**
 * Generic "share this link" dialog: a title/description, a read-only link
 * field and a Copy button with a transient "Copied" state. Mirrors the
 * "Invite with link" section of {@link "@/layout/InviteMembersModal"} but
 * factored out as its own small modal so any future "share this" feature
 * (a view, a board, a report, …) can reuse it instead of re-implementing the
 * copy-to-clipboard dance.
 */
const CopyLinkModal: React.FC<CopyLinkModalProps> = ({ is_open, title, description, link, onClose }) => {
  const [is_copied, setIsCopied] = useState(false);

  useEffect(() => {
    if (is_open) setIsCopied(false);
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (insecure context); fail silently.
    }
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[420] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[#060e0e]/[0.68]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[421] w-[460px] max-w-full overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-2xl">
        <div className="flex items-center justify-between border-b border-shell-border px-[22px] py-4">
          <span className="text-base font-semibold tracking-[-0.01em]">{title}</span>
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
          {description && <p className="mb-3 text-[13px] leading-relaxed text-shell-text-secondary">{description}</p>}
          <div className="flex gap-2.5">
            <div className="flex flex-1 items-center gap-2 truncate rounded-[10px] border border-shell-border-strong bg-shell-bg px-3.5 py-[11px] text-[13px] text-shell-text-secondary">
              <LinkIcon size={14} className="flex-none text-shell-text-muted" />
              <span className="truncate">{link}</span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="flex flex-none items-center gap-2 rounded-[10px] border border-shell-border-strong px-4 text-[13px] font-semibold text-shell-text transition-colors hover:border-brand-500 hover:text-white"
            >
              {is_copied ? (
                <>
                  <CheckIcon size={13} className="text-success-400" />
                  Copied
                </>
              ) : (
                "Copy"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CopyLinkModal;
