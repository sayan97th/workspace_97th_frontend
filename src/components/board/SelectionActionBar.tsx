"use client";
import React, { useRef, useState } from "react";
import BoardPopover from "./toolbar/BoardPopover";
import { CloseIcon } from "@/icons/board-icons";

export type SelectionActionBarGroupOption = { id: string; label: string };

export type SelectionActionBarProps = {
  /** Count of currently-checked rows — the bar renders nothing once this drops to 0, so a caller can keep it mounted unconditionally. */
  selected_count: number;
  /** Target tables for "Move to" — omitted or empty hides that button instead of showing an empty menu. */
  groups: SelectionActionBarGroupOption[];
  /** Disables every action button while a bulk request is in flight, so a slow network can't queue up several overlapping mutations from repeated clicks. */
  is_busy?: boolean;
  onDuplicate: () => void;
  onMove: (group_id: string) => void;
  onArchive: () => void;
  onDelete: () => void;
  onClose: () => void;
};

const ACTION_BUTTON =
  "flex items-center gap-1.5 whitespace-nowrap rounded-[7px] px-3 py-2 text-[13px] font-medium text-white/90 transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-40";

/**
 * The board grid's "selection action bar" — Monday's floating bulk-action pill,
 * shown by `BoardShell`'s `selectionBar` slot once one or more rows are
 * checked. Purely presentational: every action id/group/callback comes from
 * the caller (`TableBoardView`), which owns the real `items`/`groups` state
 * and knows how to persist each action through `board-content.service.ts`.
 */
const SelectionActionBar: React.FC<SelectionActionBarProps> = ({
  selected_count,
  groups,
  is_busy = false,
  onDuplicate,
  onMove,
  onArchive,
  onDelete,
  onClose,
}) => {
  const move_button_ref = useRef<HTMLButtonElement>(null);
  const [is_move_open, setIsMoveOpen] = useState(false);

  if (selected_count === 0) return null;

  return (
    <div className="flex items-center gap-1 rounded-[10px] bg-[#323338] px-2 py-1.5 shadow-2xl shadow-black/50">
      <span className="px-2.5 text-[13px] font-semibold text-white">{selected_count} selected</span>
      <div className="h-5 w-px flex-none bg-white/15" />

      <button type="button" onClick={onDuplicate} disabled={is_busy} className={ACTION_BUTTON}>
        <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.3">
          <rect x="4.5" y="4.5" width="8" height="8" rx="1.3" />
          <path d="M1.5 9.3 V2.8 A1.3 1.3 0 0 1 2.8 1.5 H9.3" />
        </svg>
        Duplicate
      </button>

      {groups.length > 0 && (
        <>
          <button
            ref={move_button_ref}
            type="button"
            onClick={() => setIsMoveOpen((open) => !open)}
            disabled={is_busy}
            className={ACTION_BUTTON}
          >
            <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4 H8 M2 7 H10 M2 10 H6" />
              <path d="M9.3 9 L12 6.8 L9.3 4.6" />
            </svg>
            Move to
          </button>
          <BoardPopover anchor_el={move_button_ref.current} is_open={is_move_open} onClose={() => setIsMoveOpen(false)} align="start" width={220}>
            <div className="max-h-72 overflow-auto py-1.5">
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    setIsMoveOpen(false);
                    onMove(group.id);
                  }}
                  className="flex w-full items-center truncate px-3.5 py-2 text-left text-[13px] text-boardtree-text hover:bg-boardtree-hover"
                >
                  {group.label}
                </button>
              ))}
            </div>
          </BoardPopover>
        </>
      )}

      <button type="button" onClick={onArchive} disabled={is_busy} className={ACTION_BUTTON}>
        <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1.5" y="2" width="11" height="2.6" rx="0.6" />
          <path d="M2.4 4.6 V10.6 A1.3 1.3 0 0 0 3.7 11.9 H10.3 A1.3 1.3 0 0 0 11.6 10.6 V4.6" />
          <path d="M5.6 7.3 H8.4" />
        </svg>
        Archive
      </button>

      <button type="button" onClick={onDelete} disabled={is_busy} className={`${ACTION_BUTTON} hover:bg-[#e2445c]/20 hover:text-[#ff8ba0]`}>
        <svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.3 3.7 H11.7" />
          <path d="M5 3.7 V2.4 A0.8 0.8 0 0 1 5.8 1.6 H8.2 A0.8 0.8 0 0 1 9 2.4 V3.7" />
          <path d="M3.4 3.7 L4 11.3 A1 1 0 0 0 5 12.2 H9 A1 1 0 0 0 10 11.3 L10.6 3.7" />
        </svg>
        Delete
      </button>

      <div className="h-5 w-px flex-none bg-white/15" />
      <button
        type="button"
        onClick={onClose}
        title="Clear selection"
        className="flex h-7 w-7 flex-none items-center justify-center rounded-[6px] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <CloseIcon size={12} />
      </button>
    </div>
  );
};

export default SelectionActionBar;
