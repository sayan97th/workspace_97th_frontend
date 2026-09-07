"use client";
import React, { useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/icons/workspace-icons";

export type RenameBoardModalProps = {
  is_open: boolean;
  initial_label: string;
  onSubmit: (label: string) => void | Promise<void>;
  onClose: () => void;
};

/**
 * Board options menu's "Settings" > "Rename board" — same dialog shell as
 * {@link ChangeBoardTypeModal}, swapping the type picker for a single label
 * field. Submits through the same `PATCH .../navigation/{id}` endpoint
 * `ChangeBoardTypeModal`'s board-type change already uses.
 */
const RenameBoardModal: React.FC<RenameBoardModalProps> = ({ is_open, initial_label, onSubmit, onClose }) => {
  const [label, setLabel] = useState(initial_label);
  const [is_saving, setIsSaving] = useState(false);
  const input_ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (is_open) {
      setLabel(initial_label);
      setIsSaving(false);
      window.setTimeout(() => input_ref.current?.select(), 0);
    }
  }, [is_open, initial_label]);

  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, onClose]);

  if (!is_open) return null;

  const trimmed_label = label.trim();
  const handleSubmit = async () => {
    if (!trimmed_label || trimmed_label === initial_label) return;
    setIsSaving(true);
    try {
      await onSubmit(trimmed_label);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Rename board" className="fixed inset-0 z-[420] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[#060e0e]/[0.68]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[421] w-[420px] max-w-full overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-2xl">
        <div className="flex items-center justify-between border-b border-shell-border px-[22px] py-4">
          <span className="text-base font-semibold tracking-[-0.01em]">Rename board</span>
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
          <input
            ref={input_ref}
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleSubmit();
            }}
            maxLength={255}
            placeholder="Board name"
            className="w-full rounded-lg border border-shell-border-strong bg-shell-bg px-3.5 py-2.5 text-[14px] font-medium text-shell-text outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-shell-border px-[22px] py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2.5 text-[13.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={is_saving || !trimmed_label || trimmed_label === initial_label}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-default disabled:opacity-50"
          >
            {is_saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RenameBoardModal;
