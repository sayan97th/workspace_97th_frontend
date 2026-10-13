"use client";
import React, { useEffect, useState } from "react";
import { mapAuthorToPerson } from "./drawer/commentMapping";
import BoardDrawerHeader from "./drawer/BoardDrawerHeader";
import SlideOverPanel from "./drawer/SlideOverPanel";
import PersonAvatar from "./PersonAvatar";
import { ActivityLogIcon } from "@/icons/board-options-icons";
import { getDeactivatedClass } from "@/lib/deactivated-user";
import { boardOptionsService } from "@/services/board-options.service";
import type { BoardActivityLogEntry } from "@/types/board-options";

export type BoardActivityLogDrawerProps = {
  board_id: number;
  is_open: boolean;
  onClose: () => void;
};

const UNKNOWN_ACTOR = { id: "0", name: "Someone", initials: "?", avatar_seed: 0 };

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
      aria_label="Activity log"
      panel_class_name="w-[min(480px,100vw)]"
    >
      <BoardDrawerHeader
        title={
          <span className="flex items-center gap-2.5">
            <ActivityLogIcon size={18} className="text-[var(--bd-text-secondary)]" />
            Activity log
          </span>
        }
        onClose={onClose}
        close_label="Close activity log"
        is_bordered
      />

      <div className="shell-scrollbar board-drawer__scroll !pt-3">
        {has_error && (
          <div role="alert" className="board-drawer__error">
            We couldn&apos;t load the activity log. Please try again.
          </div>
        )}
        {!has_error && entries === null && <div className="board-drawer__status-text">Loading...</div>}
        {!has_error && entries?.length === 0 && (
          <div className="board-drawer__empty">
            <span className="board-drawer__empty-icon">
              <ActivityLogIcon size={24} />
            </span>
            <h3 className="board-drawer__empty-title">No activity recorded yet</h3>
            <p className="board-drawer__empty-text">Renames, archives, restores and other board changes will show up here.</p>
          </div>
        )}
        {entries?.map((entry) => (
          <div key={entry.id} className="board-drawer__log-row">
            <PersonAvatar person={entry.user ? mapAuthorToPerson(entry.user) : UNKNOWN_ACTOR} size={32} />
            <div className="min-w-0 flex-1">
              <p className="board-drawer__log-text">
                <span className={`font-semibold ${getDeactivatedClass(entry.user?.is_deactivated)}`}>{entry.user?.full_name ?? "Someone"}</span>{" "}
                {entry.description.charAt(0).toLowerCase() + entry.description.slice(1)}
              </p>
              <p className="board-drawer__log-time">{formatTimestamp(entry.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </SlideOverPanel>
  );
};

export default BoardActivityLogDrawer;
