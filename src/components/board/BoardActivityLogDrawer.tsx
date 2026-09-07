"use client";
import React, { useEffect, useState } from "react";
import SlideOverPanel from "./drawer/SlideOverPanel";
import { CloseIcon } from "@/icons/board-icons";
import { ActivityLogIcon } from "@/icons/board-options-icons";
import { boardOptionsService } from "@/services/board-options.service";
import type { BoardActivityLogEntry } from "@/types/board-options";

export type BoardActivityLogDrawerProps = {
  board_id: number;
  is_open: boolean;
  onClose: () => void;
};

const getInitials = (full_name: string): string =>
  full_name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

/**
 * Board options menu's "Activity log" — a board-level timeline (rename,
 * duplicate, archive, delete, items archived/restored/deleted, ...). Mirrors
 * `BoardDiscussionDrawer`'s slide-over shell; fetches lazily on first open
 * rather than whenever the board loads, since most sessions never open it.
 */
const BoardActivityLogDrawer: React.FC<BoardActivityLogDrawerProps> = ({ board_id, is_open, onClose }) => {
  const [entries, setEntries] = useState<BoardActivityLogEntry[] | null>(null);
  const [has_error, setHasError] = useState(false);

  useEffect(() => {
    if (!is_open) return;
    let cancelled = false;
    setHasError(false);
    boardOptionsService
      .getActivityLog(board_id)
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [is_open, board_id]);

  return (
    <SlideOverPanel
      is_open={is_open}
      onClose={onClose}
      panel_class_name="w-[440px] max-w-[94vw] border-l border-shell-border-strong bg-shell-panel text-shell-text shadow-[-24px_0_60px_rgba(0,0,0,0.5)]"
    >
      <div className="flex flex-none items-center justify-between gap-3 border-b border-shell-border px-[22px] pb-4 pt-5">
        <h2 className="m-0 flex items-center gap-2.5 text-[20px] font-extrabold leading-[1.2] tracking-[-0.01em]">
          <ActivityLogIcon size={17} className="text-shell-text-muted" />
          Activity log
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close activity log"
          className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg text-shell-text-muted hover:bg-shell-hover hover:text-shell-text"
        >
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="shell-scrollbar min-h-0 flex-1 overflow-auto px-5 py-4">
        {has_error && (
          <p className="px-2 py-6 text-center text-[13px] text-shell-text-faint">
            We couldn&apos;t load the activity log. Please try again.
          </p>
        )}
        {!has_error && entries === null && (
          <p className="px-2 py-6 text-center text-[13px] text-shell-text-faint">Loading…</p>
        )}
        {!has_error && entries?.length === 0 && (
          <p className="px-2 py-6 text-center text-[13px] text-shell-text-faint">No activity recorded yet.</p>
        )}
        {entries?.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 rounded-lg px-2 py-3 hover:bg-shell-hover">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[linear-gradient(135deg,#E5623E,#8A2018)] text-[10.5px] font-bold text-white">
              {entry.user ? getInitials(entry.user.full_name) : "—"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] leading-snug text-shell-text">
                <span className="font-semibold">{entry.user?.full_name ?? "Someone"}</span>{" "}
                {entry.description.charAt(0).toLowerCase() + entry.description.slice(1)}
              </p>
              <p className="mt-0.5 text-[11.5px] text-shell-text-faint">{formatTimestamp(entry.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </SlideOverPanel>
  );
};

export default BoardActivityLogDrawer;
