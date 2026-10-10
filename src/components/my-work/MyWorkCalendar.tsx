"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { buildCalendarDays, DOW_CELLS, monthLabelOf, monthOf, shiftMonth, type MonthCursor } from "@/components/board/table/dateUtils";
import { ChevronLeftIcon, ChevronRightIcon } from "@/icons/workspace-icons";
import type { MyWorkItemDto } from "@/types/personal";
import { itemHrefOf } from "./MyWorkRow";

/** Chips shown per day before the rest fold into "+N more". */
const MAX_CHIPS_PER_DAY = 3;

/**
 * My Work's Calendar tab: the same assigned items laid out on a month grid by
 * due date, each chip in its status color. Items without a date are counted
 * under the grid since they have no day to sit on.
 */
const MyWorkCalendar: React.FC<{ items: MyWorkItemDto[] }> = ({ items }) => {
  const [cursor, setCursor] = useState<MonthCursor>(() => monthOf(undefined));
  const [expanded_day, setExpandedDay] = useState<string | null>(null);
  const days = useMemo(() => buildCalendarDays(cursor), [cursor]);

  const items_by_day = useMemo(() => {
    const grouped = new Map<string, MyWorkItemDto[]>();
    for (const item of items) {
      if (!item.date) continue;
      const key = item.date.value.slice(0, 10);
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }
    return grouped;
  }, [items]);

  const undated_count = items.filter((item) => !item.date).length;
  const nav_button_class = "my-work-ghost-button h-8 w-8 justify-center p-0";

  return (
    <div className="flex flex-col gap-3 pb-8">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setCursor(monthOf(undefined))} className="my-work-ghost-button border border-[var(--mw-control-border)] text-board-cell">
          Today
        </button>
        <button type="button" onClick={() => setCursor((current) => shiftMonth(current, -1))} aria-label="Previous month" className={nav_button_class}>
          <ChevronLeftIcon size={14} />
        </button>
        <button type="button" onClick={() => setCursor((current) => shiftMonth(current, 1))} aria-label="Next month" className={nav_button_class}>
          <ChevronRightIcon size={14} />
        </button>
        <h2 className="font-heading text-board-group-title" aria-live="polite">
          {monthLabelOf(cursor)}
        </h2>
      </div>

      <div className="my-work-scroll overflow-x-auto">
        <div className="my-work-calendar-grid min-w-[840px]" role="grid" aria-label={`Due dates in ${monthLabelOf(cursor)}`}>
          {DOW_CELLS.map((cell) => (
            <div key={cell.key} role="columnheader" className="border-b border-r border-[var(--mw-border)] py-2 text-center text-board-caption text-[var(--mw-text-secondary)]">
              {cell.label}
            </div>
          ))}
          {days.map((day) => {
            const day_items = items_by_day.get(day.iso) ?? [];
            const is_expanded = expanded_day === day.iso;
            const visible = is_expanded ? day_items : day_items.slice(0, MAX_CHIPS_PER_DAY);
            const hidden_count = day_items.length - visible.length;

            return (
              <div key={day.iso} role="gridcell" data-outside={!day.in_month} className="my-work-calendar-day flex flex-col gap-1">
                <span
                  className={`mb-0.5 flex h-6 w-6 items-center justify-center self-end rounded-full text-board-caption ${
                    day.is_today ? "bg-[var(--mw-accent)] font-semibold text-white" : day.in_month ? "" : "text-[var(--mw-text-faint)]"
                  }`}
                >
                  {day.label}
                </span>
                {visible.map((item) => (
                  <Link
                    key={item.id}
                    href={itemHrefOf(item)}
                    title={`${item.name}, ${item.board.label}`}
                    className={`my-work-calendar-chip text-board-caption ${item.is_done ? "line-through opacity-70" : ""}`}
                    style={{ background: item.status?.color ?? item.group.color }}
                  >
                    {item.name}
                  </Link>
                ))}
                {hidden_count > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpandedDay(day.iso)}
                    className="rounded px-1 text-left text-board-caption text-[var(--mw-text-secondary)] hover:bg-[var(--mw-hover)]"
                  >
                    +{hidden_count} more
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {undated_count > 0 && (
        <p className="text-board-caption text-[var(--mw-text-secondary)]">
          {undated_count} {undated_count === 1 ? "item has" : "items have"} no date, switch to the Table tab to see {undated_count === 1 ? "it" : "them"}.
        </p>
      )}
    </div>
  );
};

export default MyWorkCalendar;
