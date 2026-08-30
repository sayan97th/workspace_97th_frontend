"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/icons/workspace-icons";
import EmojiInsertButton from "@/components/board/EmojiInsertButton";

export type NavItemFormModalProps = {
  is_open: boolean;
  title: string;
  submit_label: string;
  initial_label?: string;
  placeholder?: string;
  onSubmit: (label: string) => void | Promise<void>;
  onClose: () => void;
};

/**
 * Small single-field dialog used to create a folder / view and to rename an
 * existing navigation item. Kept generic so every tree action reuses one modal.
 */
const NavItemFormModal: React.FC<NavItemFormModalProps> = ({
  is_open,
  title,
  submit_label,
  initial_label = "",
  placeholder = "Name",
  onSubmit,
  onClose,
}) => {
  const [label, setLabel] = useState(initial_label);
  const [is_saving, setIsSaving] = useState(false);
  const input_ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (is_open) {
      setLabel(initial_label);
      setIsSaving(false);
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

  if (!is_open || typeof document === "undefined") return null;

  const trimmed = label.trim();
  const can_submit = trimmed.length > 0 && !is_saving;

  const handleSubmit = async () => {
    if (!can_submit) return;
    setIsSaving(true);
    try {
      await onSubmit(trimmed);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[420] flex items-center justify-center p-6"
    >
      <div className="absolute inset-0 bg-[#060e0e]/[0.68]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[421] w-[400px] max-w-full overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-2xl">
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

        <div className="relative px-[22px] py-5">
          <input
            ref={input_ref}
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleSubmit();
            }}
            placeholder={placeholder}
            autoFocus
            className="w-full rounded-[9px] border border-shell-border-strong bg-shell-panel-alt py-[11px] pl-[13px] pr-9 text-sm text-shell-text outline-none focus:border-brand-500/60"
          />
          <EmojiInsertButton
            input_ref={input_ref}
            value={label}
            onChange={setLabel}
            size={15}
            className="absolute right-[30px] top-1/2 -translate-y-1/2"
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
            disabled={!can_submit}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-default disabled:opacity-50"
          >
            {submit_label}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NavItemFormModal;
