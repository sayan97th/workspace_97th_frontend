"use client";
import React, { useRef, useState } from "react";
import AnchoredMenu from "@/components/ui/dropdown/AnchoredMenu";
import type { MenuListItem } from "@/components/ui/dropdown/MenuItemList";
import { CheckIcon, CloseIcon, GridViewToggleIcon, ListViewToggleIcon, SortAscendingIcon, SortDescendingIcon, SortIcon } from "@/icons/board-icons";
import { PlusIcon, SearchIcon } from "@/icons/workspace-icons";
import type { FileGallerySortBy, FileGallerySortDir, FileGalleryViewMode } from "./types";

const SORT_OPTIONS: Array<{ id: FileGallerySortBy; label: string }> = [
  { id: "date", label: "Upload date" },
  { id: "name", label: "Name" },
  { id: "size", label: "Size" },
  { id: "type", label: "Type" },
];

export type FileGalleryToolbarProps = {
  file_count: number;
  search_query: string;
  onSearchChange: (value: string) => void;
  sort_by: FileGallerySortBy;
  sort_dir: FileGallerySortDir;
  onChangeSortBy: (sort_by: FileGallerySortBy) => void;
  onToggleSortDir: () => void;
  view_mode: FileGalleryViewMode;
  onChangeViewMode: (mode: FileGalleryViewMode) => void;
  onAddFilesClick: () => void;
  is_uploading: boolean;
};

/**
 * The Files Gallery's own toolbar — a search box, a sort picker + direction
 * toggle, a grid/list display switch, and the "Add files" action. Kept
 * separate from the generic `BoardToolbar` (filters/group-by/columns) since
 * a file gallery has neither columns nor groups to control.
 */
const FileGalleryToolbar: React.FC<FileGalleryToolbarProps> = ({
  file_count,
  search_query,
  onSearchChange,
  sort_by,
  sort_dir,
  onChangeSortBy,
  onToggleSortDir,
  view_mode,
  onChangeViewMode,
  onAddFilesClick,
  is_uploading,
}) => {
  const [is_sort_menu_open, setIsSortMenuOpen] = useState(false);
  const [is_search_open, setIsSearchOpen] = useState(false);
  const sort_button_ref = useRef<HTMLButtonElement>(null);
  const active_sort_label = SORT_OPTIONS.find((option) => option.id === sort_by)?.label ?? "Sort";

  const sort_menu_items: MenuListItem[] = SORT_OPTIONS.map((option) => ({
    key: option.id,
    label: option.label,
    icon: <CheckIcon size={11} className={sort_by === option.id ? "opacity-100" : "opacity-0"} />,
    onClick: () => onChangeSortBy(option.id),
  }));

  return (
    <div className="flex items-center gap-2">
      <span className="text-[13px] font-semibold text-shell-text-secondary">
        {file_count} {file_count === 1 ? "file" : "files"}
      </span>

      <div className="flex-1" />

      {is_search_open ? (
        <div className="flex h-[32px] w-[220px] flex-none items-center gap-2 rounded-lg border border-shell-border bg-shell-hover px-2.5">
          <span className="flex flex-none text-shell-text-muted">
            <SearchIcon size={13} />
          </span>
          <input
            autoFocus
            type="text"
            value={search_query}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                onSearchChange("");
                setIsSearchOpen(false);
              }
            }}
            placeholder="Search files..."
            className="min-w-0 flex-1 bg-transparent text-[13px] text-shell-text placeholder:text-shell-text-muted focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              onSearchChange("");
              setIsSearchOpen(false);
            }}
            className="flex h-5 w-5 flex-none items-center justify-center rounded text-shell-text-muted hover:bg-shell-hover-strong"
            aria-label="Close search"
          >
            <CloseIcon size={11} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="flex h-[32px] flex-none items-center gap-1.5 rounded-lg border border-shell-border px-2.5 text-[12.5px] font-medium text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
        >
          <SearchIcon size={13} />
          Search
        </button>
      )}

      <button
        ref={sort_button_ref}
        type="button"
        onClick={() => setIsSortMenuOpen(true)}
        className="flex h-[32px] flex-none items-center gap-1.5 rounded-lg border border-shell-border px-2.5 text-[12.5px] font-medium text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
      >
        <SortIcon size={13} />
        {active_sort_label}
      </button>
      <button
        type="button"
        onClick={onToggleSortDir}
        aria-label={sort_dir === "asc" ? "Sort ascending" : "Sort descending"}
        title={sort_dir === "asc" ? "Ascending" : "Descending"}
        className="flex h-[32px] w-[32px] flex-none items-center justify-center rounded-lg border border-shell-border text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
      >
        {sort_dir === "asc" ? <SortAscendingIcon size={14} /> : <SortDescendingIcon size={14} />}
      </button>

      <AnchoredMenu
        anchor_el={sort_button_ref.current}
        is_open={is_sort_menu_open}
        onClose={() => setIsSortMenuOpen(false)}
        title="Sort by"
        items={sort_menu_items}
        width={180}
      />

      <div className="flex flex-none items-center overflow-hidden rounded-lg border border-shell-border">
        <button
          type="button"
          onClick={() => onChangeViewMode("grid")}
          aria-label="Grid view"
          aria-pressed={view_mode === "grid"}
          className={`flex h-[32px] w-[32px] items-center justify-center transition-colors ${
            view_mode === "grid" ? "bg-shell-hover-strong text-shell-text" : "text-shell-text-muted hover:bg-shell-hover"
          }`}
        >
          <GridViewToggleIcon size={14} />
        </button>
        <button
          type="button"
          onClick={() => onChangeViewMode("list")}
          aria-label="List view"
          aria-pressed={view_mode === "list"}
          className={`flex h-[32px] w-[32px] items-center justify-center border-l border-shell-border transition-colors ${
            view_mode === "list" ? "bg-shell-hover-strong text-shell-text" : "text-shell-text-muted hover:bg-shell-hover"
          }`}
        >
          <ListViewToggleIcon size={14} />
        </button>
      </div>

      <button
        type="button"
        onClick={onAddFilesClick}
        disabled={is_uploading}
        className="flex h-[32px] flex-none items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <PlusIcon size={12} />
        {is_uploading ? "Uploading…" : "Add files"}
      </button>
    </div>
  );
};

export default FileGalleryToolbar;
