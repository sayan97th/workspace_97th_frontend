import React from "react";

/** Class names and the radio dot shared by every automation recipe form. */
export const ROW = "flex h-9 w-full items-center gap-2.5 rounded-[6px] px-2.5 text-left text-[13px] text-boardtree-text hover:bg-boardtree-hover";
export const LABEL = "mb-1.5 mt-3 text-[12px] font-semibold uppercase tracking-wide text-boardtree-text-faint first:mt-0";
export const SAVE_BUTTON = "mt-4 flex h-9 w-full items-center justify-center rounded-[7px] bg-boardtree-accent text-[13px] font-medium text-white hover:bg-boardtree-accent-hover disabled:opacity-40";
export const HINT = "px-2.5 py-1.5 text-[12.5px] text-boardtree-text-faint";
export const TEXT_FIELD = "w-full rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2.5 text-[13px] text-boardtree-text outline-none placeholder:text-boardtree-text-faint focus:border-boardtree-accent";

export function Radio({ checked }: { checked: boolean }) {
  return (
    <span className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border-[1.5px] ${checked ? "border-boardtree-accent" : "border-boardtree-border"}`}>
      {checked && <span className="h-2 w-2 rounded-full bg-boardtree-accent" />}
    </span>
  );
}

/** The on and off switch of one automation, shared by the Automations dialog's list and the Manage tab. */
export function ToggleSwitch({ checked, onToggle, label = "Enable automation", disabled = false }: { checked: boolean; onToggle: () => void; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={`flex h-5 w-9 flex-none items-center rounded-full px-0.5 transition-colors disabled:opacity-50 ${checked ? "justify-end bg-boardtree-accent" : "justify-start bg-boardtree-track"}`}
    >
      <span className="h-4 w-4 rounded-full bg-white" />
    </button>
  );
}
