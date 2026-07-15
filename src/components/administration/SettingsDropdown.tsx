"use client";
import React, { useState } from "react";
import { BoardPopover } from "@/components/board";

export type SettingsDropdownOption = {
  id: string;
  label: string;
};

export type SettingsDropdownProps = {
  value: string | null;
  options: SettingsDropdownOption[];
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
  /** Muted trigger styling for "unassigned" states (e.g. a user with no department yet). */
  is_muted?: boolean;
};

const FALLBACK_WIDTH = 220;

/**
 * Anchored single-select dropdown built on the board toolbar's {@link BoardPopover}, so
 * every "pick one of a short list" control in the Administration modal (user role,
 * department, board/automation owner, session durations, audit event filter, ...) shares
 * one implementation instead of each section rolling its own popover.
 */
const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  value,
  options,
  onChange,
  placeholder = "Select…",
  className = "",
  is_muted = false,
}) => {
  const [anchor_el, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [is_open, setIsOpen] = useState(false);

  const selected_label = options.find((option) => option.id === value)?.label;

  return (
    <>
      <button
        type="button"
        ref={setAnchorEl}
        onClick={() => setIsOpen((current) => !current)}
        className={`flex items-center justify-between gap-2 rounded-lg border border-shell-border-strong bg-shell-hover-strong px-[10px] py-2 text-[12.5px] font-medium transition-colors hover:border-shell-text-muted ${
          selected_label && !is_muted ? "text-shell-text-secondary" : "text-shell-text-muted"
        } ${className}`}
      >
        <span className="truncate">{selected_label ?? placeholder}</span>
        <svg width="9" height="9" viewBox="0 0 12 12" className="flex-none text-shell-text-muted">
          <path
            d="M3 4.5 L6 7.5 L9 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <BoardPopover
        anchor_el={anchor_el}
        is_open={is_open}
        onClose={() => setIsOpen(false)}
        align="start"
        width={anchor_el?.getBoundingClientRect().width ?? FALLBACK_WIDTH}
      >
        <div className="max-h-[220px] overflow-y-auto p-[5px]">
          {options.map((option) => (
            <div
              key={option.id}
              onClick={() => {
                onChange(option.id);
                setIsOpen(false);
              }}
              className="cursor-pointer rounded-md px-[9px] py-2 text-[12.5px] font-medium text-shell-text-secondary hover:bg-shell-hover"
            >
              {option.label}
            </div>
          ))}
        </div>
      </BoardPopover>
    </>
  );
};

export default SettingsDropdown;
