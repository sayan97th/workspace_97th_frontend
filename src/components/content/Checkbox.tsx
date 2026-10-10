import React from "react";
import { CheckIcon, MinusIcon } from "@/icons/workspace-icons";

export type CheckboxProps = {
  checked: boolean;
  /** Renders a dash instead of a check (used for "select all" when partial). */
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  aria_label: string;
  /** "monday" is the smaller, blue accented box used by the Manage Workspace content table. */
  variant?: "default" | "monday";
};

/**
 * Small rounded checkbox matching the content table design. Selected and
 * indeterminate states fill with the brand color and show a check / dash.
 */
const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  indeterminate = false,
  onChange,
  aria_label,
  variant = "default",
}) => {
  const is_marked = checked || indeterminate;
  const variant_class =
    variant === "monday"
      ? `h-4 w-4 rounded-[4px] border ${
          is_marked
            ? "border-[var(--color-workspace-manage-accent)] bg-[var(--color-workspace-manage-accent)] text-white"
            : "border-[var(--color-workspace-manage-control)] bg-shell-panel hover:border-shell-text-secondary"
        }`
      : `h-[18px] w-[18px] rounded-[5px] border-[1.5px] ${
          is_marked ? "border-brand-500 bg-brand-500 text-white" : "border-[#c6c9c3] bg-white hover:border-gray-400"
        }`;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={aria_label}
      onClick={(event) => {
        event.stopPropagation();
        onChange(!checked);
      }}
      className={`flex flex-none items-center justify-center transition-colors ${variant_class}`}
    >
      {indeterminate ? (
        <MinusIcon />
      ) : checked ? (
        <CheckIcon />
      ) : null}
    </button>
  );
};

export default Checkbox;
