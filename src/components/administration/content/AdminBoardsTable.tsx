"use client";
import React, { useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { PersonAvatar } from "@/components/board";
import { Pagination } from "@/components/content";
import SearchField from "@/components/common/SearchField";
import { toPersonOption } from "../adminUserMapping";
import {
  AdminBulkActionBar,
  AdminBulkMenuButton,
  AdminCheckbox,
  AdminFilterBar,
  AdminSortableHeader,
  bulkActionButtonClass,
  bulkDangerButtonClass,
} from "../filters";
import { CONTENT_PER_PAGE, type ContentDirectoryManagerApi } from "../useContentDirectoryManager";
import type { AdminBoardType, AdminContentSortField } from "@/types/administration/content-directory";

export type AdminBoardsTableProps = {
  content: ContentDirectoryManagerApi;
  /** Extra controls rendered before the search box, e.g. Tidy up's inactivity picker. */
  toolbar_start?: React.ReactNode;
  /** Asks for confirmation before archiving the selection. */
  onRequestArchive: () => void;
  empty_message: string;
};

const GRID =
  "grid grid-cols-[34px_minmax(220px,1.6fr)_minmax(140px,1fr)_minmax(160px,1fr)_100px_80px_110px_130px] gap-3";

const BOARD_TYPE_LABELS: Record<AdminBoardType, string> = {
  main: "Main",
  private: "Private",
  shareable: "Shareable",
};

const personInitials = (full_name: string): string =>
  full_name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/**
 * Account wide boards table shared by Content directory and Tidy up: per column filters,
 * sortable headers, row selection and the bulk archive, restore, reassign and export bar.
 */
const AdminBoardsTable: React.FC<AdminBoardsTableProps> = ({ content, toolbar_start, onRequestArchive, empty_message }) => {
  const page_ids = content.rows.map((row) => row.id);
  const page_selection = content.selection.pageSelectionState(page_ids);
  const selected_rows = content.rows.filter((row) => content.selection.isSelected(row.id));
  const has_archived_selected = selected_rows.some((row) => row.is_archived);

  const owner_options = useMemo(
    () =>
      content.owner_candidates.map((user) => ({ id: String(user.id), label: user.full_name, person: toPersonOption(user) })),
    [content.owner_candidates]
  );

  const headerSort = (label: string, field: AdminContentSortField) => (
    <AdminSortableHeader
      label={label}
      field={field}
      sort_field={content.sort_field}
      sort_direction={content.sort_direction}
      onSort={content.toggleSort}
    />
  );

  return (
    <div>
      {content.error ? (
        <div className="mb-3.5 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.1] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-200">
          {content.error}
        </div>
      ) : null}
      {content.notice ? (
        <div className="mb-3.5 rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-3.5 py-2.5 text-[12.5px] font-medium text-[#8fe3b8]">
          {content.notice}
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        {toolbar_start}
        <SearchField value={content.query} onChange={content.setQuery} placeholder="Search boards" className="w-[260px]" />
        <button
          type="button"
          onClick={() => void content.exportBoards(false)}
          disabled={content.is_exporting}
          className="ml-auto rounded-lg border border-shell-border-strong bg-shell-panel-alt px-3.5 py-[8px] text-[13px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover disabled:opacity-50"
        >
          {content.is_exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      <AdminFilterBar
        defs={content.filter_defs}
        state={content.filters.filter_state}
        onChange={content.filters.setFilter}
        onClearAll={content.filters.clearFilters}
        className="mb-3.5"
      />

      <div className="mb-2.5 text-[12.5px] text-shell-text-faint">
        {content.total === 1 ? "1 board" : `${content.total.toLocaleString()} boards`}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[960px]">
          <div className={`${GRID} items-center px-2.5 pb-2.5 text-[11px] font-bold uppercase tracking-[0.03em] text-shell-text-faint`}>
            <button
              type="button"
              onClick={() => content.selection.togglePage(page_ids)}
              aria-label="Select all boards on this page"
              className="flex items-center"
            >
              <AdminCheckbox is_checked={page_selection === "all"} is_indeterminate={page_selection === "some"} />
            </button>
            {headerSort("Board", "label")}
            {headerSort("Workspace", "workspace")}
            {headerSort("Owner", "owner")}
            <span>Privacy</span>
            {headerSort("Items", "items_count")}
            {headerSort("Created", "created_at")}
            {headerSort("Last activity", "last_activity_at")}
          </div>
          <div className="h-px bg-shell-hover" />

          {content.is_loading ? (
            <div className="px-2.5 py-8 text-center text-[13px] text-shell-text-faint">Loading boards…</div>
          ) : content.rows.length === 0 ? (
            <div className="px-2.5 py-10 text-center text-[13px] text-shell-text-faint">{empty_message}</div>
          ) : (
            content.rows.map((row) => {
              const is_selected = content.selection.isSelected(row.id);
              return (
                <div
                  key={row.id}
                  className={`${GRID} items-center border-b border-shell-border px-2.5 py-[10px] text-[12.5px] ${
                    is_selected ? "bg-brand-500/[0.06]" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => content.selection.toggle(row.id)}
                    aria-label={`Select ${row.label}`}
                    className="flex items-center"
                  >
                    <AdminCheckbox is_checked={is_selected} />
                  </button>
                  <span className="flex min-w-0 items-center gap-2">
                    <a href={`/boards/${row.id}`} className="truncate text-[13.5px] font-semibold text-shell-text hover:underline">
                      {row.label}
                    </a>
                    {row.is_archived ? (
                      <span className="flex-none rounded-md bg-shell-hover-strong px-1.5 py-px text-[10.5px] font-bold uppercase text-shell-text-muted">
                        Archived
                      </span>
                    ) : null}
                  </span>
                  <span className="truncate text-shell-text-muted">{row.workspace?.name ?? "None"}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    {row.owner ? (
                      <>
                        <PersonAvatar
                          person={{
                            id: String(row.owner.id),
                            name: row.owner.full_name,
                            initials: personInitials(row.owner.full_name),
                            avatar_seed: row.owner.id,
                            avatar_url: row.owner.profile_photo_url ?? undefined,
                            is_deactivated: row.owner.is_deactivated,
                          }}
                          size={22}
                        />
                        <span className="truncate text-shell-text-secondary">{row.owner.full_name}</span>
                      </>
                    ) : (
                      <span className="text-shell-text-faint">No owner</span>
                    )}
                  </span>
                  <span className="text-shell-text-muted">{BOARD_TYPE_LABELS[row.board_type] ?? row.board_type}</span>
                  <span className="text-shell-text-secondary">{row.items_count.toLocaleString()}</span>
                  <span className="text-shell-text-muted">{format(new Date(row.created_at), "MMM d, yyyy")}</span>
                  <span
                    className="truncate text-shell-text-muted"
                    title={row.last_activity_at ? format(new Date(row.last_activity_at), "MMM d, yyyy p") : undefined}
                  >
                    {row.last_activity_at ? formatDistanceToNow(new Date(row.last_activity_at), { addSuffix: true }) : "Never"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Pagination
        current_page={content.page}
        last_page={content.last_page}
        total={content.total}
        per_page={CONTENT_PER_PAGE}
        onPageChange={content.setPage}
      />

      <AdminBulkActionBar selected_count={content.selection.selected_ids.length} noun="board" onClear={content.selection.clear}>
        <AdminBulkMenuButton
          label="Reassign owner"
          title="New owner"
          options={owner_options}
          is_disabled={content.is_running_bulk_action || owner_options.length === 0}
          onSelect={(id) => void content.reassignSelected(Number(id))}
        />
        <button
          type="button"
          disabled={content.is_exporting}
          onClick={() => void content.exportBoards(true)}
          className={bulkActionButtonClass}
        >
          Export
        </button>
        {has_archived_selected ? (
          <button
            type="button"
            disabled={content.is_running_bulk_action}
            onClick={() => void content.restoreSelected()}
            className={bulkActionButtonClass}
          >
            Restore
          </button>
        ) : null}
        <button type="button" disabled={content.is_running_bulk_action} onClick={onRequestArchive} className={bulkDangerButtonClass}>
          Archive
        </button>
      </AdminBulkActionBar>
    </div>
  );
};

export default AdminBoardsTable;
