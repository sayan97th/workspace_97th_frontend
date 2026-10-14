"use client";
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type DateCellWrapperProps,
  type DateHeaderProps,
  type EventProps,
  type HeaderProps,
  type SlotInfo,
  type View,
} from "react-big-calendar";
import withDragAndDrop, { type EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import { addDays, addMonths, addWeeks, format, getDay, isSameDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./board-calendar.css";
import CalendarToolbar from "./CalendarToolbar";
import {
  CalendarFilterPanel,
  CalendarSettingsPanel,
  type CalendarColorSource,
  type CalendarDateSource,
  type CalendarGroupOption,
} from "./CalendarPanels";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import { toIsoDate } from "../gantt/ganttDate";
import {
  CALENDAR_MODES,
  DEFAULT_EVENT_COLOR,
  TIMED_EVENT_MINUTES,
  formatEventTime,
  parseCalendarDate,
  toIsoDateTime,
  type BoardCalendarColorBy,
  type BoardCalendarConfig,
  type BoardCalendarMode,
} from "./calendarConfig";

/** One spot a row takes on the calendar: a Date column value, or a Timeline column range. */
export type BoardCalendarEntry =
  | { source_id: string; kind: "date"; value: string }
  | { source_id: string; kind: "timeline"; start: string; end: string | null };

/**
 * `react-big-calendar`'s event. Its row is looked up by `row_id` instead of
 * carried here, so `withDragAndDrop` wraps one concrete type.
 */
type CalendarEventItem = {
  key: string;
  row_id: string;
  source_id: string;
  kind: "date" | "timeline";
  title: string;
  start: Date;
  /** Exclusive for all day events (midnight after the last day), like `react-big-calendar` expects. */
  end: Date;
  allDay: boolean;
  has_time: boolean;
  color: string;
};

const DnDCalendar = withDragAndDrop<CalendarEventItem>(Calendar);

/** What a month cell needs from the calendar without becoming a new component type on every change. */
const CalendarCellContext = createContext<{
  active_date: string | null;
  /** `YYYY-MM-DD` days holding at least one event, their "+ Add" moves to the bottom so it doesn't sit under the first event. */
  busy_dates: Set<string>;
  requestAdd: (date: string) => void;
}>({
  active_date: null,
  busy_dates: new Set(),
  requestAdd: () => {},
});

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_CALENDAR_HEIGHT = 520;
const BOTTOM_GAP = 24;
const SCROLL_TO_TIME = new Date(1970, 0, 1, 8, 0);

const isCalendarMode = (value: unknown): value is BoardCalendarMode => CALENDAR_MODES.some((option) => option.key === value);

const readStoredMode = (storage_key: string): BoardCalendarMode => {
  try {
    const stored = localStorage.getItem(`board_calendar_mode:${storage_key}`);
    return isCalendarMode(stored) ? stored : "month";
  } catch {
    return "month";
  }
};

/** "October 2026", "Oct 11 - 17, 2026", "Sep 27 - Oct 3, 2026" or "Tuesday, October 13, 2026". */
const formatRangeLabel = (date: Date, mode: BoardCalendarMode, week_starts_on: 0 | 1): string => {
  if (mode === "month") return format(date, "MMMM yyyy");
  if (mode === "day") return format(date, "EEEE, MMMM d, yyyy");
  const week_start = startOfWeek(date, { weekStartsOn: week_starts_on });
  const week_end = addDays(week_start, 6);
  if (week_start.getFullYear() !== week_end.getFullYear()) {
    return `${format(week_start, "MMM d, yyyy")} - ${format(week_end, "MMM d, yyyy")}`;
  }
  if (week_start.getMonth() !== week_end.getMonth()) {
    return `${format(week_start, "MMM d")} - ${format(week_end, "MMM d, yyyy")}`;
  }
  return `${format(week_start, "MMM d")} - ${format(week_end, "d, yyyy")}`;
};

const escapeIcsText = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const formatIcsDate = (date: Date): string => format(date, "yyyyMMdd");
const formatIcsDateTime = (date: Date): string => format(date, "yyyyMMdd'T'HHmmss");

/** Builds an iCalendar file of the given events, all day events as `VALUE=DATE`, timed ones in the viewer's local time. */
const buildIcsFile = (events: CalendarEventItem[], calendar_name: string): string => {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//97th Floor//Workspace Calendar//EN", `X-WR-CALNAME:${escapeIcsText(calendar_name)}`];
  for (const event of events) {
    lines.push("BEGIN:VEVENT", `UID:${event.key}@workspace-97th`, `DTSTAMP:${stamp}`, `SUMMARY:${escapeIcsText(event.title)}`);
    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(event.start)}`, `DTEND;VALUE=DATE:${formatIcsDate(event.end)}`);
    } else {
      lines.push(`DTSTART:${formatIcsDateTime(event.start)}`, `DTEND:${formatIcsDateTime(event.end)}`);
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
};

export type BoardCalendarProps<TRow> = {
  /** The header title, the view's own name. */
  title: string;
  /** Rows already filtered by the board toolbar and the calendar's group filter. */
  rows: TRow[];
  getRowId: (row: TRow) => string;
  getRowTitle: (row: TRow) => string;
  /** Every spot a row takes on the calendar, one per shown Date/Timeline column that has a value. */
  getRowEntries: (row: TRow) => BoardCalendarEntry[];
  /** The event's fill color. Defaults to monday.com's blue. */
  getRowColor?: (row: TRow) => string;
  /** The event's content after its time label (title, avatars...), owned by the caller like `BoardKanban`'s `renderCard`. */
  renderEvent: (row: TRow) => React.ReactNode;
  onSelectEvent?: (row: TRow) => void;
  selectedRowId?: string | null;
  /** An event was dragged (or a Timeline event resized). `value` is the new Date (`YYYY-MM-DD[THH:mm]`) or Timeline value. Omit to make events fixed. */
  onChangeEntry?: (row_id: string, source_id: string, value: string | { start: string; end: string }) => void;
  /** A day's "+ Add" (or a Week/Day time slot) was clicked, with `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`. The caller opens its New Item dialog. Omit to hide "+ Add". */
  onAddItem?: (date: string) => void;
  /** The day a New Item dialog is open for, kept highlighted like a hovered cell. */
  pending_add_date?: string | null;
  config: BoardCalendarConfig;
  /** Omit while the view's settings can't be changed (locked, or no edit rights). */
  onConfigChange?: (next: BoardCalendarConfig) => void;
  date_sources: CalendarDateSource[];
  active_source_ids: string[];
  color_sources: CalendarColorSource[];
  active_color_by: BoardCalendarColorBy;
  groups: CalendarGroupOption[];
  /** Keys the viewer's Month/Week/Day choice in localStorage, e.g. `board_id:view_id`. */
  storage_key: string;
};

/**
 * monday.com style Calendar view built on `react-big-calendar` and its drag
 * and drop addon. Items land on the calendar through the board's Date
 * columns (one day, or one time slot when the date has a time) and Timeline
 * columns (a span of days). The header switches Month/Week/Day, filters by
 * group and opens the settings; a day's "+ Add" creates an item on it;
 * dragging an event writes its new date back to the column it came from.
 */
function BoardCalendar<TRow>({
  title,
  rows,
  getRowId,
  getRowTitle,
  getRowEntries,
  getRowColor,
  renderEvent,
  onSelectEvent,
  selectedRowId = null,
  onChangeEntry,
  onAddItem,
  pending_add_date = null,
  config,
  onConfigChange,
  date_sources,
  active_source_ids,
  color_sources,
  active_color_by,
  groups,
  storage_key,
}: BoardCalendarProps<TRow>) {
  const week_starts_on = config.week_starts_on ?? 0;
  const [date, setDate] = useState(() => new Date());
  const [mode, setMode] = useState<BoardCalendarMode>("month");
  const [calendar_height, setCalendarHeight] = useState(640);
  const [settings_anchor_el, setSettingsAnchorEl] = useState<HTMLElement | null>(null);
  const root_ref = useRef<HTMLDivElement | null>(null);
  // Read through a ref so the month cells (see `DateCellWrapper`) keep their identity while the caller's handler changes.
  const on_add_item_ref = useRef(onAddItem);
  useEffect(() => {
    on_add_item_ref.current = onAddItem;
  });

  // Read after mount so the server render and the first client render agree.
  useEffect(() => {
    setMode(readStoredMode(storage_key));
  }, [storage_key]);

  const changeMode = (next_mode: BoardCalendarMode) => {
    setMode(next_mode);
    try {
      localStorage.setItem(`board_calendar_mode:${storage_key}`, next_mode);
    } catch {
      // Storage can be blocked (private mode), the choice then lasts for this visit only.
    }
  };

  // Fills the window below the calendar's top edge, like monday.com's full height calendar.
  useLayoutEffect(() => {
    const measure = () => {
      const top = root_ref.current?.getBoundingClientRect().top ?? 0;
      setCalendarHeight(Math.max(MIN_CALENDAR_HEIGHT, Math.floor(window.innerHeight - top - BOTTOM_GAP)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const localizer = useMemo(
    () =>
      dateFnsLocalizer({
        format,
        parse,
        startOfWeek: (value: Date) => startOfWeek(value, { weekStartsOn: week_starts_on }),
        getDay,
        locales: { "en-US": enUS },
      }),
    [week_starts_on]
  );

  const rows_by_id = useMemo(() => {
    const map = new Map<string, TRow>();
    for (const row of rows) map.set(getRowId(row), row);
    return map;
  }, [rows, getRowId]);

  const events: CalendarEventItem[] = useMemo(() => {
    const list: CalendarEventItem[] = [];
    for (const row of rows) {
      const row_id = getRowId(row);
      const color = getRowColor?.(row) ?? DEFAULT_EVENT_COLOR;
      const row_title = getRowTitle(row);
      for (const entry of getRowEntries(row)) {
        const base = { key: `${row_id}:${entry.source_id}`, row_id, source_id: entry.source_id, kind: entry.kind, title: row_title, color };
        if (entry.kind === "date") {
          const parsed = parseCalendarDate(entry.value);
          if (!parsed) continue;
          list.push(
            parsed.has_time
              ? { ...base, start: parsed.date, end: new Date(parsed.date.getTime() + TIMED_EVENT_MINUTES * 60 * 1000), allDay: false, has_time: true }
              : { ...base, start: parsed.date, end: addDays(parsed.date, 1), allDay: true, has_time: false }
          );
          continue;
        }
        const start = parseCalendarDate(entry.start)?.date;
        if (!start) continue;
        const parsed_end = entry.end ? parseCalendarDate(entry.end)?.date : null;
        const last_day = parsed_end && parsed_end >= start ? parsed_end : start;
        list.push({ ...base, start, end: addDays(last_day, 1), allDay: true, has_time: false });
      }
    }
    return list;
  }, [rows, getRowId, getRowTitle, getRowEntries, getRowColor]);

  const navigate = (action: "TODAY" | "PREV" | "NEXT") => {
    if (action === "TODAY") {
      setDate(new Date());
      return;
    }
    const step = action === "NEXT" ? 1 : -1;
    setDate((current) => (mode === "month" ? addMonths(current, step) : mode === "week" ? addWeeks(current, step) : addDays(current, step)));
  };

  const requestAdd = useCallback((value: string) => on_add_item_ref.current?.(value), []);

  const EventContent = useMemo(() => {
    const Content: React.FC<EventProps<CalendarEventItem>> = ({ event }) => {
      const row = rows_by_id.get(event.row_id);
      if (!row) return null;
      return (
        <div className="board-calendar-event">
          {event.has_time && <span className="board-calendar-event__time">{formatEventTime(event.start)}</span>}
          <div className="board-calendar-event__content">{renderEvent(row)}</div>
        </div>
      );
    };
    return Content;
  }, [rows_by_id, renderEvent]);

  // The day number in a month cell, padded like monday.com ("01") and boxed in blue on today.
  const MonthDateHeader = useMemo(() => {
    const Header: React.FC<DateHeaderProps> = ({ date: cell_date }) => (
      <span className="board-calendar__day-number" data-today={isSameDay(cell_date, new Date()) || undefined}>
        {format(cell_date, "dd")}
      </span>
    );
    return Header;
  }, []);

  // Week/Day column headers, "Sun" over "11" with the same today box.
  const TimeGridHeader = useMemo(() => {
    const Header: React.FC<HeaderProps> = ({ date: header_date }) => (
      <span className="board-calendar__grid-header">
        <span>{format(header_date, "EEE")}</span>
        <span className="board-calendar__day-number" data-today={isSameDay(header_date, new Date()) || undefined}>
          {format(header_date, "dd")}
        </span>
      </span>
    );
    return Header;
  }, []);

  const active_add_date = pending_add_date ? pending_add_date.slice(0, 10) : null;
  const can_add = Boolean(onAddItem);

  // A month cell's background, which shows "+ Add" while hovered. Its identity
  // only follows the mode: a new component type would remount every cell, and
  // and flicker the hover state under the pointer.
  const DateCellWrapper = useMemo(() => {
    const Wrapper: React.FC<DateCellWrapperProps> = ({ value, children }) => {
      const cell_context = useContext(CalendarCellContext);
      if (!can_add || mode !== "month" || !React.isValidElement<{ className?: string; children?: React.ReactNode }>(children)) {
        return <>{children}</>;
      }
      const iso_date = toIsoDate(value);
      const is_active = cell_context.active_date === iso_date;
      const is_busy = cell_context.busy_dates.has(iso_date);
      return React.cloneElement(
        children,
        {
          className: `${children.props.className ?? ""} board-calendar__day-cell${is_active ? " board-calendar__day-cell--active" : ""}${is_busy ? " board-calendar__day-cell--busy" : ""}`,
        },
        <button
          type="button"
          className="board-calendar__add-button"
          aria-label={`Add item on ${format(value, "EEEE, MMMM d")}`}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            cell_context.requestAdd(iso_date);
          }}
        >
          + Add
        </button>
      );
    };
    return Wrapper;
  }, [can_add, mode]);

  const busy_dates = useMemo(() => {
    const dates = new Set<string>();
    for (const event of events) {
      for (let day = new Date(event.start); day < event.end; day = addDays(day, 1)) dates.add(toIsoDate(day));
      dates.add(toIsoDate(event.start));
    }
    return dates;
  }, [events]);

  const cell_context_value = useMemo(
    () => ({ active_date: active_add_date, busy_dates, requestAdd }),
    [active_add_date, busy_dates, requestAdd]
  );

  const eventPropGetter = useCallback(
    (event: CalendarEventItem) => ({
      className: `board-calendar__event${selectedRowId === event.row_id ? " board-calendar__event--selected" : ""}`,
      style: { "--event-color": event.color } as React.CSSProperties,
    }),
    [selectedRowId]
  );

  const handleEventChange = ({ event, start, end, isAllDay }: EventInteractionArgs<CalendarEventItem>) => {
    if (!onChangeEntry) return;
    const start_date = new Date(start);
    const end_date = new Date(end);
    if (event.kind === "timeline") {
      // All day ends are exclusive, so the last day is the one before `end`. A drop on a time slot still moves whole days.
      const last_day = end_date.getTime() - start_date.getTime() >= DAY_MS ? addDays(end_date, -1) : start_date;
      onChangeEntry(event.row_id, event.source_id, { start: toIsoDate(start_date), end: toIsoDate(last_day < start_date ? start_date : last_day) });
      return;
    }
    // Month cells keep a timed date timed; on the Week/Day grid the all day row clears the time and a slot sets it.
    const keeps_time = mode === "month" ? event.has_time : !isAllDay;
    onChangeEntry(event.row_id, event.source_id, keeps_time ? toIsoDateTime(start_date) : toIsoDate(start_date));
  };

  const handleSelectSlot = (slot_info: SlotInfo) => {
    if (!onAddItem) return;
    const start = new Date(slot_info.start);
    const end = new Date(slot_info.end);
    const is_all_day = start.getHours() === 0 && start.getMinutes() === 0 && end.getTime() - start.getTime() >= DAY_MS;
    onAddItem(is_all_day ? toIsoDate(start) : toIsoDateTime(start));
  };

  const handleSelectEvent = (event: CalendarEventItem) => {
    const row = rows_by_id.get(event.row_id);
    if (row) onSelectEvent?.(row);
  };

  const handleExport = () => {
    const file = new Blob([buildIcsFile(events, title)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.trim().replace(/[^\w-]+/g, "_") || "calendar"}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const hidden_group_ids = config.hidden_group_ids ?? [];

  return (
    <div ref={root_ref} className="board-calendar" style={{ height: calendar_height }}>
      <CalendarToolbar
        title={title}
        range_label={formatRangeLabel(date, mode, week_starts_on)}
        mode={mode}
        onModeChange={changeMode}
        onNavigate={navigate}
        is_filter_active={hidden_group_ids.length > 0}
        filter_panel={
          <CalendarFilterPanel
            groups={groups}
            hidden_group_ids={hidden_group_ids}
            onChange={onConfigChange ? (next_ids) => onConfigChange({ ...config, hidden_group_ids: next_ids.length ? next_ids : null }) : undefined}
          />
        }
        onOpenSettings={setSettingsAnchorEl}
        onExport={handleExport}
      />

      <div className="board-calendar__body" data-mode={mode}>
        <CalendarCellContext.Provider value={cell_context_value}>
          <DnDCalendar
            localizer={localizer}
            culture="en-US"
            events={events}
            date={date}
            onNavigate={setDate}
            view={mode as View}
            onView={(next_view) => isCalendarMode(next_view) && changeMode(next_view)}
            views={["month", "week", "day"]}
            toolbar={false}
            popup
            step={30}
            timeslots={2}
            scrollToTime={SCROLL_TO_TIME}
            showMultiDayTimes
            selectable={Boolean(onAddItem) && mode !== "month"}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            onDrillDown={(drill_date) => {
              setDate(drill_date);
              changeMode("day");
            }}
            onEventDrop={handleEventChange}
            onEventResize={handleEventChange}
            resizable={Boolean(onChangeEntry)}
            draggableAccessor={() => Boolean(onChangeEntry)}
            resizableAccessor={(event) => event.kind === "timeline"}
            tooltipAccessor={(event) => event.title}
            eventPropGetter={eventPropGetter}
            formats={{
              weekdayFormat: "EEE",
              timeGutterFormat: "h a",
              eventTimeRangeFormat: () => "",
            }}
            messages={{ showMore: (count: number) => `+${count} more` }}
            components={{
              event: EventContent,
              dateCellWrapper: DateCellWrapper,
              month: { dateHeader: MonthDateHeader },
              week: { header: TimeGridHeader },
              day: { header: TimeGridHeader },
            }}
          />
        </CalendarCellContext.Provider>
      </div>

      <BoardPopover anchor_el={settings_anchor_el} is_open={settings_anchor_el !== null} onClose={() => setSettingsAnchorEl(null)} width={300} unstyled>
        <CalendarSettingsPanel
          config={config}
          date_sources={date_sources}
          active_source_ids={active_source_ids}
          color_sources={color_sources}
          active_color_by={active_color_by}
          onChange={onConfigChange}
        />
      </BoardPopover>
    </div>
  );
}

export default BoardCalendar;
