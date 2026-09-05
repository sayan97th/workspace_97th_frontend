"use client";

import { useRef } from "react";
import ColumnMenu from "../menus/ColumnMenu";
import ColumnResizeHandle from "./ColumnResizeHandle";
import EmojiInsertButton from "../../EmojiInsertButton";
import type { ColumnKind, StatusDef } from "../types";

interface ColumnHeaderCellProps {
  scoped_key: string;
  title: string;
  height: number;
  /** Undefined for the item-title/sub-title virtual columns — those get the reduced menu (rename + sort + collapse only). */
  column?: { id: string; kind: ColumnKind; width: number; options?: StatusDef[] };
  can_delete: boolean;
  sort_dir: "asc" | "desc" | null;
  is_group_by_eligible?: boolean;
  is_menu_open: boolean;
  is_hovered: boolean;
  /** Whether this cell's title is currently the one being inline-edited (click-to-rename). */
  is_editing: boolean;
  /** The in-progress title text while `is_editing` — owned by the caller (see `useBoardTable`'s `column_draft`). */
  draft: string;
  onEnter: () => void;
  onLeave: () => void;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onRename: (title: string) => void;
  /** Click on the title turns it into an editable input. */
  onStartRename: () => void;
  onDraftChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onSort: (dir: "asc" | "desc" | null) => void;
  onUpdateSettings?: (patch: { width?: number; hideable?: boolean; pinnable?: boolean }) => void;
  /** Local-only width preview fired on every pointer move of a resize drag — see `ColumnResizeHandle`. Omitted for the sub-title virtual column, which isn't resizable. */
  onResizePreview?: (width: number) => void;
  /**
   * Current width for the item-title virtual column's own resize handle —
   * that column has no `column` prop (see above), so it can't read its width
   * off one the way a real column does. Omitted for every other header cell.
   */
  resizable_width?: number;
  /** Fired once on the item-title column's resize-drag end, with the final width — the virtual-column analogue of `onUpdateSettings`'s `width` patch. */
  onResizeEnd?: (width: number) => void;
  onEditLabels?: () => void;
  onRequestFilter?: () => void;
  onRequestGroupBy?: () => void;
  onCollapseAll: () => void;
  onDuplicate: () => void;
  onAddColumnRight?: (kind: ColumnKind, label: string, default_width: number) => void;
  onChangeType?: (kind: ColumnKind, default_width: number) => void;
  onDelete: () => void;
  className?: string;
}

export default function ColumnHeaderCell({
  title, height, column, can_delete, sort_dir, is_group_by_eligible, is_menu_open, is_hovered, is_editing, draft,
  onEnter, onLeave, onOpenMenu, onCloseMenu, onRename, onStartRename, onDraftChange, onCommitRename, onCancelRename,
  onSort, onUpdateSettings, onResizePreview, resizable_width, onResizeEnd, onEditLabels,
  onRequestFilter, onRequestGroupBy, onCollapseAll, onDuplicate, onAddColumnRight, onChangeType, onDelete, className,
}: ColumnHeaderCellProps) {
  const show_sort_badge = is_hovered || is_menu_open || !!sort_dir;
  const title_input_ref = useRef<HTMLInputElement>(null);
  // Picking an emoji blurs the title input (the picker's grid is a portaled
  // element outside it), which would otherwise reach `onBlur` before the
  // pick's own text update lands and commit the rename out from under it.
  const is_emoji_palette_open_ref = useRef(false);
  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`relative flex items-center justify-center gap-[3px] border-r border-boardtree-border-soft ${className || ""}`}
      style={{ height }}
    >
      {show_sort_badge && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSort(sort_dir ? null : "asc"); }}
          className="absolute -top-2.5 left-1/2 z-[90] flex h-[19px] w-[19px] -translate-x-1/2 items-center justify-center rounded-full bg-boardtree-accent text-white shadow-[0_2px_6px_rgba(30,34,55,0.30)] hover:bg-boardtree-accent-hover"
        >
          {!sort_dir && <svg viewBox="0 0 14 14" width="11" height="11"><path d="M7 2 L10.2 5.6 H3.8 Z" fill="currentColor" /><path d="M7 12 L10.2 8.4 H3.8 Z" fill="currentColor" /></svg>}
          {sort_dir === "asc" && <svg viewBox="0 0 14 14" width="11" height="11"><path d="M7 2.6 L11.2 8 H2.8 Z" fill="currentColor" /></svg>}
          {sort_dir === "desc" && <svg viewBox="0 0 14 14" width="11" height="11"><path d="M7 11.4 L11.2 6 H2.8 Z" fill="currentColor" /></svg>}
        </button>
      )}
      {is_editing ? (
        <span className="relative flex min-w-0 flex-1 items-center">
          <input
            ref={title_input_ref}
            autoFocus
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={() => { if (!is_emoji_palette_open_ref.current) onCommitRename(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") onCancelRename();
            }}
            className="min-w-0 flex-1 rounded-[5px] border border-boardtree-accent bg-boardtree-surface py-1 pl-1.5 pr-6 text-[12.5px] font-medium text-boardtree-text outline-none"
          />
          <EmojiInsertButton
            input_ref={title_input_ref}
            value={draft}
            onChange={onDraftChange}
            onOpenChange={(is_open) => { is_emoji_palette_open_ref.current = is_open; }}
            size={12}
            className="absolute right-1 top-1/2 -translate-y-1/2"
          />
        </span>
      ) : (
        <button
          type="button"
          onClick={onStartRename}
          title="Click to rename"
          className="max-w-full truncate rounded-[5px] px-1.5 py-1 text-[12.5px] font-medium text-boardtree-text-muted hover:bg-boardtree-hover hover:text-boardtree-text"
        >
          {title}
        </button>
      )}
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex h-5 w-5 flex-none items-center justify-center rounded-[4px] text-boardtree-text-muted hover:bg-boardtree-hover-strong hover:text-boardtree-accent"
        style={{ opacity: is_hovered || is_menu_open ? 1 : 0 }}
      >
        <svg viewBox="0 0 16 16" width="14" height="14"><circle cx="4" cy="8" r="1.3" fill="currentColor" /><circle cx="8" cy="8" r="1.3" fill="currentColor" /><circle cx="12" cy="8" r="1.3" fill="currentColor" /></svg>
      </button>
      {is_menu_open && (
        <ColumnMenu
          title={title}
          column={column}
          can_delete={can_delete}
          sort_dir={sort_dir}
          is_group_by_eligible={!!is_group_by_eligible}
          onRename={onRename}
          onSort={onSort}
          onUpdateSettings={onUpdateSettings ?? (() => {})}
          onEditLabels={onEditLabels}
          onRequestFilter={onRequestFilter ?? (() => {})}
          onRequestGroupBy={onRequestGroupBy ?? (() => {})}
          onCollapseAll={onCollapseAll}
          onDuplicate={onDuplicate}
          onAddColumnRight={onAddColumnRight ?? (() => {})}
          onChangeType={onChangeType ?? (() => {})}
          onDelete={onDelete}
          onClose={onCloseMenu}
        />
      )}
      {((column && onUpdateSettings) || (resizable_width !== undefined && onResizeEnd)) && (
        <ColumnResizeHandle
          width={column ? column.width : resizable_width!}
          onResize={(width) => onResizePreview?.(width)}
          onResizeEnd={(width) => (column ? onUpdateSettings!({ width }) : onResizeEnd!(width))}
        />
      )}
    </div>
  );
}
