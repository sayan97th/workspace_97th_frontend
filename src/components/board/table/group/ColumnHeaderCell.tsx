"use client";

import ColumnMenu from "../menus/ColumnMenu";

interface ColumnHeaderCellProps {
  scoped_key: string;
  title: string;
  height: number;
  can_delete: boolean;
  sort_dir: "asc" | "desc" | null;
  is_menu_open: boolean;
  is_hovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onRename: (title: string) => void;
  onSort: (dir: "asc" | "desc" | null) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  className?: string;
}

export default function ColumnHeaderCell({
  title, height, can_delete, sort_dir, is_menu_open, is_hovered,
  onEnter, onLeave, onOpenMenu, onCloseMenu, onRename, onSort, onDuplicate, onDelete, className,
}: ColumnHeaderCellProps) {
  const show_sort_badge = is_hovered || is_menu_open || !!sort_dir;
  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={`relative flex items-center justify-center gap-[3px] border-r border-[#eceef5] ${className || ""}`}
      style={{ height }}
    >
      {show_sort_badge && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSort(sort_dir ? null : "asc"); }}
          className="absolute -top-2.5 left-1/2 z-[90] flex h-[19px] w-[19px] -translate-x-1/2 items-center justify-center rounded-full bg-[#4f6bed] text-white shadow-[0_2px_6px_rgba(30,34,55,0.30)] hover:bg-[#3b57d8]"
        >
          {!sort_dir && <svg viewBox="0 0 14 14" width="11" height="11"><path d="M7 2 L10.2 5.6 H3.8 Z" fill="currentColor" /><path d="M7 12 L10.2 8.4 H3.8 Z" fill="currentColor" /></svg>}
          {sort_dir === "asc" && <svg viewBox="0 0 14 14" width="11" height="11"><path d="M7 2.6 L11.2 8 H2.8 Z" fill="currentColor" /></svg>}
          {sort_dir === "desc" && <svg viewBox="0 0 14 14" width="11" height="11"><path d="M7 11.4 L11.2 6 H2.8 Z" fill="currentColor" /></svg>}
        </button>
      )}
      <button
        type="button"
        onClick={onOpenMenu}
        className="max-w-full truncate rounded-[5px] px-1.5 py-1 text-[12.5px] font-medium text-[#6b7189] hover:bg-[#f1f3f9] hover:text-[#1e2237]"
      >
        {title}
      </button>
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex h-5 w-5 flex-none items-center justify-center rounded-[4px] text-[#6b7189] hover:bg-[#dfe4f6] hover:text-[#4f6bed]"
        style={{ opacity: is_hovered || is_menu_open ? 1 : 0 }}
      >
        <svg viewBox="0 0 16 16" width="14" height="14"><circle cx="4" cy="8" r="1.3" fill="currentColor" /><circle cx="8" cy="8" r="1.3" fill="currentColor" /><circle cx="12" cy="8" r="1.3" fill="currentColor" /></svg>
      </button>
      {is_menu_open && (
        <ColumnMenu title={title} can_delete={can_delete} sort_dir={sort_dir} onRename={onRename} onSort={onSort} onDuplicate={onDuplicate} onDelete={onDelete} onClose={onCloseMenu} />
      )}
    </div>
  );
}
