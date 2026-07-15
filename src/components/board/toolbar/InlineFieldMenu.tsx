"use client";
import React, { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/icons/workspace-icons";

export type InlineFieldMenuProps<TOption> = {
  options: TOption[];
  getOptionId: (option: TOption) => string;
  isSelected: (option: TOption) => boolean;
  onSelect: (option: TOption) => void;
  renderOption: (option: TOption) => React.ReactNode;
  /** Trigger button content, e.g. a swatch + label or a direction icon + label. */
  renderValue: () => React.ReactNode;
  /** Optional heading rendered above the option list, e.g. "Item columns". */
  menu_heading?: string;
  /** Trigger width. Defaults to filling its flex parent. */
  width?: number;
  className?: string;
  menu_max_height?: number;
};

/**
 * Reusable inline "column-picker" style dropdown: a bordered trigger button
 * that opens a floating option list absolutely positioned beneath it. Used by
 * every Sort-row field (column / direction / and-or) so the same interaction
 * and styling can be reused by Group-by or any future board panel.
 */
function InlineFieldMenu<TOption>({
  options,
  getOptionId,
  isSelected,
  onSelect,
  renderOption,
  renderValue,
  menu_heading,
  width,
  className = "",
  menu_max_height = 280,
}: InlineFieldMenuProps<TOption>) {
  const [is_open, setIsOpen] = useState(false);
  const container_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!is_open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!container_ref.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [is_open]);

  return (
    <div ref={container_ref} className={`relative min-w-0 ${className}`} style={width ? { width } : { flex: 1 }}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`flex h-[38px] w-full items-center justify-between gap-2 rounded-lg border bg-shell-hover px-3 text-[13.5px] transition-colors ${
          is_open ? "border-brand-500" : "border-shell-border-strong hover:border-shell-text-faint"
        }`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-[9px] overflow-hidden">{renderValue()}</span>
        <ChevronDownIcon
          size={11}
          className={`flex-none text-shell-text-muted transition-transform ${is_open ? "rotate-180" : ""}`}
        />
      </button>

      {is_open && (
        <div
          className="absolute left-0 top-[calc(100%+5px)] z-[210] w-full min-w-[220px] overflow-y-auto rounded-[9px] border border-shell-border-strong bg-shell-panel p-1.5 shadow-2xl shadow-black/50"
          style={{ maxHeight: menu_max_height }}
        >
          {menu_heading && (
            <div className="px-2 pb-1 pt-1 text-[11.5px] font-semibold tracking-wide text-shell-text-faint">
              {menu_heading}
            </div>
          )}
          {options.map((option) => {
            const selected = isSelected(option);
            return (
              <div
                key={getOptionId(option)}
                onClick={() => {
                  onSelect(option);
                  setIsOpen(false);
                }}
                className={`flex cursor-pointer items-center gap-[10px] rounded-md px-2 py-2 text-[13.5px] font-medium text-shell-text hover:bg-shell-hover ${
                  selected ? "bg-brand-500/[0.16]" : ""
                }`}
              >
                {renderOption(option)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default InlineFieldMenu;
