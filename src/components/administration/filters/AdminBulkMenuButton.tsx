"use client";
import React, { useMemo, useState } from "react";
import { BoardPopover, PersonAvatar } from "@/components/board";
import { bulkActionButtonClass } from "./AdminBulkActionBar";
import type { AdminFilterOption } from "./adminFilterTypes";

export type AdminBulkMenuButtonProps = {
  label: string;
  options: AdminFilterOption[];
  onSelect: (id: string) => void;
  is_disabled?: boolean;
  /** Heading shown above the options, e.g. "Move to department". */
  title?: string;
};

const SEARCH_THRESHOLD = 8;

/**
 * Bulk action that needs a value first ("Move to department", "Change role", "Reassign
 * owner"): a button in {@link AdminBulkActionBar} that opens a pick one list, searchable
 * once it gets long.
 */
const AdminBulkMenuButton: React.FC<AdminBulkMenuButtonProps> = ({ label, options, onSelect, is_disabled = false, title }) => {
  const [anchor_el, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [is_open, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const visible_options = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options;
  }, [options, query]);

  return (
    <>
      <button
        type="button"
        ref={setAnchorEl}
        disabled={is_disabled}
        onClick={() => {
          setQuery("");
          setIsOpen((current) => !current);
        }}
        className={bulkActionButtonClass}
      >
        {label}
        <svg width="9" height="9" viewBox="0 0 12 12" className="opacity-70">
          <path d="M3 7.5 L6 4.5 L9 7.5" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={() => setIsOpen(false)} align="start" width={250}>
        <div className="p-1.5">
          {title ? (
            <div className="px-2 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-[0.04em] text-shell-text-faint">{title}</div>
          ) : null}
          {options.length > SEARCH_THRESHOLD ? (
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search…"
              className="mb-1 h-[32px] w-full rounded-lg border border-shell-border-strong bg-shell-panel-alt px-2.5 text-[12.5px] text-shell-text outline-none focus:border-brand-500"
            />
          ) : null}
          <div className="max-h-[240px] overflow-y-auto">
            {visible_options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onSelect(option.id);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-[7px] text-left text-[12.5px] font-medium text-shell-text-secondary hover:bg-shell-hover"
              >
                {option.person ? <PersonAvatar person={option.person} size={20} /> : null}
                <span className="truncate">{option.label}</span>
              </button>
            ))}
            {visible_options.length === 0 ? <div className="px-2 py-3 text-[12.5px] text-shell-text-faint">No matches</div> : null}
          </div>
        </div>
      </BoardPopover>
    </>
  );
};

export default AdminBulkMenuButton;
