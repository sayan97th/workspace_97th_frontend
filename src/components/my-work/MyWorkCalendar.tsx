"use client";
import React, { useMemo } from "react";
import Link from "next/link";
import type { MyWorkItemDto } from "@/types/personal";
import {
  buildCalendarEvents,
  buildCalendarRows,
  layoutRowSegments,
  type MyWorkCalendarDay,
  type MyWorkCalendarSegment,
  type MyWorkCalendarSource,
} from "./myWorkCalendar";
import type { MyWorkCalendarMode } from "./myWorkPreferences";
import { itemHrefOf } from "./MyWorkRow";

/** Lines of items a month cell shows before the rest fold into "+N more". */
const MONTH_VISIBLE_LANES = 3;

type MyWorkCalendarProps = {
  items: MyWorkItemDto[];
  cursor: Date;
  mode: MyWorkCalendarMode;
  today_key: string;
  hidden_sources: string[];
  onToggleSource: (source_key: string) => void;
  /** Hovering a day shows "+ Add", which opens "New Item" due on that day. */
  onAddItem: (date_key: string) => void;
  /** "+N more" in a month cell opens that day in the Day view. */
  onOpenDay: (date: Date) => void;
};

/**
 * My Work's Calendar tab, after monday.com: a Month grid, a Week strip or a
 * single Day, with every assigned item placed from its start to its due day
 * and colored by the date column it comes from, which the legend lists.
 */
const MyWorkCalendar: React.FC<MyWorkCalendarProps> = ({ items, cursor, mode, today_key, hidden_sources, onToggleSource, onAddItem, onOpenDay }) => {
  const { events, sources } = useMemo(() => buildCalendarEvents(items), [items]);
  const rows = useMemo(() => buildCalendarRows(cursor, mode, today_key), [cursor, mode, today_key]);
  const visible_events = useMemo(() => events.filter((event) => !hidden_sources.includes(event.source_key)), [events, hidden_sources]);
  const color_by_source = useMemo(() => new Map(sources.map((source) => [source.key, source.color])), [sources]);
  const undated_count = items.filter((item) => !item.date).length;
  const header_days = rows[0];

  return (
    <div className="my-work-calendar" data-mode={mode}>
      <div className="my-work-calendar-frame" role="grid" aria-label="Your items by date">
        <div role="row" className="my-work-calendar-head" style={{ gridTemplateColumns: `repeat(${header_days.length}, minmax(0, 1fr))` }}>
          {header_days.map((day) => (
            <CalendarHeaderCell key={day.key} day={day} mode={mode} />
          ))}
        </div>

        <div className="my-work-calendar-body">
          {rows.map((row) => (
            <CalendarRow
              key={row[0].key}
              row={row}
              mode={mode}
              segments={layoutRowSegments(row, visible_events)}
              color_by_source={color_by_source}
              onAddItem={onAddItem}
              onOpenDay={onOpenDay}
            />
          ))}
        </div>
      </div>

      <CalendarLegend sources={sources} hidden_sources={hidden_sources} undated_count={undated_count} onToggleSource={onToggleSource} />
    </div>
  );
};

const CalendarHeaderCell: React.FC<{ day: MyWorkCalendarDay; mode: MyWorkCalendarMode }> = ({ day, mode }) => {
  if (mode === "month") {
    return (
      <div role="columnheader" className="my-work-calendar-head-cell text-board-cell">
        {day.date.toLocaleDateString("en-US", { weekday: "short" })}
      </div>
    );
  }

  return (
    <div role="columnheader" data-today={day.is_today} className="my-work-calendar-head-cell my-work-calendar-head-cell--dated">
      <span className="text-board-caption">{day.date.toLocaleDateString("en-US", { weekday: mode === "day" ? "long" : "short" })}</span>
      <span className="my-work-calendar-head-date">{day.date.getDate()}</span>
    </div>
  );
};

type CalendarRowProps = {
  row: MyWorkCalendarDay[];
  mode: MyWorkCalendarMode;
  segments: MyWorkCalendarSegment[];
  color_by_source: Map<string, string>;
  onAddItem: (date_key: string) => void;
  onOpenDay: (date: Date) => void;
};

const CalendarRow: React.FC<CalendarRowProps> = ({ row, mode, segments, color_by_source, onAddItem, onOpenDay }) => {
  const max_lanes = mode === "month" ? MONTH_VISIBLE_LANES : Number.POSITIVE_INFINITY;
  const shown_segments = segments.filter((segment) => segment.lane < max_lanes);
  const columns_style = { gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` };

  // Items folded away per day, counted on every day the hidden event covers.
  const hidden_by_day = row.map(
    (_, index) => segments.filter((segment) => segment.lane >= max_lanes && index >= segment.first_column && index < segment.first_column + segment.span).length
  );

  return (
    <div role="row" className="my-work-calendar-row">
      <div className="my-work-calendar-cells" style={columns_style}>
        {row.map((day) => (
          <div key={day.key} role="gridcell" data-outside={!day.in_month} data-today={day.is_today} className="my-work-calendar-cell">
            {mode === "month" && <span className="my-work-calendar-day-number text-board-cell">{String(day.date.getDate()).padStart(2, "0")}</span>}
            <button
              type="button"
              onClick={() => onAddItem(day.key)}
              aria-label={`Add item on ${day.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`}
              className="my-work-calendar-add text-board-caption"
            >
              <span aria-hidden="true">+ Add</span>
            </button>
          </div>
        ))}
      </div>

      <div className="my-work-calendar-events my-work-scroll" style={columns_style}>
        {shown_segments.map((segment) => (
          <CalendarEventPill key={`${segment.event.item.id}-${segment.first_column}`} segment={segment} color={color_by_source.get(segment.event.source_key) ?? "#579bfc"} />
        ))}
        {hidden_by_day.map((count, index) =>
          count > 0 ? (
            <button
              key={`more-${row[index].key}`}
              type="button"
              onClick={() => onOpenDay(row[index].date)}
              className="my-work-calendar-more text-board-caption"
              style={{ gridColumn: index + 1, gridRow: MONTH_VISIBLE_LANES + 1 }}
            >
              +{count} more
            </button>
          ) : null
        )}
      </div>
    </div>
  );
};

const CalendarEventPill: React.FC<{ segment: MyWorkCalendarSegment; color: string }> = ({ segment, color }) => {
  const { item } = segment.event;
  const subtitle = [item.board.label, item.status?.label].filter(Boolean).join(", ");

  return (
    <Link
      href={itemHrefOf(item)}
      title={`${item.name}${subtitle ? `, ${subtitle}` : ""}`}
      data-done={item.is_done}
      data-continues-before={segment.continues_before}
      data-continues-after={segment.continues_after}
      className="my-work-calendar-pill text-board-caption"
      style={{ gridColumn: `${segment.first_column + 1} / span ${segment.span}`, gridRow: segment.lane + 1, background: color }}
    >
      {item.status && <span className="my-work-calendar-pill-status" style={{ background: item.status.color }} aria-hidden="true" />}
      <span className="truncate">{item.name}</span>
    </Link>
  );
};

type CalendarLegendProps = {
  sources: MyWorkCalendarSource[];
  hidden_sources: string[];
  undated_count: number;
  onToggleSource: (source_key: string) => void;
};

const CalendarLegend: React.FC<CalendarLegendProps> = ({ sources, hidden_sources, undated_count, onToggleSource }) => {
  if (sources.length === 0 && undated_count === 0) return null;

  return (
    <div className="my-work-calendar-legend text-board-cell">
      {sources.map((source) => {
        const is_hidden = hidden_sources.includes(source.key);
        return (
          <button
            key={source.key}
            type="button"
            aria-pressed={!is_hidden}
            onClick={() => onToggleSource(source.key)}
            title={is_hidden ? `Show ${source.label} items` : `Hide ${source.label} items`}
            className="my-work-calendar-legend-entry"
          >
            <span className="my-work-calendar-legend-dot" style={{ "--mw-legend-color": source.color } as React.CSSProperties} aria-hidden="true" />
            {source.label}
          </button>
        );
      })}
      {undated_count > 0 && (
        <span className="text-board-caption text-[var(--mw-text-secondary)]">
          {undated_count} {undated_count === 1 ? "item has" : "items have"} no date, see the Table tab
        </span>
      )}
    </div>
  );
};

export default MyWorkCalendar;
