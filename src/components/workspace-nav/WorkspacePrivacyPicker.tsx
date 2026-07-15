"use client";
import React from "react";
import { workspace_privacy_hints, type WorkspacePrivacy } from "@/data/workspace-create-data";

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

export type WorkspacePrivacyPickerProps = {
  value: WorkspacePrivacy;
  onChange: (value: WorkspacePrivacy) => void;
  /** Optional label above the radios; omit when the caller renders its own. */
  label?: string;
};

/**
 * Open/Closed radio pair + hint text, shared by the "Add new workspace" dialog
 * ({@link CreateWorkspaceModal}) and the "Change type" action in the workspace
 * options menu ({@link ChangeWorkspaceTypeModal}) so the privacy copy/styling
 * only lives in one place.
 */
const WorkspacePrivacyPicker: React.FC<WorkspacePrivacyPickerProps> = ({
  value,
  onChange,
  label = "Privacy",
}) => (
  <div>
    {label && <div className="mb-[9px] text-[12.5px] font-semibold text-gray-400">{label}</div>}
    <div className="flex items-center gap-[22px]">
      <PrivacyOption value="open" label="Open" is_selected={value === "open"} onSelect={onChange} />
      <PrivacyOption
        value="closed"
        label="Closed"
        is_selected={value === "closed"}
        onSelect={onChange}
      />
    </div>
    <div className="mt-[9px] text-xs text-gray-400">{workspace_privacy_hints[value]}</div>
  </div>
);

export default WorkspacePrivacyPicker;
