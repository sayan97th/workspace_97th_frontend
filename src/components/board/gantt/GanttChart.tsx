"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRightIcon } from "@/icons/workspace-icons";
import AnchoredMenu from "@/components/ui/dropdown/AnchoredMenu";
import type { BoardGroup } from "../types";
import {
  GANTT_SCALES,
  buildGanttHeader,
  addDaysLocal,
  diffDaysLocal,
  getGanttScale,
  parseIsoDate,
  resolveGanttRange,
  toIsoDate,
  type GanttScale,
} from "./ganttDate";
import {
  GANTT_BAR_HEIGHT,
  GANTT_COLORS,
  GANTT_DRAG_THRESHOLD,
  GANTT_GROUP_HEADER_HEIGHT,
  GANTT_HANDLE_WIDTH,
  GANTT_HEADER_ROW_HEIGHT,
  GANTT_LABEL_WIDTH,
  GANTT_MILESTONE_SIZE,
  GANTT_ROW_HEIGHT,
} from "./ganttDesign";

export type GanttRange = {
  /** `YYYY-MM-DD`. */
  start: string;
  /** `YYYY-MM-DD`. Defaults to `start` (a single-day / milestone row) when omitted. */
  end?: string | null;
};

type DragMode = "move" | "resize-start" | "resize-end";

type DragSession = {
  row_id: string;
  mode: DragMode;
  start_x: number;
  orig_start: Date;
  orig_end: Date;
  moved: boolean;
};

type DragPreview = { row_id: string; start: Date; end: Date };

export type GanttChartProps<TRow> = {
  groups: BoardGroup<TRow>[];
  getRowId: (row: TRow) => string;
  /** Resolves a row's date-column value(s) into the range it occupies — return `null` to leave the row off the timeline (no start date set yet). */
  getRowRange: (row: TRow) => GanttRange | null;
  /** Bar/milestone color — e.g. the row's status option color. Defaults to brand blue, mirroring `BoardCalendar`. */
  getRowColor?: (row: TRow) => string;
  /** Rich content for the left panel's row cell (name, date range, …) — mirrors `BoardTable`'s `renderCell`. */
  renderRowLabel: (row: TRow) => React.ReactNode;
  /** Short plain-text label drawn inside (or, for a milestone, beside) the bar itself. */
  getBarLabel?: (row: TRow) => string;
  onRowClick?: (row: TRow) => void;
  selectedRowId?: string | null;
  /** Fired when a bar is dragged to a new position or resized to a new range — the new `YYYY-MM-DD` start/end it now occupies. */
  onDateChange?: (row_id: string, new_start: string, new_end: string) => void;
  /** Whether a bar's start/end can be dragged independently via edge handles — offer this only when the caller actually has an end-date column to persist it to. */
  resizable?: boolean;
  /** This row's predecessor row ids (Finish-to-Start: this row can't start before every one of these finishes) — draws arrows from each predecessor's bar and, on drag, auto-reschedules violated successors. Omit to render without dependency arrows. */
  getDependencyIds?: (row: TRow) => string[];
  /**
   * Fired after a drag/resize also pushes one or more dependent rows forward
   * to keep every Finish-to-Start constraint satisfied — batched separately
   * from `onDateChange`'s own single dragged-row write so the caller can
   * tell "the row I dragged" apart from "rows that moved as a side effect".
   */
  onCascadeReschedule?: (updates: { row_id: string; start: string; end: string }[]) => void;
};

const DEFAULT_BAR_COLOR = "#579bfc";

/** Minimum horizontal run before an elbow arrow turns, in px — keeps the stub off the bar's rounded end. */
const ARROW_STUB = 14;

/**
 * A right-angle ("elbow") connector from a predecessor bar's right edge to a
 * successor bar's left edge, matching monday.com's own dependency-arrow
 * style — a short stub out of the predecessor, a vertical run to the
 * successor's row, then into its left edge. When the successor doesn't
 * actually sit to the right (e.g. mid-drag, before the cascade catches up),
 * routes further right and back instead of drawing backwards through the
 * bars it's connecting.
 */
const buildElbowArrowPath = (start_x: number, start_y: number, end_x: number, end_y: number): string => {
  if (end_x >= start_x + ARROW_STUB) {
    const bend_x = (start_x + ARROW_STUB + end_x) / 2;
    return `M ${start_x} ${start_y} H ${bend_x} V ${end_y} H ${end_x}`;
  }
  const around_x = Math.max(start_x, end_x) + ARROW_STUB * 1.5;
  return `M ${start_x} ${start_y} H ${around_x} V ${end_y} H ${end_x}`;
};

/**
 * Monday-style Gantt: a fixed left panel of grouped rows (visually identical
 * to `BoardTable`'s own groups — same accent-colored headers, same row
 * shell) beside a horizontally-scrolling date-scaled timeline of colored
 * bars / milestone diamonds. No timeline library — see the Gantt view plan
 * for why (`gantt-task-react` is abandoned and fights this project's React
 * 19; `frappe-gantt` has no left-panel/grouped-section concept to build on).
 * Drag-to-move and drag-to-resize are plain pointer events; both just
 * resolve to a `YYYY-MM-DD` pair handed to `onDateChange`, the same "a row's
 * position *is* its cell value" idea `BoardKanban`/`BoardCalendar` use for
 * their own drag interactions.
 */
function GanttChart<TRow>({
  groups,
  getRowId,
  getRowRange,
  getRowColor,
  renderRowLabel,
  getBarLabel,
  onRowClick,
  selectedRowId = null,
  onDateChange,
  resizable = false,
  getDependencyIds,
  onCascadeReschedule,
}: GanttChartProps<TRow>) {
  const [scale, setScale] = useState<GanttScale>("week");
  const [collapsed_group_ids, setCollapsedGroupIds] = useState<Record<string, boolean>>({});
  const [is_scale_menu_open, setIsScaleMenuOpen] = useState(false);
  const scale_button_ref = useRef<HTMLButtonElement | null>(null);
  const scroll_container_ref = useRef<HTMLDivElement | null>(null);
  const has_scrolled_to_today_ref = useRef(false);

  const [drag_preview, setDragPreview] = useState<DragPreview | null>(null);
  // Mirrors `drag_preview` synchronously so `handleUp` can read the latest
  // dragged-to position without a stale closure (the pointer listeners are
  // only re-subscribed when `is_dragging` toggles, not on every
  // `drag_preview` update) — and without reaching for the `setDragPreview`
  // functional-updater form, which would call `onDateChange` (a parent
  // setState) from inside a state-updater function; React runs updaters
  // during its own render bookkeeping, so a side effect in one there was
  // logging "Cannot update a component while rendering a different
  // component" whenever a drag actually changed a row's dates.
  const drag_preview_ref = useRef<DragPreview | null>(null);
  const [is_dragging, setIsDragging] = useState(false);
  const drag_ref = useRef<DragSession | null>(null);
  const just_dragged_ref = useRef(false);

  const day_width = getGanttScale(scale).day_width;

  const all_rows = useMemo(() => groups.flatMap((group) => group.rows), [groups]);

  const range = useMemo(() => {
    const dates: Date[] = [];
    for (const row of all_rows) {
      const raw = getRowRange(row);
      if (!raw) continue;
      const start = parseIsoDate(raw.start);
      if (start) dates.push(start);
      const end = raw.end ? parseIsoDate(raw.end) : null;
      if (end) dates.push(end);
    }
    return resolveGanttRange(dates, scale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all_rows, getRowRange, scale]);

  const header = useMemo(() => buildGanttHeader(range.start, range.end, scale), [range, scale]);
  const total_days = diffDaysLocal(range.start, range.end) + 1;
  const total_width = total_days * day_width;
  const header_height = GANTT_HEADER_ROW_HEIGHT * 2;

  const body_height = useMemo(
    () =>
      groups.reduce(
        (sum, group) =>
          sum + GANTT_GROUP_HEADER_HEIGHT + (collapsed_group_ids[group.id] ? 0 : group.rows.length * GANTT_ROW_HEIGHT),
        0
      ),
    [groups, collapsed_group_ids]
  );

  const { minor_lines, major_lines } = useMemo(() => {
    const build = (segments: { days: number }[]) => {
      let offset = 0;
      const lines: number[] = [];
      for (const segment of segments) {
        offset += segment.days * day_width;
        lines.push(offset);
      }
      lines.pop();
      return lines;
    };
    return { minor_lines: build(header.minor), major_lines: build(header.major) };
  }, [header, day_width]);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const today_offset = diffDaysLocal(range.start, today) * day_width;

  const rows_by_id = useMemo(() => {
    const map = new Map<string, TRow>();
    for (const row of all_rows) map.set(getRowId(row), row);
    return map;
  }, [all_rows, getRowId]);

  /** predecessor row id → its successor row ids (the reverse of each row's own `getDependencyIds`). */
  const successors_by_id = useMemo(() => {
    const map: Record<string, string[]> = {};
    if (!getDependencyIds) return map;
    for (const row of all_rows) {
      const row_id = getRowId(row);
      for (const dependency_id of getDependencyIds(row)) {
        (map[dependency_id] ??= []).push(row_id);
      }
    }
    return map;
  }, [all_rows, getDependencyIds, getRowId]);

  /** Vertical center of each *visible* row's bar, in the same coordinate space as the grid-line/arrow overlays (origin at the body's top, i.e. just below the header). Rows in a collapsed group are absent. */
  const row_center_y = useMemo(() => {
    const map: Record<string, number> = {};
    let offset = 0;
    for (const group of groups) {
      offset += GANTT_GROUP_HEADER_HEIGHT;
      if (collapsed_group_ids[group.id]) continue;
      for (const row of group.rows) {
        map[getRowId(row)] = offset + GANTT_ROW_HEIGHT / 2;
        offset += GANTT_ROW_HEIGHT;
      }
    }
    return map;
  }, [groups, collapsed_group_ids, getRowId]);

  const toggleGroup = (id: string) => setCollapsedGroupIds((current) => ({ ...current, [id]: !current[id] }));

  const scrollToToday = () => {
    const container = scroll_container_ref.current;
    if (!container) return;
    container.scrollLeft = Math.max(0, GANTT_LABEL_WIDTH + today_offset - container.clientWidth / 2);
  };

  // Center the timeline on "today" once, the first time it renders.
  useEffect(() => {
    if (has_scrolled_to_today_ref.current) return;
    has_scrolled_to_today_ref.current = true;
    scrollToToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getGeometry = (row: TRow) => {
    const row_id = getRowId(row);
    let start: Date;
    let end: Date;
    if (drag_preview && drag_preview.row_id === row_id) {
      start = drag_preview.start;
      end = drag_preview.end;
    } else {
      const raw = getRowRange(row);
      if (!raw) return null;
      const parsed_start = parseIsoDate(raw.start);
      if (!parsed_start) return null;
      const parsed_end = raw.end ? parseIsoDate(raw.end) : null;
      start = parsed_start;
      end = parsed_end && parsed_end >= parsed_start ? parsed_end : parsed_start;
    }
    const is_milestone = diffDaysLocal(start, end) === 0;
    const left = diffDaysLocal(range.start, start) * day_width;
    const width = (diffDaysLocal(start, end) + 1) * day_width;
    return { start, end, is_milestone, left, width };
  };

  /**
   * Finish-to-Start auto-reschedule: after `dragged_row_id` settles on
   * `dragged_end`, walks every row reachable from it through
   * `successors_by_id` and pushes forward any successor whose start now
   * falls on or before that end date, preserving each pushed row's own
   * duration. Visits the reachable subgraph in topological order (a
   * successor is only finalized once every one of its *reachable*
   * predecessors has been processed) so a row with two predecessors ends up
   * shifted by whichever one demands the later start — a plain
   * visited-once BFS would instead freeze it at the first predecessor it
   * happened to reach.
   */
  const computeCascade = (
    dragged_row_id: string,
    dragged_end: Date
  ): { row_id: string; start: Date; end: Date }[] => {
    const effective_start = new Map<string, Date>();
    const effective_end = new Map<string, Date>();
    effective_end.set(dragged_row_id, dragged_end);

    const reachable = new Set<string>();
    const collect = (id: string) => {
      for (const successor_id of successors_by_id[id] ?? []) {
        if (reachable.has(successor_id)) continue;
        reachable.add(successor_id);
        collect(successor_id);
      }
    };
    collect(dragged_row_id);
    if (reachable.size === 0) return [];

    const remaining_predecessors = new Map<string, number>();
    for (const id of reachable) remaining_predecessors.set(id, 0);
    for (const id of [dragged_row_id, ...reachable]) {
      for (const successor_id of successors_by_id[id] ?? []) {
        if (reachable.has(successor_id)) {
          remaining_predecessors.set(successor_id, (remaining_predecessors.get(successor_id) ?? 0) + 1);
        }
      }
    }

    const queue: string[] = [dragged_row_id];
    while (queue.length > 0) {
      const predecessor_id = queue.shift() as string;
      const predecessor_end = effective_end.get(predecessor_id);
      if (!predecessor_end) continue;

      for (const successor_id of successors_by_id[predecessor_id] ?? []) {
        if (!reachable.has(successor_id)) continue;
        const successor_row = rows_by_id.get(successor_id);
        const raw = successor_row ? getRowRange(successor_row) : null;
        const original_start = raw ? parseIsoDate(raw.start) : null;
        if (original_start) {
          const original_end_raw = raw?.end ? parseIsoDate(raw.end) : original_start;
          const original_end = original_end_raw && original_end_raw >= original_start ? original_end_raw : original_start;
          const current_start = effective_start.get(successor_id) ?? original_start;
          const current_end = effective_end.get(successor_id) ?? original_end;
          const min_start = addDaysLocal(predecessor_end, 1);
          if (min_start > current_start) {
            const duration = diffDaysLocal(current_start, current_end);
            effective_start.set(successor_id, min_start);
            effective_end.set(successor_id, addDaysLocal(min_start, duration));
          } else {
            effective_start.set(successor_id, current_start);
            effective_end.set(successor_id, current_end);
          }
        }

        const left = (remaining_predecessors.get(successor_id) ?? 1) - 1;
        remaining_predecessors.set(successor_id, left);
        if (left <= 0) queue.push(successor_id);
      }
    }

    const updates: { row_id: string; start: Date; end: Date }[] = [];
    for (const id of reachable) {
      const row = rows_by_id.get(id);
      const raw = row ? getRowRange(row) : null;
      const original_start = raw ? parseIsoDate(raw.start) : null;
      const new_start = effective_start.get(id);
      const new_end = effective_end.get(id);
      if (original_start && new_start && new_end && diffDaysLocal(original_start, new_start) !== 0) {
        updates.push({ row_id: id, start: new_start, end: new_end });
      }
    }
    return updates;
  };

  /** One elbow path per dependency edge whose both ends are currently visible (neither bar's group is collapsed). */
  const dependency_arrows = useMemo(() => {
    if (!getDependencyIds) return [];
    const arrows: { key: string; path: string }[] = [];
    for (const row of all_rows) {
      const successor_id = getRowId(row);
      const successor_y = row_center_y[successor_id];
      if (successor_y === undefined) continue;
      const successor_geometry = getGeometry(row);
      if (!successor_geometry) continue;

      for (const predecessor_id of getDependencyIds(row)) {
        const predecessor_y = row_center_y[predecessor_id];
        const predecessor_row = rows_by_id.get(predecessor_id);
        if (predecessor_y === undefined || !predecessor_row) continue;
        const predecessor_geometry = getGeometry(predecessor_row);
        if (!predecessor_geometry) continue;

        const start_x = predecessor_geometry.is_milestone
          ? predecessor_geometry.left + day_width / 2 + GANTT_MILESTONE_SIZE / 2
          : predecessor_geometry.left + 2 + Math.max(predecessor_geometry.width - 4, 8);
        const end_x = successor_geometry.is_milestone
          ? successor_geometry.left + day_width / 2 - GANTT_MILESTONE_SIZE / 2
          : successor_geometry.left + 2;

        arrows.push({
          key: `${predecessor_id}->${successor_id}`,
          path: buildElbowArrowPath(start_x, predecessor_y, end_x, successor_y),
        });
      }
    }
    return arrows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all_rows, getDependencyIds, row_center_y, rows_by_id, drag_preview, range, day_width, getRowRange]);

  const startDrag = (row: TRow, mode: DragMode, event: React.PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    const geometry = getGeometry(row);
    if (!geometry) return;
    drag_ref.current = {
      row_id: getRowId(row),
      mode,
      start_x: event.clientX,
      orig_start: geometry.start,
      orig_end: geometry.end,
      moved: false,
    };
    setIsDragging(true);
  };

  useEffect(() => {
    if (!is_dragging) return;

    const handleMove = (event: PointerEvent) => {
      const session = drag_ref.current;
      if (!session) return;
      const delta_x = event.clientX - session.start_x;
      if (Math.abs(delta_x) >= GANTT_DRAG_THRESHOLD) session.moved = true;
      const delta_days = Math.round(delta_x / day_width);

      let next_start = session.orig_start;
      let next_end = session.orig_end;
      if (session.mode === "move") {
        next_start = addDaysLocal(session.orig_start, delta_days);
        next_end = addDaysLocal(session.orig_end, delta_days);
      } else if (session.mode === "resize-start") {
        next_start = addDaysLocal(session.orig_start, delta_days);
        if (next_start > session.orig_end) next_start = session.orig_end;
      } else {
        next_end = addDaysLocal(session.orig_end, delta_days);
        if (next_end < session.orig_start) next_end = session.orig_start;
      }
      const next_preview = { row_id: session.row_id, start: next_start, end: next_end };
      drag_preview_ref.current = next_preview;
      setDragPreview(next_preview);
    };

    const handleUp = () => {
      const session = drag_ref.current;
      const preview = drag_preview_ref.current;
      drag_ref.current = null;
      drag_preview_ref.current = null;
      setIsDragging(false);
      setDragPreview(null);
      if (session?.moved && preview && preview.row_id === session.row_id) {
        just_dragged_ref.current = true;
        onDateChange?.(session.row_id, toIsoDate(preview.start), toIsoDate(preview.end));
        const cascade = computeCascade(session.row_id, preview.end);
        if (cascade.length > 0) {
          onCascadeReschedule?.(cascade.map((update) => ({
            row_id: update.row_id,
            start: toIsoDate(update.start),
            end: toIsoDate(update.end),
          })));
        }
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is_dragging, day_width, onDateChange, onCascadeReschedule, successors_by_id, rows_by_id, getRowRange]);

  const handleRowActivate = (row: TRow) => {
    if (just_dragged_ref.current) {
      just_dragged_ref.current = false;
      return;
    }
    onRowClick?.(row);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={scrollToToday}
          className="rounded-[7px] border border-shell-border px-2.5 py-1.5 text-[12.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover"
        >
          Today
        </button>
        <button
          ref={scale_button_ref}
          type="button"
          onClick={() => setIsScaleMenuOpen(true)}
          className="flex items-center gap-1.5 rounded-[7px] border border-shell-border px-2.5 py-1.5 text-[12.5px] font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover"
        >
          {getGanttScale(scale).label}
          <ChevronRightIcon className="rotate-90" size={10} />
        </button>
        <AnchoredMenu
          anchor_el={scale_button_ref.current}
          is_open={is_scale_menu_open}
          onClose={() => setIsScaleMenuOpen(false)}
          width={140}
          items={GANTT_SCALES.map((option) => ({
            key: option.id,
            label: option.label,
            icon: null,
            onClick: () => setScale(option.id),
          }))}
        />
      </div>

      <div ref={scroll_container_ref} className="shell-scrollbar overflow-x-auto rounded-[10px] border border-shell-border">
        <div className="relative" style={{ width: GANTT_LABEL_WIDTH + total_width, minWidth: "100%" }}>
          {/* Grid lines + today line — one shared overlay behind the bars, instead of redrawing per row. */}
          <div
            className="pointer-events-none absolute"
            style={{ left: GANTT_LABEL_WIDTH, top: header_height, width: total_width, height: body_height }}
          >
            {minor_lines.map((x) => (
              <div key={`minor-${x}`} className="absolute top-0 bottom-0" style={{ left: x, width: 1, background: GANTT_COLORS.grid_line }} />
            ))}
            {major_lines.map((x) => (
              <div key={`major-${x}`} className="absolute top-0 bottom-0" style={{ left: x, width: 1, background: GANTT_COLORS.grid_line_strong }} />
            ))}
          </div>
          {dependency_arrows.length > 0 && (
            <svg
              className="pointer-events-none absolute overflow-visible"
              style={{ left: GANTT_LABEL_WIDTH, top: header_height, width: total_width, height: body_height, zIndex: 2 }}
            >
              <defs>
                <marker id="gantt-arrowhead" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
                  <path d="M0,0 L7,3.5 L0,7 Z" fill={GANTT_COLORS.dependency_arrow} />
                </marker>
              </defs>
              {dependency_arrows.map((arrow) => (
                <path
                  key={arrow.key}
                  d={arrow.path}
                  fill="none"
                  stroke={GANTT_COLORS.dependency_arrow}
                  strokeWidth={1.5}
                  markerEnd="url(#gantt-arrowhead)"
                />
              ))}
            </svg>
          )}
          <div
            className="pointer-events-none absolute"
            style={{ left: GANTT_LABEL_WIDTH + today_offset, top: 0, width: 2, height: header_height + body_height, background: GANTT_COLORS.today_line, zIndex: 4 }}
          />

          {/* Header */}
          <div className="flex" style={{ height: header_height }}>
            <div
              className="flex-none border-b border-r border-shell-border"
              style={{ width: GANTT_LABEL_WIDTH, position: "sticky", left: 0, zIndex: 6, background: GANTT_COLORS.header_bg }}
            />
            <div style={{ width: total_width }} className="flex-none">
              <div className="flex border-b border-shell-border" style={{ height: GANTT_HEADER_ROW_HEIGHT, background: GANTT_COLORS.header_bg }}>
                {header.major.map((segment) => (
                  <div
                    key={segment.key}
                    style={{ width: segment.days * day_width }}
                    className="flex flex-none items-center justify-center truncate border-r border-shell-border px-1 text-[12px] font-semibold text-shell-text"
                  >
                    {segment.label}
                  </div>
                ))}
              </div>
              <div className="flex border-b border-shell-border" style={{ height: GANTT_HEADER_ROW_HEIGHT, background: GANTT_COLORS.header_bg }}>
                {header.minor.map((segment) => (
                  <div
                    key={segment.key}
                    style={{ width: segment.days * day_width }}
                    className="flex flex-none items-center justify-center truncate border-r border-shell-border px-0.5 text-[11px] text-shell-text-muted"
                  >
                    {segment.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Groups + rows */}
          {groups.map((group) => {
            const is_collapsed = Boolean(collapsed_group_ids[group.id]);
            return (
              <React.Fragment key={group.id}>
                <div className="flex" style={{ height: GANTT_GROUP_HEADER_HEIGHT }}>
                  <div
                    className="flex flex-none items-center gap-1.5 border-b border-shell-border px-2"
                    style={{ width: GANTT_LABEL_WIDTH, position: "sticky", left: 0, zIndex: 5, background: GANTT_COLORS.panel_bg }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className="flex h-5 w-5 flex-none items-center justify-center rounded-md transition-transform duration-150"
                      style={{ color: group.accent_color, transform: is_collapsed ? "rotate(0deg)" : "rotate(90deg)" }}
                      aria-label={`Toggle ${group.name}`}
                    >
                      <ChevronRightIcon size={11} />
                    </button>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold" style={{ color: group.accent_color }}>
                      {group.name}
                    </span>
                    <span className="flex-none text-[11px] font-semibold text-shell-text-faint">{group.rows.length}</span>
                  </div>
                  <div
                    className="flex-none border-b border-shell-border"
                    style={{ width: total_width, background: `color-mix(in srgb, ${group.accent_color} 8%, transparent)` }}
                  />
                </div>

                {!is_collapsed &&
                  group.rows.map((row) => {
                    const row_id = getRowId(row);
                    const geometry = getGeometry(row);
                    const color = getRowColor?.(row) ?? DEFAULT_BAR_COLOR;
                    const is_selected = selectedRowId === row_id;
                    const bar_label = getBarLabel?.(row);
                    const row_bg = is_selected ? GANTT_COLORS.row_selected : undefined;

                    return (
                      <div
                        key={row_id}
                        className="flex"
                        style={{ height: GANTT_ROW_HEIGHT, background: row_bg }}
                        onClick={() => handleRowActivate(row)}
                      >
                        <div
                          className={`flex flex-none items-center border-b border-shell-border px-2 ${onRowClick ? "cursor-pointer" : ""}`}
                          style={{
                            width: GANTT_LABEL_WIDTH,
                            position: "sticky",
                            left: 0,
                            zIndex: 5,
                            background: row_bg ?? GANTT_COLORS.panel_bg,
                            borderLeft: `3px solid ${group.accent_color}`,
                          }}
                        >
                          {renderRowLabel(row)}
                        </div>
                        <div className="relative flex-none border-b border-shell-border" style={{ width: total_width }}>
                          {!geometry && onDateChange && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onDateChange(row_id, toIsoDate(today), toIsoDate(addDaysLocal(today, 2)));
                              }}
                              className="absolute flex items-center gap-1 rounded-full border border-dashed px-2.5 text-[11px] font-medium transition-colors hover:bg-shell-hover hover:text-shell-text"
                              style={{
                                left: today_offset + 4,
                                top: (GANTT_ROW_HEIGHT - GANTT_BAR_HEIGHT) / 2,
                                height: GANTT_BAR_HEIGHT,
                                borderColor: GANTT_COLORS.border_strong,
                                color: GANTT_COLORS.text_faint,
                              }}
                            >
                              + Set dates
                            </button>
                          )}
                          {geometry &&
                            (geometry.is_milestone ? (
                              <>
                                <div
                                  onPointerDown={(event) => startDrag(row, "move", event)}
                                  className="absolute cursor-grab active:cursor-grabbing"
                                  style={{
                                    left: geometry.left + day_width / 2 - GANTT_MILESTONE_SIZE / 2,
                                    top: (GANTT_ROW_HEIGHT - GANTT_MILESTONE_SIZE) / 2,
                                    width: GANTT_MILESTONE_SIZE,
                                    height: GANTT_MILESTONE_SIZE,
                                    background: color,
                                    borderRadius: 3,
                                    transform: "rotate(45deg)",
                                    boxShadow: "0 1px 2px rgba(10,23,23,0.18)",
                                  }}
                                  title={bar_label}
                                />
                                {bar_label && (
                                  <span
                                    className="absolute truncate text-[11.5px] font-medium text-shell-text"
                                    style={{
                                      left: geometry.left + day_width / 2 + GANTT_MILESTONE_SIZE / 2 + 6,
                                      top: (GANTT_ROW_HEIGHT - 16) / 2,
                                      maxWidth: total_width - geometry.left - day_width,
                                      lineHeight: "16px",
                                    }}
                                  >
                                    {bar_label}
                                  </span>
                                )}
                              </>
                            ) : (
                              <div
                                onPointerDown={(event) => startDrag(row, "move", event)}
                                className="absolute flex items-center overflow-hidden rounded-full text-[11.5px] font-semibold text-white shadow-sm cursor-grab active:cursor-grabbing"
                                style={{
                                  left: geometry.left + 2,
                                  top: (GANTT_ROW_HEIGHT - GANTT_BAR_HEIGHT) / 2,
                                  width: Math.max(geometry.width - 4, 8),
                                  height: GANTT_BAR_HEIGHT,
                                  background: color,
                                }}
                              >
                                {resizable && (
                                  <div
                                    onPointerDown={(event) => {
                                      event.stopPropagation();
                                      startDrag(row, "resize-start", event);
                                    }}
                                    className="absolute inset-y-0 left-0 cursor-ew-resize"
                                    style={{ width: GANTT_HANDLE_WIDTH }}
                                  />
                                )}
                                {bar_label && <span className="min-w-0 flex-1 truncate px-2.5">{bar_label}</span>}
                                {resizable && (
                                  <div
                                    onPointerDown={(event) => {
                                      event.stopPropagation();
                                      startDrag(row, "resize-end", event);
                                    }}
                                    className="absolute inset-y-0 right-0 cursor-ew-resize"
                                    style={{ width: GANTT_HANDLE_WIDTH }}
                                  />
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default GanttChart;
