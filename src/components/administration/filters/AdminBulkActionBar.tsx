"use client";
import React from "react";
import { CloseIcon } from "@/icons/workspace-icons";

export type AdminBulkActionBarProps = {
  selected_count: number;
  /** Singular noun for the selected rows, e.g. "user" or "board". */
  noun: string;
  onClear: () => void;
  children: React.ReactNode;
};

export const bulkActionButtonClass =
  "flex items-center gap-1.5 rounded-lg px-3 py-[7px] text-[12.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover disabled:cursor-default disabled:opacity-50";

export const bulkDangerButtonClass =
  "flex items-center gap-1.5 rounded-lg px-3 py-[7px] text-[12.5px] font-semibold text-[#ff8a94] transition-colors hover:bg-[#e2445c]/[0.12] disabled:cursor-default disabled:opacity-50";

/**
 * Floating bar pinned to the bottom of an Administration table while rows are selected, the
 * same pattern as the board table's item selection bar: a count, the bulk actions and a way
 * to clear the selection.
 */
const AdminBulkActionBar: React.FC<AdminBulkActionBarProps> = ({ selected_count, noun, onClear, children }) => {
  if (selected_count === 0) return null;

  return (
    <div className="pointer-events-none sticky bottom-4 z-20 mt-4 flex justify-center">
      <div
        role="toolbar"
        aria-label={`Actions for selected ${noun}s`}
        className="pointer-events-auto flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-shell-border-strong bg-shell-panel px-2 py-1.5 shadow-2xl shadow-black/40"
      >
        <span className="flex items-center gap-2 border-r border-shell-border px-3 py-1 text-[12.5px] font-bold text-shell-text">
          <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-md bg-brand-500 px-1.5 text-[12px] text-white">
            {selected_count}
          </span>
          {selected_count === 1 ? `${noun} selected` : `${noun}s selected`}
        </span>
        {children}
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className="ml-1 flex h-[30px] w-[30px] items-center justify-center rounded-lg text-shell-text-muted hover:bg-shell-hover hover:text-shell-text"
        >
          <CloseIcon size={13} />
        </button>
      </div>
    </div>
  );
};

export default AdminBulkActionBar;
