"use client";
import React, { useState } from "react";
import { BoardPopover } from "@/components/board";
import AdminFilterEditor from "./AdminFilterEditor";
import {
  countActiveFilters,
  describeFilterValue,
  isFilterValueActive,
  type AdminFilterDef,
  type AdminFilterState,
  type AdminFilterValue,
} from "./adminFilterTypes";

export type AdminFilterBarProps = {
  defs: AdminFilterDef[];
  state: AdminFilterState;
  onChange: (key: string, value: AdminFilterValue | null) => void;
  onClearAll: () => void;
  className?: string;
};

const POPOVER_WIDTH = 280;

const FilterButton: React.FC<{
  def: AdminFilterDef;
  value: AdminFilterValue | undefined;
  onChange: (value: AdminFilterValue | null) => void;
}> = ({ def, value, onChange }) => {
  const [anchor_el, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [is_open, setIsOpen] = useState(false);
  const is_active = isFilterValueActive(value);
  const summary = describeFilterValue(def, value);

  return (
    <>
      <button
        type="button"
        ref={setAnchorEl}
        onClick={() => setIsOpen((current) => !current)}
        className={`flex h-8 max-w-[260px] items-center gap-1.5 rounded-[4px] border px-2.5 text-[13px] transition-colors ${
          is_active
            ? "border-[var(--admin-accent)] bg-[var(--admin-selected)] text-shell-text"
            : "border-[var(--admin-border)] bg-transparent text-shell-text hover:bg-[var(--admin-hover)]"
        }`}
      >
        <span className="min-w-0 truncate">
          {def.label}
          {summary ? <span className="font-semibold">: {summary}</span> : null}
        </span>
        <svg width="9" height="9" viewBox="0 0 12 12" className="flex-none opacity-70">
          <path d="M3 4.5 L6 7.5 L9 4.5" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={() => setIsOpen(false)} align="start" width={POPOVER_WIDTH}>
        <div className="p-2">
          <div className="mb-1.5 flex items-center justify-between px-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-shell-text-faint">{def.label}</span>
            {is_active ? (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-[11.5px] font-semibold text-shell-text-muted hover:text-shell-text"
              >
                Clear
              </button>
            ) : null}
          </div>
          <AdminFilterEditor def={def} value={value} onChange={(next) => onChange(isFilterValueActive(next) ? next : null)} />
        </div>
      </BoardPopover>
    </>
  );
};

/**
 * Row of per column filter buttons for an Administration table, monday style: each button
 * opens the editor that fits its column (checkbox list, date presets, number range, text),
 * and turns highlighted with a short summary of its value once active.
 */
const AdminFilterBar: React.FC<AdminFilterBarProps> = ({ defs, state, onChange, onClearAll, className = "" }) => {
  const active_count = countActiveFilters(state);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {defs.map((def) => (
        <FilterButton key={def.key} def={def} value={state[def.key]} onChange={(value) => onChange(def.key, value)} />
      ))}
      {active_count > 0 ? (
        <button
          type="button"
          onClick={onClearAll}
          className="px-1.5 text-[12.5px] font-semibold text-shell-text-muted transition-colors hover:text-shell-text"
        >
          Clear all ({active_count})
        </button>
      ) : null}
    </div>
  );
};

export default AdminFilterBar;
