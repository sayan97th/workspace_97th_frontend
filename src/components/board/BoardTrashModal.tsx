"use client";
import React, { useEffect, useState } from "react";
import { ArchiveIcon, CloseIcon, DeleteIcon } from "@/icons/workspace-icons";
import { RestoreIcon } from "@/icons/trash-icons";
import { boardOptionsService } from "@/services/board-options.service";
import type { BoardTrashEntry, BoardTrashIndex } from "@/types/board-options";

export type BoardTrashModalProps = {
  board_id: number;
  is_open: boolean;
  onClose: () => void;
};

type TabId = "archived" | "trashed";

const TAB_COPY: Record<TabId, { label: string; icon: React.ReactNode; empty: string; description: string }> = {
  archived: {
    label: "Archive",
    icon: <ArchiveIcon size={14} />,
    empty: "No archived items on this board.",
    description: "Items archived from the selection action bar. Restore one to bring it back onto the board.",
  },
  trashed: {
    label: "Trash",
    icon: <DeleteIcon size={14} />,
    empty: "No deleted items on this board.",
    description: "Items deleted from this board. Restore one, or delete it forever.",
  },
};

const tabButtonClass = (is_active: boolean) =>
  `flex items-center gap-[7px] rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
    is_active ? "bg-shell-hover-strong text-shell-text" : "text-shell-text-muted hover:text-shell-text-secondary"
  }`;

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/**
 * Board options menu's "View archive / trash" — this single board's own
 * archived and deleted items, with restore / delete-forever actions. Scoped
 * to one board (see `BoardTrashController`), as opposed to the account-wide
 * Trash dialog opened from the top bar (`@/components/trash`).
 */
const BoardTrashModal: React.FC<BoardTrashModalProps> = ({ board_id, is_open, onClose }) => {
  const [active_tab, setActiveTab] = useState<TabId>("trashed");
  const [index, setIndex] = useState<BoardTrashIndex | null>(null);
  const [busy_id, setBusyId] = useState<string | null>(null);
  const [has_error, setHasError] = useState(false);

  const load = () => {
    setHasError(false);
    boardOptionsService
      .getTrash(board_id)
      .then(setIndex)
      .catch(() => setHasError(true));
  };

  useEffect(() => {
    if (!is_open) return;
    setActiveTab("trashed");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is_open, board_id]);

  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, onClose]);

  if (!is_open) return null;

  const entries: BoardTrashEntry[] = active_tab === "archived" ? (index?.archived ?? []) : (index?.trashed ?? []);
  const copy = TAB_COPY[active_tab];

  const handleRestore = async (entry: BoardTrashEntry) => {
    setBusyId(entry.id);
    try {
      await boardOptionsService.restoreTrashItem(board_id, entry.id);
      load();
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteForever = async (entry: BoardTrashEntry) => {
    setBusyId(entry.id);
    try {
      await boardOptionsService.deleteTrashItemForever(board_id, entry.id);
      load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Archive and trash" className="fixed inset-0 z-[300] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[#060e0e]/[0.62]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[301] flex h-[620px] max-h-[92vh] w-[760px] max-w-full flex-col overflow-hidden rounded-[18px] border border-shell-border-strong bg-shell-panel text-shell-text shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <div className="flex flex-none items-center justify-between border-b border-shell-border px-[26px] pt-[18px] pb-[14px]">
          <div className="flex items-center gap-1 rounded-xl bg-shell-hover p-1">
            <button type="button" onClick={() => setActiveTab("trashed")} className={tabButtonClass(active_tab === "trashed")}>
              {TAB_COPY.trashed.icon}
              Trash
            </button>
            <button type="button" onClick={() => setActiveTab("archived")} className={tabButtonClass(active_tab === "archived")}>
              {TAB_COPY.archived.icon}
              Archive
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover"
          >
            <CloseIcon size={15} />
          </button>
        </div>

        <div className="flex-none px-[26px] pt-5">
          <h2 className="text-[20px] font-extrabold tracking-[-0.01em]">{copy.label}</h2>
          <p className="mt-[6px] max-w-[600px] text-[13px] leading-relaxed text-shell-text-muted">{copy.description}</p>
        </div>

        <div className="shell-scrollbar min-h-0 flex-1 overflow-y-auto px-[26px] pb-6 pt-4">
          {has_error && <p className="py-10 text-center text-[13px] text-shell-text-faint">We couldn&apos;t load this list. Please try again.</p>}
          {!has_error && index === null && <p className="py-10 text-center text-[13px] text-shell-text-faint">Loading…</p>}
          {!has_error && index !== null && entries.length === 0 && (
            <p className="py-10 text-center text-[13px] text-shell-text-faint">{copy.empty}</p>
          )}
          {entries.length > 0 && (
            <div className="flex flex-col">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 rounded-[10px] px-2 py-2.5 hover:bg-shell-hover">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-shell-text">{entry.name}</p>
                    <p className="truncate text-[12px] text-shell-text-muted">
                      {entry.group_name} · {formatTimestamp(entry.timestamp)}
                      {entry.created_by ? ` · Created by ${entry.created_by.full_name}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestore(entry)}
                    disabled={busy_id === entry.id}
                    className="flex flex-none items-center gap-[6px] rounded-[9px] border border-shell-border-strong px-3 py-1.5 text-[12.5px] font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover-strong disabled:opacity-50"
                  >
                    <RestoreIcon size={13} />
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteForever(entry)}
                    disabled={busy_id === entry.id}
                    className="flex flex-none items-center gap-[6px] rounded-[9px] border border-error-500/40 px-3 py-1.5 text-[12.5px] font-medium text-error-400 transition-colors hover:bg-error-500/[0.12] disabled:opacity-50"
                  >
                    <DeleteIcon size={13} />
                    Delete forever
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoardTrashModal;
