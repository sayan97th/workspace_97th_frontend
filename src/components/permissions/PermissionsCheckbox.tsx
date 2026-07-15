"use client";
import React from "react";
import { CheckIcon } from "@/icons/workspace-icons";

export type PermissionsCheckboxProps = {
  is_checked: boolean;
  onToggle: () => void;
  "aria-label"?: string;
};

/**
 * 20x20 monday-blue checkbox used by {@link PermissionsGroupCard} rows. Uses the
 * same raw `#0073ea` accent as {@link BoardTable}'s checkbox column — this is the
 * monday.com system blue, intentionally distinct from the app's own red brand color.
 */
const PermissionsCheckbox: React.FC<PermissionsCheckboxProps> = ({
  is_checked,
  onToggle,
  "aria-label": aria_label,
}) => (
  <span
    role="checkbox"
    aria-checked={is_checked}
    aria-label={aria_label}
    tabIndex={0}
    onClick={onToggle}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onToggle();
      }
    }}
    className="flex h-5 w-5 flex-none cursor-pointer items-center justify-center rounded-[5px]"
    style={is_checked ? { background: "#0073ea" } : { border: "1.5px solid var(--color-shell-border-strong)" }}
  >
    {is_checked && <CheckIcon size={12} className="text-white" />}
  </span>
);

export default PermissionsCheckbox;
