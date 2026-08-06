"use client";
import React, { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, Views, type SlotInfo, type View } from "react-big-calendar";
import withDragAndDrop, { type EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./board-calendar.css";
import { PlusIcon } from "@/icons/board-icons";
import CalendarToolbar from "./CalendarToolbar";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: enUS }),
  getDay,
  locales: { "en-US": enUS },
});

/**
 * `react-big-calendar`'s event type is fixed here (rather than generic over
 * `TRow`) so `withDragAndDrop` only ever wraps one concrete component — the
 * calendar's actual row payload is looked up by id from `rows_by_event_id`
 * inside the custom `event`/`onSelectEvent`/drag handlers below instead of
 * being carried on the RBC event object itself.
 */
type CalendarEventItem = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: true;
  color: string;
};

const DnDCalendar = withDragAndDrop<CalendarEventItem>(Calendar);

/** Parses a `YYYY-MM-DD` column value into a local-midnight `Date` — using local (not UTC) components so the event lands in the calendar cell a viewer actually expects, regardless of timezone. */
const parseIsoDate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Inverse of {@link parseIsoDate} — formats a `Date` back to `YYYY-MM-DD` in local time. */
const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export type BoardCalendarRange = {
  /** `YYYY-MM-DD`. */
  start: string;
  /** `YYYY-MM-DD`, inclusive. Defaults to `start` (a single-day event) when omitted. */
  end?: string | null;
};

export type BoardCalendarProps<TRow> = {
  rows: TRow[];
  getRowId: (row: TRow) => string;
  /** Resolves a row's date-column value(s) into the range it occupies on the calendar — return `null` to leave the row off the calendar entirely (no date set yet). */
  getRowRange: (row: TRow) => BoardCalendarRange | null;
  /** Accent color for the event pill's left border/tint — e.g. the row's status option color. Defaults to brand blue. */
  getRowColor?: (row: TRow) => string;
  /** Renders one event's content — the caller owns the layout (title, avatars, …), mirroring `BoardKanban`'s `renderCard`. */
  renderEvent: (row: TRow) => React.ReactNode;
  onSelectEvent?: (row: TRow) => void;
  selectedRowId?: string | null;
  /** Fired when an event is dragged onto a new day (or, when `resizable`, resized to span a new range) — the new `YYYY-MM-DD` start/end it now occupies. */
  onMoveEvent?: (row_id: string, new_start: string, new_end: string) => void;
  /** Whether an event's end date can be dragged independently of its start — offer this only when the caller actually has an end-date column to persist it to. */
  resizable?: boolean;
  /** Fired when an empty day cell (or its hover "+") is clicked to create a new item there, prefilled with that date. Omit to make day cells inert. */
  onAddEvent?: (date: string) => void;
};

const CALENDAR_VIEWS: View[] = [Views.MONTH, Views.AGENDA];

/**
 * Generic, reusable Monday-style calendar built on `react-big-calendar` +
 * its drag-and-drop addon: a Month grid (matching Monday's own calendar
 * view) plus an Agenda list, a custom shell-styled toolbar (Today/prev/
 * next/view switcher), drag-to-reschedule, click-a-day-cell to create an
 * item, and click-an-event to open it. Every column type this app's date
 * column can drive (single date, or a start+end pair) round-trips through
 * plain `YYYY-MM-DD` strings — no time-of-day, matching how `BoardValueCell`
 * already stores dates — so events always render as all-day blocks, never a
 * timed grid. Callers supply the rows (already filtered/sorted by the
 * board's toolbar) and a `renderEvent` function that owns the pill's
 * content, mirroring how `BoardTable` takes `renderCell` and `BoardKanban`
 * takes `renderCard` instead of owning cell/card layout itself.
 */
function BoardCalendar<TRow>({
  rows,
  getRowId,
  getRowRange,
  getRowColor,
  renderEvent,
  onSelectEvent,
  selectedRowId = null,
  onMoveEvent,
  resizable = false,
  onAddEvent,
}: BoardCalendarProps<TRow>) {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>(Views.MONTH);

  const rows_by_event_id = useMemo(() => {
    const map = new Map<string, TRow>();
    for (const row of rows) map.set(getRowId(row), row);
    return map;
  }, [rows, getRowId]);

  const events: CalendarEventItem[] = useMemo(() => {
    const list: CalendarEventItem[] = [];
    for (const row of rows) {
      const range = getRowRange(row);
      if (!range) continue;
      const start = parseIsoDate(range.start);
      if (!start) continue;
      const end = (range.end && parseIsoDate(range.end)) || start;
      list.push({
        id: getRowId(row),
        title: "",
        start,
        end: end < start ? start : end,
        allDay: true,
        color: getRowColor?.(row) ?? "#579bfc",
      });
    }
    return list;
  }, [rows, getRowRange, getRowColor, getRowId]);

  const EventContent = useMemo(() => {
    const Content: React.FC<{ event: CalendarEventItem }> = ({ event }) => {
      const row = rows_by_event_id.get(event.id);
      if (!row) return null;
      return (
        <div
          className={`board-calendar-event${selectedRowId === event.id ? " board-calendar-event--selected" : ""}`}
          style={{ "--event-color": event.color } as React.CSSProperties}
        >
          {renderEvent(row)}
        </div>
      );
    };
    return Content;
  }, [rows_by_event_id, renderEvent, selectedRowId]);

  const DateCell = useMemo(() => {
    const Cell: React.FC<{ value: Date; children: React.ReactNode }> = ({ value, children }) => (
      <div className="group/cell relative h-full">
        {children}
        {onAddEvent && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAddEvent(toIsoDate(value));
            }}
            aria-label="Add item"
            className="absolute right-1 top-1 z-10 hidden h-5 w-5 items-center justify-center rounded-[5px] text-shell-text-faint transition-colors hover:bg-shell-hover hover:text-shell-text group-hover/cell:flex"
          >
            <PlusIcon size={11} />
          </button>
        )}
      </div>
    );
    return Cell;
  }, [onAddEvent]);

  const handleEventDrop = ({ event, start, end }: EventInteractionArgs<CalendarEventItem>) => {
    if (!onMoveEvent) return;
    const start_date = start instanceof Date ? start : new Date(start);
    const end_date = end instanceof Date ? end : new Date(end);
    onMoveEvent(event.id, toIsoDate(start_date), toIsoDate(end_date));
  };

  const handleSelectSlot = (slot_info: SlotInfo) => {
    onAddEvent?.(toIsoDate(slot_info.start));
  };

  const handleSelectEvent = (event: CalendarEventItem) => {
    const row = rows_by_event_id.get(event.id);
    if (row) onSelectEvent?.(row);
  };

  return (
    <div className="board-calendar" style={{ height: "min(72vh, 760px)" }}>
      <DnDCalendar
        localizer={localizer}
        events={events}
        date={date}
        onNavigate={setDate}
        view={view}
        onView={setView}
        views={CALENDAR_VIEWS}
        popup
        selectable={Boolean(onAddEvent)}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        onEventDrop={handleEventDrop}
        onEventResize={resizable ? handleEventDrop : undefined}
        resizable={resizable}
        draggableAccessor={() => Boolean(onMoveEvent)}
        components={{
          toolbar: CalendarToolbar,
          event: EventContent,
          dateCellWrapper: DateCell,
        }}
      />
    </div>
  );
}

export default BoardCalendar;
