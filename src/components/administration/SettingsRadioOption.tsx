"use client";
import React from "react";

export type SettingsRadioOptionProps = {
  label: string;
  is_selected: boolean;
  onSelect: () => void;
};

/** Radio-circle row shared by the Administration modal's mutually-exclusive option groups (weekend days, home page, ...). */
const SettingsRadioOption: React.FC<SettingsRadioOptionProps> = ({ label, is_selected, onSelect }) => (
  <button type="button" onClick={onSelect} className="flex items-center gap-[11px] text-[13.5px] text-shell-text-secondary">
    <span
      className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border-2 ${
        is_selected ? "border-brand-500" : "border-shell-text-muted"
      }`}
    >
      {is_selected ? <span className="h-2 w-2 rounded-full bg-brand-500" /> : null}
    </span>
    {label}
  </button>
);

export default SettingsRadioOption;
