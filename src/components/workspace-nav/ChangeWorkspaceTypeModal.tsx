"use client";
import React, { useEffect, useState } from "react";
import { CloseIcon } from "@/icons/workspace-icons";
import type { WorkspacePrivacy } from "@/data/workspace-create-data";
import WorkspacePrivacyPicker from "./WorkspacePrivacyPicker";

export type ChangeWorkspaceTypeModalProps = {
  is_open: boolean;
  initial_privacy: WorkspacePrivacy;
  onSubmit: (privacy: WorkspacePrivacy) => void | Promise<void>;
  onClose: () => void;
};

/**
 * "Change type" action from the workspace options menu — same dialog shell as
 * {@link NavItemFormModal} (header/body/footer, Escape-to-close) but swaps the
 * text field for the shared {@link WorkspacePrivacyPicker} radios.
 */
const ChangeWorkspaceTypeModal: React.FC<ChangeWorkspaceTypeModalProps> = ({
  is_open,
  initial_privacy,
  onSubmit,
  onClose,
}) => {
  const [privacy, setPrivacy] = useState<WorkspacePrivacy>(initial_privacy);
  const [is_saving, setIsSaving] = useState(false);

  useEffect(() => {
    if (is_open) {
      setPrivacy(initial_privacy);
      setIsSaving(false);
    }
  }, [is_open, initial_privacy]);

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
      await onSubmit(privacy);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Change workspace type"
      className="fixed inset-0 z-[420] flex items-center justify-center p-6"
    >
      <div className="absolute inset-0 bg-[#060e0e]/[0.68]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[421] w-[400px] max-w-full overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-2xl">
        <div className="flex items-center justify-between border-b border-shell-border px-[22px] py-4">
          <span className="text-base font-semibold tracking-[-0.01em]">Change workspace type</span>
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
          <WorkspacePrivacyPicker value={privacy} onChange={setPrivacy} />
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
            disabled={is_saving || privacy === initial_privacy}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-default disabled:opacity-50"
          >
            {is_saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangeWorkspaceTypeModal;
