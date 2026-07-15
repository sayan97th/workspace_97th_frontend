"use client";
import React, { useEffect, useState } from "react";
import { CloseIcon } from "@/icons/workspace-icons";
import {
  buildWorkspaceFromName,
  default_new_workspace_name,
  hashWorkspaceColor,
  workspace_create_accent_color,
  workspace_privacy_hints,
  type WorkspacePrivacy,
} from "@/data/workspace-create-data";
import type { BrowseWorkspace } from "@/data/workspace-browse-data";

type CreateWorkspaceModalProps = {
  is_open: boolean;
  onClose: () => void;
  onCreate: (workspace: BrowseWorkspace) => void;
};

type PrivacyOptionProps = {
  value: WorkspacePrivacy;
  label: string;
  is_selected: boolean;
  onSelect: (value: WorkspacePrivacy) => void;
};

const PrivacyOption: React.FC<PrivacyOptionProps> = ({ value, label, is_selected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(value)}
    className="flex items-center gap-2 text-left"
  >
    <span
      className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border-[1.5px] ${
        is_selected ? "border-[#2B76E5]" : "border-shell-border-strong"
      }`}
    >
      {is_selected && <span className="h-2 w-2 rounded-full bg-[#2B76E5]" />}
    </span>
    <span className="text-[13.5px] font-medium text-shell-text">{label}</span>
  </button>
);

/**
 * "Add new workspace" dialog reachable from the sidebar workspace switcher
 * (the `+` button and its "Add workspace" footer link) and from the
 * "Create workspace" rail button in {@link BrowseWorkspacesModal}. The badge
 * preview color/initial are derived live from the typed name so they match
 * what the created workspace's badge will look like everywhere else.
 */
const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  is_open,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState(default_new_workspace_name);
  const [privacy, setPrivacy] = useState<WorkspacePrivacy>("open");

  // Reset the form every time the modal is (re)opened.
  useEffect(() => {
    if (is_open) {
      setName(default_new_workspace_name);
      setPrivacy("open");
    }
  }, [is_open]);

  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previous_overflow;
    };
  }, [is_open, onClose]);

  if (!is_open) return null;

  const trimmed_name = name.trim();
  const can_submit = trimmed_name.length > 0;
  const preview_color = hashWorkspaceColor(name);
  const preview_initial = trimmed_name[0]?.toUpperCase() ?? "W";

  const handleSubmit = () => {
    if (!can_submit) return;
    onCreate(buildWorkspaceFromName(name, privacy));
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add new workspace"
      className="fixed inset-0 z-[420] flex items-center justify-center p-6"
    >
      <div
        className="absolute inset-0 bg-[#060e0e]/[0.68]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-[421] w-[420px] max-w-full overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-shell-border px-[22px] py-5">
          <span className="text-lg font-extrabold tracking-[-0.01em]">
            Add new workspace
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-shell-hover hover:text-white"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        {/* Avatar preview */}
        <div className="flex justify-center px-[22px] pb-2 pt-[26px]">
          <span
            className="flex h-[72px] w-[72px] flex-none items-center justify-center rounded-2xl text-[28px] font-extrabold text-white transition-colors duration-150"
            style={{ backgroundColor: preview_color }}
          >
            {preview_initial}
          </span>
        </div>

        {/* Workspace name */}
        <div className="px-[22px] pt-[22px]">
          <label className="mb-[7px] block text-[12.5px] font-semibold text-gray-400">
            Workspace name
          </label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={default_new_workspace_name}
            autoFocus
            className="w-full rounded-[9px] border border-shell-border-strong bg-shell-panel px-[13px] py-[11px] text-sm text-shell-text outline-none focus:border-[#2B76E5]"
          />
        </div>

        {/* Privacy */}
        <div className="px-[22px] pb-6 pt-5">
          <div className="mb-[9px] text-[12.5px] font-semibold text-gray-400">
            Privacy
          </div>
          <div className="flex items-center gap-[22px]">
            <PrivacyOption
              value="open"
              label="Open"
              is_selected={privacy === "open"}
              onSelect={setPrivacy}
            />
            <PrivacyOption
              value="closed"
              label="Closed"
              is_selected={privacy === "closed"}
              onSelect={setPrivacy}
            />
          </div>
          <div className="mt-[9px] text-xs text-gray-400">
            {workspace_privacy_hints[privacy]}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-shell-border px-[22px] py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2.5 text-[13.5px] font-semibold text-gray-300 transition-colors hover:bg-shell-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!can_submit}
            className="rounded-lg px-5 py-2.5 text-[13.5px] font-semibold transition-colors disabled:cursor-default"
            style={{
              backgroundColor: can_submit ? workspace_create_accent_color : "rgba(255,255,255,0.08)",
              color: can_submit ? "#fff" : "#6E7B7D",
            }}
          >
            Add workspace
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkspaceModal;
