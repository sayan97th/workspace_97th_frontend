"use client";
import React from "react";
import type { MyWorkItemDto, MyWorkResponseDto, MyWorkStatus } from "@/types/personal";
import type { MyWorkSection as MyWorkSectionData, MyWorkSort, MyWorkSortKey } from "./myWorkBuckets";
import { SectionChevronIcon, SortArrowIcon } from "./myWorkIcons";
import { buildColumnTemplate, type MyWorkColumn } from "./myWorkPreferences";
import MyWorkRow from "./MyWorkRow";

export type MyWorkSectionProps = {
  section: MyWorkSectionData;
  columns: MyWorkColumn[];
  status_columns: MyWorkResponseDto["status_columns"];
  is_collapsed: boolean;
  sort: MyWorkSort;
  today_key: string;
  onToggle: () => void;
  onSort: (key: MyWorkSortKey) => void;
  onAddItem: () => void;
  onStatusChange: (item: MyWorkItemDto, status: MyWorkStatus | null) => void;
  onPriorityChange: (item: MyWorkItemDto, priority: MyWorkStatus | null) => void;
  onDateChange: (item: MyWorkItemDto, date: string | null) => void;
  onCopyLink: (href: string) => void;
};

const optionsOf = (status_columns: MyWorkResponseDto["status_columns"], column_id: number | null): MyWorkStatus[] =>
  column_id === null ? [] : status_columns[String(column_id)]?.options ?? [];

/**
 * One My Work section. Folded, it is only the colored title and its count.
 * Open, the title row also carries the column headers, like monday.com, and
 * the rows hang off a bar in the section color.
 */
const MyWorkSection: React.FC<MyWorkSectionProps> = ({
  section,
  columns,
  status_columns,
  is_collapsed,
  sort,
  today_key,
  onToggle,
  onSort,
  onAddItem,
  onStatusChange,
  onPriorityChange,
  onDateChange,
  onCopyLink,
}) => {
  const count_label = `${section.items.length} ${section.items.length === 1 ? "item" : "items"}`;
  const section_style = { "--mw-columns": buildColumnTemplate(columns), "--mw-section-color": section.color } as React.CSSProperties;

  const title = (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!is_collapsed}
      className="flex min-w-0 items-center gap-2 rounded px-1 py-1 text-left"
      style={{ color: section.color }}
    >
      <SectionChevronIcon is_open={!is_collapsed} size={18} className="flex-none" />
      <span className="truncate font-heading text-board-group-title">{section.label}</span>
      <span className="flex-none text-board-cell text-[var(--mw-text)]">{count_label}</span>
    </button>
  );

  if (is_collapsed) {
    return (
      <section aria-label={`${section.label}, ${count_label}`} className="flex h-10 items-center">
        {title}
      </section>
    );
  }

  return (
    <section aria-label={`${section.label}, ${count_label}`} style={section_style}>
      <div role="table" aria-label={section.label} aria-rowcount={section.items.length + 1}>
        <div role="row" className="my-work-grid-row items-end">
          <div role="columnheader" className="flex h-10 min-w-0 items-center">
            {title}
          </div>
          {columns.map((column) => {
            const is_sorted = column.sort_key !== null && sort.key === column.sort_key;
            const aria_sort = is_sorted ? (sort.direction === "asc" ? "ascending" : "descending") : undefined;
            return (
              <div key={column.key} role="columnheader" aria-sort={aria_sort} className="text-board-cell">
                {column.sort_key === null ? (
                  <span className="my-work-column-header pointer-events-none">
                    <span className="sr-only">{column.label}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => column.sort_key && onSort(column.sort_key)}
                    data-sorted={is_sorted}
                    title={`Sort by ${column.label}`}
                    className="my-work-column-header w-full"
                  >
                    <span className="truncate">{column.label}</span>
                    {is_sorted && <SortArrowIcon direction={sort.direction} className="flex-none" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div role="rowgroup" className="my-work-section-body text-board-cell">
          {section.items.map((item) => (
            <MyWorkRow
              key={item.id}
              item={item}
              columns={columns}
              status_options={optionsOf(status_columns, item.status_column_id)}
              priority_options={optionsOf(status_columns, item.priority_column_id)}
              today_key={today_key}
              onStatusChange={(status) => onStatusChange(item, status)}
              onPriorityChange={(priority) => onPriorityChange(item, priority)}
              onDateChange={(date) => onDateChange(item, date)}
              onCopyLink={onCopyLink}
            />
          ))}
          <div role="row" className="my-work-add-row flex">
            <button
              type="button"
              onClick={onAddItem}
              className="flex h-full flex-1 items-center pl-7 text-left"
            >
              + Add item
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MyWorkSection;
