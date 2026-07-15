"use client";
import React from "react";
import { ToggleSwitch } from "@/components/board";

export type SettingsToggleRowProps = {
  label: string;
  description?: string;
  is_on: boolean;
  onToggle: () => void;
  className?: string;
};

/**
 * Label + description + {@link ToggleSwitch} row shared by every on/off setting in the
 * Administration modal (2FA, Google SSO, SAML, SCIM, guest approval, IP restriction,
 * "keep automations running", ...).
 */
const SettingsToggleRow: React.FC<SettingsToggleRowProps> = ({
  label,
  description,
  is_on,
  onToggle,
  className = "",
}) => (
  <div className={`flex items-start justify-between gap-4 ${className}`}>
    <div>
      <div className="mb-[3px] text-[13.5px] font-semibold text-[#d7dcdc]">{label}</div>
      {description ? (
        <div className="max-w-[420px] text-[12.5px] leading-relaxed text-[#8a9495]">{description}</div>
      ) : null}
    </div>
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={is_on}
      aria-label={label}
      className="mt-0.5 flex flex-none"
    >
      <ToggleSwitch is_on={is_on} />
    </button>
  </div>
);

export default SettingsToggleRow;
