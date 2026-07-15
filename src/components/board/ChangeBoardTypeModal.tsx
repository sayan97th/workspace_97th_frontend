"use client";
import React, { useEffect, useState } from "react";
import { CloseIcon } from "@/icons/workspace-icons";
import type { BoardType } from "@/types/workspace";
import BoardTypePicker from "./BoardTypePicker";

export type ChangeBoardTypeModalProps = {
  is_open: boolean;
  initial_board_type: BoardType;
  onSubmit: (board_type: BoardType) => void | Promise<void>;
  onClose: () => void;
};

/**
 * "Board type" row action from {@link BoardHeader}'s info popover — same dialog
 * shell as {@link ChangeWorkspaceTypeModal} but swaps the open/closed radios for
 * the board-level {@link BoardTypePicker}.
 */
const ChangeBoardTypeModal: React.FC<ChangeBoardTypeModalProps> = ({
  is_open,
  initial_board_type,
  onSubmit,
  onClose,
}) => {
  const [board_type, setBoardType] = useState<BoardType>(initial_board_type);
  const [is_saving, setIsSaving] = useState(false);

  useEffect(() => {
    if (is_open) {
      setBoardType(initial_board_type);
      setIsSaving(false);
    }
  }, [is_open, initial_board_type]);

  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, onClose]);

  if (!is_open) return null;

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSubmit(board_type);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Change board type"
      className="fixed inset-0 z-[420] flex items-center justify-center p-6"
    >
      <div className="absolute inset-0 bg-[#060e0e]/[0.68]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[421] w-[400px] max-w-full overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-2xl">
        <div className="flex items-center justify-between border-b border-shell-border px-[22px] py-4">
          <span className="text-base font-semibold tracking-[-0.01em]">Change board type</span>
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
          <BoardTypePicker value={board_type} onChange={setBoardType} />
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
            disabled={is_saving || board_type === initial_board_type}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-default disabled:opacity-50"
          >
            {is_saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangeBoardTypeModal;
