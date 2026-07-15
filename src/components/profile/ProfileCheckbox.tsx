"use client";
import React from "react";
import { CheckIcon } from "@/icons/workspace-icons";

export type ProfileCheckboxProps = {
  label?: React.ReactNode;
  is_checked: boolean;
  onToggle: () => void;
  className?: string;
  "aria-label"?: string;
};

/**
 * Square checkbox (optionally with a label) shared by the My Profile modal's mock
 * preference toggles (working-status "disable notifications while away", per-row
 * notification app/email columns, ...) — the square-checkbox counterpart to
 * Administration's {@link ToggleSwitch}.
 */
const ProfileCheckbox: React.FC<ProfileCheckboxProps> = ({
  label,
  is_checked,
  onToggle,
  className = "",
  "aria-label": aria_label,
}) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={is_checked}
    aria-label={aria_label}
    className={`flex items-center text-left text-[13.5px] text-shell-text-secondary ${label ? "gap-[10px]" : ""} ${className}`}
  >
    <span
      className={`flex h-[17px] w-[17px] flex-none items-center justify-center rounded-[5px] border-[1.5px] transition-colors ${
        is_checked ? "border-brand-500 bg-brand-500" : "border-[#6e7b7d] bg-transparent"
      }`}
    >
      {is_checked ? <CheckIcon size={11} className="text-white" /> : null}
    </span>
    {label}
  </button>
);

export default ProfileCheckbox;
