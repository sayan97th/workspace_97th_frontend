"use client";
import React from "react";

export type AdminSortDirection = "asc" | "desc";

export type AdminSortableHeaderProps<TField extends string> = {
  label: string;
  field: TField;
  sort_field: TField;
  sort_direction: AdminSortDirection;
  onSort: (field: TField) => void;
  className?: string;
};

/**
 * Clickable column header for the Administration tables: the first click sorts by the column,
 * the next one flips the direction, with an arrow showing the active sort.
 */
function AdminSortableHeader<TField extends string>({
  label,
  field,
  sort_field,
  sort_direction,
  onSort,
  className = "",
}: AdminSortableHeaderProps<TField>) {
  const is_active = sort_field === field;

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      aria-sort={is_active ? (sort_direction === "asc" ? "ascending" : "descending") : "none"}
      className={`group flex min-w-0 items-center gap-1 text-left uppercase tracking-[0.03em] transition-colors hover:text-shell-text-secondary ${
        is_active ? "text-shell-text-secondary" : ""
      } ${className}`}
    >
      <span className="truncate">{label}</span>
      <svg
        width="9"
        height="9"
        viewBox="0 0 12 12"
        className={`flex-none transition-opacity ${is_active ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`}
        style={{ transform: is_active && sort_direction === "asc" ? "rotate(180deg)" : undefined }}
      >
        <path d="M6 2.5v7M3 6.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export default AdminSortableHeader;
