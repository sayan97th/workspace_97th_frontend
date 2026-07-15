import React from "react";
import { PersonAvatar, ToolbarCheckbox } from "@/components/board";
import { ChevronRightIcon } from "@/icons/workspace-icons";
import TrashRowMenu from "./TrashRowMenu";
import TrashTypeBadge from "./TrashTypeBadge";
import type { TrashManagerApi } from "./useTrashManager";

export type TrashTableProps = {
  trash: TrashManagerApi;
  empty_label?: string;
};

/**
 * Name / Type / Deleted from / Deleted by / Date table body shared by the Trash and
 * Archive tabs of {@link TrashModal} — both tabs render the same `TrashEntry[]` shape
 * through {@link useTrashManager}, so one table serves either without a fork.
 */
const TrashTable: React.FC<TrashTableProps> = ({ trash, empty_label = "Nothing here matches your search." }) => (
  <div>
    <div className="flex items-center gap-3 px-[10px] py-2 text-[11.5px] font-semibold tracking-[0.04em] text-shell-text-faint">
      <button
        type="button"
        onClick={trash.toggleSelectAll}
        aria-label="Select all rows"
        className="flex flex-none items-center"
      >
        <ToolbarCheckbox state={trash.select_all_state} size={15} />
      </button>
      <span className="min-w-0 flex-1">Name</span>
      <span className="w-[110px] flex-none">Type</span>
      <span className="w-[220px] flex-none">Deleted from</span>
      <span className="w-[170px] flex-none">Deleted by</span>
      <span className="w-[100px] flex-none">Date</span>
      <span className="w-[26px] flex-none" aria-hidden="true" />
    </div>

    {trash.visible_entries.map((entry) => {
      const deleted_by = trash.getDeletedBy(entry);
      return (
        <div
          key={entry.id}
          className="group flex items-center gap-3 rounded-[9px] px-[10px] py-[9px] transition-colors hover:bg-shell-hover"
        >
          <button
            type="button"
            onClick={() => trash.toggleSelect(entry.id)}
            aria-label={`Select ${entry.name}`}
            className="flex flex-none items-center"
          >
            <ToolbarCheckbox state={trash.isSelected(entry.id) ? "checked" : "unchecked"} size={15} />
          </button>

          <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-shell-text">{entry.name}</span>

          <span className="w-[110px] flex-none">
            <TrashTypeBadge type={entry.type} />
          </span>

          <span className="flex w-[220px] min-w-0 flex-none items-center gap-1 truncate text-[12.5px] text-shell-text-muted">
            {entry.deleted_from.map((segment, index) => (
              <React.Fragment key={`${entry.id}-crumb-${index}`}>
                {index > 0 ? (
                  <span className="flex-none text-shell-text-faint">
                    <ChevronRightIcon size={9} />
                  </span>
                ) : null}
                <span className="truncate">{segment}</span>
              </React.Fragment>
            ))}
          </span>

          <span className="flex w-[170px] min-w-0 flex-none items-center gap-[7px]">
            {deleted_by ? (
              <>
                <PersonAvatar person={deleted_by} size={20} />
                <span className="truncate text-[12.5px] text-shell-text-secondary">{deleted_by.name}</span>
              </>
            ) : (
              <span className="text-[12.5px] text-shell-text-faint">—</span>
            )}
          </span>

          <span className="w-[100px] flex-none truncate text-[12.5px] text-shell-text-muted">{entry.deleted_label}</span>

          <span className="w-[26px] flex-none opacity-0 transition-opacity group-hover:opacity-100 has-[[aria-expanded=true]]:opacity-100">
            <TrashRowMenu
              entry_name={entry.name}
              onRestore={() => trash.restoreEntry(entry.id)}
              onDeleteForever={() => trash.deleteEntryForever(entry.id)}
            />
          </span>
        </div>
      );
    })}

    {trash.visible_entries.length === 0 ? (
      <div className="px-[10px] py-12 text-center text-[13px] text-shell-text-faint">{empty_label}</div>
    ) : null}
  </div>
);

export default TrashTable;
