"use client";
import React, { useEffect, useState } from "react";
import BoardDialog, { DialogPrimaryButton, DialogSecondaryButton } from "./BoardDialog";
import type { DuplicateBoardMode } from "@/services/workspace.service";

export type DuplicateBoardModalProps = {
  is_open: boolean;
  board_label: string;
  onSubmit: (options: { mode: DuplicateBoardMode; label: string }) => Promise<void>;
  onClose: () => void;
};

const MODES: { mode: DuplicateBoardMode; label: string; description: string }[] = [
  { mode: "structure", label: "Structure only", description: "Tabs, columns and groups, with no items." },
  { mode: "items", label: "Structure and items", description: "Everything above plus every item, subitem and value." },
  { mode: "items_updates", label: "Structure, items and updates", description: "Also copies the updates and replies posted on each item." },
];

/**
 * The board menu's "Duplicate board": names the copy and picks what it
 * includes, like monday.com's duplicate dialog.
 */
const DuplicateBoardModal: React.FC<DuplicateBoardModalProps> = ({ is_open, board_label, onSubmit, onClose }) => {
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<DuplicateBoardMode>("items");
  const [is_saving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!is_open) return;
    setLabel(`Duplicate of ${board_label}`);
    setMode("items");
    setError(null);
    setIsSaving(false);
  }, [is_open, board_label]);

  const trimmed_label = label.trim();
  const handleSubmit = async () => {
    if (!trimmed_label || is_saving) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSubmit({ mode, label: trimmed_label });
      onClose();
    } catch {
      setError("Couldn't duplicate the board. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <BoardDialog
      is_open={is_open}
      title="Duplicate board"
      onClose={onClose}
      footer={
        <>
          <DialogSecondaryButton onClick={onClose}>Cancel</DialogSecondaryButton>
          <DialogPrimaryButton onClick={handleSubmit} disabled={is_saving || !trimmed_label}>
            {is_saving ? "Duplicating…" : "Duplicate"}
          </DialogPrimaryButton>
        </>
      }
    >
      <label htmlFor="duplicate-board-name" className="mb-1.5 block text-[12.5px] font-medium text-shell-text-secondary">
        Board name
      </label>
      <input
        id="duplicate-board-name"
        autoFocus
        value={label}
        maxLength={255}
        onChange={(event) => setLabel(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && void handleSubmit()}
        className="mb-5 w-full rounded-lg border border-shell-border-strong bg-shell-bg px-3.5 py-2.5 text-[14px] font-medium text-shell-text outline-none focus:border-brand-500"
      />

      <fieldset>
        <legend className="mb-2 text-[12.5px] font-medium text-shell-text-secondary">What to copy</legend>
        <div className="flex flex-col gap-2">
          {MODES.map((option) => (
            <label
              key={option.mode}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 ${
                mode === option.mode ? "border-brand-500 bg-brand-500/5" : "border-shell-border hover:bg-shell-hover"
              }`}
            >
              <input type="radio" name="duplicate-mode" checked={mode === option.mode} onChange={() => setMode(option.mode)} className="mt-0.5" />
              <span>
                <span className="block text-[13.5px] font-medium text-shell-text">{option.label}</span>
                <span className="block text-[12.5px] text-shell-text-muted">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p className="mt-3 text-[12.5px] text-red-500">{error}</p>}
    </BoardDialog>
  );
};

export default DuplicateBoardModal;
