"use client";
import React from "react";
import { Check } from "lucide-react";
import "./profile.scss";

export type ProfileCheckboxProps = {
  label?: React.ReactNode;
  is_checked: boolean;
  onToggle: () => void;
  is_disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

/**
 * monday style square checkbox (optionally with a label), filled with the primary color when
 * checked. Used by the Notifications table channel columns. A real `role="checkbox"` button, so
 * screen readers announce its state.
 */
const ProfileCheckbox: React.FC<ProfileCheckboxProps> = ({
  label,
  is_checked,
  onToggle,
  is_disabled = false,
  className = "",
  "aria-label": aria_label,
}) => (
  <button
    type="button"
    role="checkbox"
    onClick={onToggle}
    aria-checked={is_checked}
    aria-label={aria_label}
    disabled={is_disabled}
    className={`profile-checkbox disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
  >
    <span className="profile-checkbox-box" data-checked={is_checked}>
      {is_checked ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : null}
    </span>
    {label}
  </button>
);

export default ProfileCheckbox;
