"use client";
import React, { useEffect } from "react";
import SearchField from "@/components/common/SearchField";
import { ARCHIVE_ENTRIES, TRASH_ENTRIES } from "@/data/trash-data";
import { TEAMS_ROSTER } from "@/data/teams-data";
import { ArchiveIcon, CloseIcon, DeleteIcon } from "@/icons/workspace-icons";
import { RestoreIcon } from "@/icons/trash-icons";
import TrashFilterPopover from "./TrashFilterPopover";
import TrashTable from "./TrashTable";
import type { TrashEntry, TrashTabId } from "./types";
import { useTrashManager } from "./useTrashManager";

export type TrashModalProps = {
  is_open: boolean;
  onClose: () => void;
  /** Seed rows for the Trash tab. Defaults to the account's deleted-items log. */
  trash_entries?: TrashEntry[];
  /** Seed rows for the Archive tab. Defaults to the account's archived-items log. */
  archive_entries?: TrashEntry[];
  /** Tab selected each time the dialog opens. Defaults to "trash". */
  initial_tab?: TrashTabId;
};

const TAB_COPY: Record<"trash" | "archive", { title: string; description: string }> = {
  trash: {
    title: "Trash",
    description:
      "This is your account trash for deleted workspaces, boards, docs, items and columns. After 30 days from the deletion date it will be deleted permanently and will no longer be accessible.",
  },
  archive: {
    title: "Archive",
    description:
      "Archived items are hidden from your workspaces but not deleted. Restore an item to bring it back, or delete it permanently from here.",
  },
};

const tabButtonClass = (is_active: boolean) =>
  `flex items-center gap-[7px] rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
    is_active ? "bg-white/[0.09] text-[#f2f5f5]" : "text-[#8a9495] hover:text-[#c7d0d0]"
  }`;

/**
 * Account-wide "Trash" browser opened from {@link AccountMenu}'s Trash entry: Trash/Archive
 * tabs, a search + type-filter row, a bulk-action bar once rows are selected, and the
 * shared {@link TrashTable}. Composes {@link useTrashManager} the same way `TeamsModal`
 * composes `useTeamsManager`, so any future "deleted items" surface (e.g. a per-board
 * trash) can reuse the same table/menu/filter pieces instead of this whole dialog.
 */
const TrashModal: React.FC<TrashModalProps> = ({
  is_open,
  onClose,
  trash_entries = TRASH_ENTRIES,
  archive_entries = ARCHIVE_ENTRIES,
  initial_tab = "trash",
}) => {
  const trash = useTrashManager({ trash_entries, archive_entries, members: TEAMS_ROSTER });
  const copy = TAB_COPY[trash.active_tab];
  const selected_count = trash.selected_ids.length;
  const { setActiveTab } = trash;

  // The dialog stays mounted (rendering null while closed), so re-sync the active
  // tab to whichever entry point opened it every time it becomes visible.
  useEffect(() => {
    if (is_open) setActiveTab(initial_tab);
  }, [is_open, initial_tab, setActiveTab]);

  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previous_overflow;
    };
  }, [is_open, onClose]);

  if (!is_open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Trash" className="fixed inset-0 z-[300] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[#060e0e]/[0.62]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[301] flex h-[760px] max-h-[92vh] w-[1180px] max-w-full flex-col overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#132424] text-[#e9eded] shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <div className="flex flex-none items-center justify-between border-b border-white/[0.07] px-[26px] pt-[18px] pb-[14px]">
          <div className="flex items-center gap-1 rounded-xl bg-black/[0.18] p-1">
            <button type="button" onClick={() => trash.setActiveTab("trash")} className={tabButtonClass(trash.active_tab === "trash")}>
              <DeleteIcon size={14} />
              Trash
            </button>
            <button
              type="button"
              onClick={() => trash.setActiveTab("archive")}
              className={tabButtonClass(trash.active_tab === "archive")}
            >
              <ArchiveIcon size={14} />
              Archive
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg text-[#9aa4a5] transition-colors hover:bg-white/[0.08]"
          >
            <CloseIcon size={15} />
          </button>
        </div>

        <div className="flex-none px-[26px] pt-5">
          <h2 className="text-[22px] font-extrabold tracking-[-0.01em]">{copy.title}</h2>
          <p className="mt-[6px] max-w-[760px] text-[13px] leading-relaxed text-[#8a9495]">{copy.description}</p>
        </div>

        <div className="flex flex-none items-center gap-2.5 px-[26px] pt-4">
          <SearchField value={trash.query} onChange={trash.setQuery} placeholder="Search" className="max-w-[280px]" />
          <TrashFilterPopover
            available_types={trash.available_types}
            active_type_filters={trash.active_type_filters}
            onToggleType={trash.toggleTypeFilter}
            onClear={trash.clearTypeFilters}
          />

          {selected_count > 0 ? (
            <div className="ml-auto flex items-center gap-2.5">
              <span className="text-[12.5px] font-medium text-[#8a9495]">
                {selected_count} selected
              </span>
              <button
                type="button"
                onClick={trash.restoreSelected}
                className="flex items-center gap-[7px] rounded-[9px] border border-white/10 px-3 py-1.5 text-[13px] font-medium text-[#c7d0d0] transition-colors hover:bg-white/[0.06]"
              >
                <RestoreIcon size={14} />
                Restore
              </button>
              <button
                type="button"
                onClick={trash.deleteSelectedForever}
                className="flex items-center gap-[7px] rounded-[9px] border border-error-500/40 px-3 py-1.5 text-[13px] font-medium text-error-400 transition-colors hover:bg-error-500/[0.12]"
              >
                <DeleteIcon size={14} />
                Delete permanently
              </button>
            </div>
          ) : null}
        </div>

        <div className="shell-scrollbar min-h-0 flex-1 overflow-y-auto px-[26px] pb-6 pt-4">
          <TrashTable trash={trash} />
        </div>
      </div>
    </div>
  );
};

export default TrashModal;
