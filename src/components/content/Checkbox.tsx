import React from "react";
import { CheckIcon, MinusIcon } from "@/icons/workspace-icons";

export type CheckboxProps = {
  checked: boolean;
  /** Renders a dash instead of a check (used for "select all" when partial). */
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  aria_label: string;
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
}) => {
  const is_marked = checked || indeterminate;

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
      className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[5px] border-[1.5px] transition-colors ${
        is_marked
          ? "border-brand-500 bg-brand-500 text-white"
          : "border-[#c6c9c3] bg-white hover:border-gray-400"
      }`}
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
