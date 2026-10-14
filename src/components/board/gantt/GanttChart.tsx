"use client";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import ActionMenu, { type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  DeleteIcon,
  LinkIcon,
  MoreDotsIcon,
  OpenInOverlayIcon,
} from "@/icons/workspace-icons";
import { DependencyPickerList } from "../cells/BoardValueCell";
import type { BoardCellItemOption } from "../cells/BoardValueCell";
import type { BoardGroup } from "../types";
import "./board-gantt.css";
import GanttToolbar from "./GanttToolbar";
import { GanttBaselinePanel, GanttFilterPanel, GanttSettingsPanel } from "./GanttPanels";
import { computeCriticalPath } from "./ganttCriticalPath";
import {
  GANTT_BASELINE_COLOR,
  GANTT_CRITICAL_COLOR,
  getBaselineItems,
  type BoardGanttColorBy,
  type BoardGanttConfig,
  type GanttColorSource,
  type GanttDateSource,
  type GanttGroupOption,
  type GanttLegendItem,
} from "./ganttConfig";
import {
  GANTT_SCALES,
  GANTT_ZOOM_LEVELS,
  addDaysLocal,
  buildGanttHeader,
  diffDaysLocal,
  formatGanttDuration,
  formatGanttRange,
  formatGanttRangeCompact,
  getGanttScale,
  isGanttScale,
  parseIsoDate,
  resolveGanttRange,
  startOfLocalDay,
  toIsoDate,
  type GanttHeaderSegment,
  type GanttScale,
} from "./ganttDate";
import {
  GANTT_BAR_HEIGHT,
  GANTT_BASELINE_HEIGHT,
  GANTT_BOTTOM_GAP,
  GANTT_DRAG_THRESHOLD,
  GANTT_GROUP_HEADER_HEIGHT,
  GANTT_HANDLE_WIDTH,
  GANTT_HEADER_ROW_HEIGHT,
  GANTT_MIN_BAR_WIDTH,
  GANTT_MIN_HEIGHT,
  GANTT_PANEL_MAX_WIDTH,
  GANTT_PANEL_MIN_WIDTH,
  GANTT_PANEL_WIDTH,
  GANTT_ROW_HEIGHT,
} from "./ganttDesign";

export type GanttRange = {
  /** `YYYY-MM-DD`. */
  start: string;
  /** `YYYY-MM-DD`. Defaults to `start` (a single day) when omitted. */
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

/** A dependency being drawn from a bar's connector dot, in timeline coordinates. */
type LinkDrag = { from_row_id: string; from_x: number; from_y: number; x: number; y: number };

type BarGeometry = { start: Date; end: Date; left: number; width: number };

/** Viewer only layout, kept in localStorage per board view. */
type GanttViewPrefs = {
  scale: GanttScale;
  zoom_index: number;
  panel_width: number;
  is_panel_collapsed: boolean;
  collapsed_group_ids: string[];
};

const DEFAULT_ZOOM_INDEX = GANTT_ZOOM_LEVELS.indexOf(1);

const DEFAULT_PREFS: GanttViewPrefs = {
  scale: "week",
  zoom_index: DEFAULT_ZOOM_INDEX,
  panel_width: GANTT_PANEL_WIDTH,
  is_panel_collapsed: false,
  collapsed_group_ids: [],
};

const clampPanelWidth = (width: number): number => Math.min(GANTT_PANEL_MAX_WIDTH, Math.max(GANTT_PANEL_MIN_WIDTH, Math.round(width)));

const readStoredPrefs = (storage_key: string): GanttViewPrefs => {
  try {
    const stored = JSON.parse(localStorage.getItem(`board_gantt_view:${storage_key}`) ?? "null") as Partial<GanttViewPrefs> | null;
    if (!stored || typeof stored !== "object") return DEFAULT_PREFS;
    return {
      scale: isGanttScale(stored.scale) ? stored.scale : DEFAULT_PREFS.scale,
      zoom_index:
        typeof stored.zoom_index === "number" && stored.zoom_index >= 0 && stored.zoom_index < GANTT_ZOOM_LEVELS.length
          ? stored.zoom_index
          : DEFAULT_ZOOM_INDEX,
      panel_width: typeof stored.panel_width === "number" ? clampPanelWidth(stored.panel_width) : GANTT_PANEL_WIDTH,
      is_panel_collapsed: stored.is_panel_collapsed === true,
      collapsed_group_ids: Array.isArray(stored.collapsed_group_ids) ? stored.collapsed_group_ids.map(String) : [],
    };
  } catch {
    return DEFAULT_PREFS;
  }
};

/** Minimum horizontal run before an elbow arrow turns, in px, keeps the stub off the bar's rounded end. */
const ARROW_STUB = 12;

/**
 * A right angle ("elbow") connector from a predecessor bar's right edge to a
 * successor bar's left edge, matching monday.com's dependency arrows. When
 * the successor doesn't sit to the right (mid drag, or a broken constraint),
 * it routes around instead of drawing backwards through the bars.
 */
const buildElbowArrowPath = (start_x: number, start_y: number, end_x: number, end_y: number): string => {
  if (end_x >= start_x + ARROW_STUB * 2) {
    const bend_x = start_x + ARROW_STUB;
    return `M ${start_x} ${start_y} H ${bend_x} V ${end_y} H ${end_x}`;
  }
  const mid_y = start_y + (end_y - start_y) / 2;
  return `M ${start_x} ${start_y} H ${start_x + ARROW_STUB} V ${mid_y} H ${end_x - ARROW_STUB} V ${end_y} H ${end_x}`;
};

/** Gap kept between bars of back to back days, so one day items read as separate blocks like monday.com's. */
const getBarGap = (day_width: number): number => Math.min(8, day_width * 0.25);

/** Arrow up over arrow down, monday.com's "collapse all groups" toggle. */
const CollapseAllIcon: React.FC<{ is_collapsed: boolean }> = ({ is_collapsed }) => (
  <svg width={12} height={12} viewBox="0 0 12 12" fill="none" aria-hidden>
    {is_collapsed ? (
      <>
        <path d="M3.5 4.5 6 2l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.5 7.5 6 10l2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ) : (
      <>
        <path d="M3.5 2 6 4.5 8.5 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3.5 10 6 7.5 8.5 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </>
    )}
  </svg>
);

export type GanttChartProps<TRow> = {
  /** The header title, the view's own name. */
  title: string;
  /** Groups already filtered by the board toolbar and the Gantt's group filter. */
  groups: BoardGroup<TRow>[];
  getRowId: (row: TRow) => string;
  getRowName: (row: TRow) => string;
  /** The range a row occupies, `null` leaves it off the timeline (no date yet). */
  getRowRange: (row: TRow) => GanttRange | null;
  /** Bar color, from the active "Color items by" choice. */
  getRowColor: (row: TRow) => string;
  /** Swatches of the legend under the chart, for the active "Color items by" choice. */
  legend_items: GanttLegendItem[];
  onRowClick?: (row: TRow) => void;
  selectedRowId?: string | null;
  /** A bar was dragged, resized or created on an empty row. Omit to make bars fixed. */
  onDateChange?: (row_id: string, new_start: string, new_end: string) => void;
  /** Clears a row's dates, from the row menu. */
  onRemoveDates?: (row_id: string) => void;
  onDeleteRow?: (row_id: string) => void;
  /** Whether a bar's start and end can be dragged on their own, only with a Timeline source. */
  resizable?: boolean;
  /** This row's predecessor ids (Finish to Start). Omit when the board has no Dependency column. */
  getDependencyIds?: (row: TRow) => string[];
  /** Valid predecessors for the row menu's "Edit dependencies" picker. */
  getDependencyCandidates?: (row: TRow) => BoardCellItemOption[];
  /** Saves a row's full predecessor list. Omit to make dependencies read only. */
  onChangeDependencies?: (row_id: string, predecessor_ids: string[] | null) => void;
  /**
   * Fired after a drag also pushes dependent rows forward to keep every
   * Finish to Start link satisfied, batched apart from `onDateChange` so the
   * caller can tell the dragged row from rows that moved as a side effect.
   * Omit when the server already schedules dependents.
   */
  onCascadeReschedule?: (updates: { row_id: string; start: string; end: string }[]) => void;
  config: BoardGanttConfig;
  /** Omit while the view can't be changed (locked, or no edit rights). */
  onConfigChange?: (next: BoardGanttConfig) => void;
  date_sources: GanttDateSource[];
  active_source_id: string;
  color_sources: GanttColorSource[];
  active_color_by: BoardGanttColorBy;
  /** Every group of the board, for the funnel, including hidden ones. */
  group_options: GanttGroupOption[];
  onAddDependencyColumn?: () => void;
  /** Who saves a baseline, stored with it. */
  current_user_name?: string;
  /** Scopes the viewer's scale, zoom, panel width and collapsed groups, `{board}:{view}`. */
  storage_key: string;
};

/**
 * monday.com style Gantt: a resizable item list of grouped rows beside a
 * date scaled timeline of colored bars, inside a full height card with
 * monday's header (Baseline, Today, Auto Fit, scale, zoom) and a legend.
 *
 * No timeline library: drag to move and resize are plain pointer events
 * that resolve to a `YYYY-MM-DD` pair handed to `onDateChange`, the same
 * "a row's position is its cell value" idea the Kanban and Calendar views
 * use. Dependencies are drawn by dragging a bar's connector dot onto
 * another row.
 */
function GanttChart<TRow>({
  title,
  groups,
  getRowId,
  getRowName,
  getRowRange,
  getRowColor,
  legend_items,
  onRowClick,
  selectedRowId = null,
  onDateChange,
  onRemoveDates,
  onDeleteRow,
  resizable = false,
  getDependencyIds,
  getDependencyCandidates,
  onChangeDependencies,
  onCascadeReschedule,
  config,
  onConfigChange,
  date_sources,
  active_source_id,
  color_sources,
  active_color_by,
  group_options,
  onAddDependencyColumn,
  current_user_name,
  storage_key,
}: GanttChartProps<TRow>) {
  const root_ref = useRef<HTMLDivElement | null>(null);
  const scroller_ref = useRef<HTMLDivElement | null>(null);
  const content_ref = useRef<HTMLDivElement | null>(null);
  const track_layer_ref = useRef<HTMLDivElement | null>(null);

  const [prefs, setPrefs] = useState<GanttViewPrefs>(DEFAULT_PREFS);
  const [chart_height, setChartHeight] = useState(GANTT_MIN_HEIGHT);
  const [viewport, setViewport] = useState({ scroll_left: 0, scroll_top: 0, client_width: 0, client_height: 0 });

  const [drag_preview, setDragPreview] = useState<DragPreview | null>(null);
  // Mirrors `drag_preview` synchronously so the pointer up handler reads the
  // latest position without a stale closure, and without calling the parent
  // (a setState elsewhere) from inside a state updater.
  const drag_preview_ref = useRef<DragPreview | null>(null);
  const [is_dragging, setIsDragging] = useState(false);
  const drag_ref = useRef<DragSession | null>(null);
  const [link_drag, setLinkDrag] = useState<LinkDrag | null>(null);
  // Mirrors `link_drag` so the pointer up handler reads it without a state updater (which may run twice).
  const link_drag_ref = useRef<LinkDrag | null>(null);
  const [is_resizing_panel, setIsResizingPanel] = useState(false);

  const [hovered_row_id, setHoveredRowId] = useState<string | null>(null);
  const [hovered_bar_id, setHoveredBarId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ row_id: string; day: number } | null>(null);
  const [row_menu, setRowMenu] = useState<{ row_id: string; anchor_el: HTMLElement } | null>(null);
  const [dependency_picker, setDependencyPicker] = useState<{ row_id: string; anchor_el: HTMLElement } | null>(null);
  const [arrow_menu, setArrowMenu] = useState<{ predecessor_id: string; successor_id: string; x: number; y: number } | null>(null);
  // State (not a ref) so the menu re-renders once the anchor below mounts.
  const [arrow_anchor_el, setArrowAnchorEl] = useState<HTMLSpanElement | null>(null);
  const [settings_anchor_el, setSettingsAnchorEl] = useState<HTMLElement | null>(null);

  /** The date to keep centered after the scale or zoom changes, applied once the new widths are laid out. */
  const pending_center_ref = useRef<Date | null>(null);
  const has_initial_scroll_ref = useRef(false);

  // ── Viewer prefs ──
  useEffect(() => {
    setPrefs(readStoredPrefs(storage_key));
    has_initial_scroll_ref.current = false;
  }, [storage_key]);

  const updatePrefs = useCallback(
    (patch: Partial<GanttViewPrefs>) => {
      setPrefs((current) => {
        const next = { ...current, ...patch };
        try {
          localStorage.setItem(`board_gantt_view:${storage_key}`, JSON.stringify(next));
        } catch {
          // Storage can be blocked (private mode), the layout then lasts for this visit only.
        }
        return next;
      });
    },
    [storage_key]
  );

  const { scale, zoom_index, is_panel_collapsed } = prefs;
  const panel_width = is_panel_collapsed ? 0 : prefs.panel_width;
  const collapsed_group_ids = useMemo(() => new Set(prefs.collapsed_group_ids), [prefs.collapsed_group_ids]);
  const day_width = getGanttScale(scale).day_width * GANTT_ZOOM_LEVELS[zoom_index];
  const bar_gap = getBarGap(day_width);

  // ── Config flags ──
  const show_group_summary = config.show_group_summary !== false;
  const show_dependencies = Boolean(getDependencyIds) && config.show_dependencies !== false;
  const show_critical_path = Boolean(getDependencyIds) && config.show_critical_path === true;
  const baseline_items = useMemo(() => getBaselineItems(config.baseline), [config.baseline]);
  const show_baseline = Boolean(config.baseline) && config.show_baseline !== false;
  const show_legend = config.show_legend !== false;
  const show_bar_labels = config.bar_label === "name";
  const show_weekends = config.show_weekends !== false && scale === "day" && day_width >= 12;

  // ── Fill the window below the chart's top edge, like monday.com's full height Gantt ──
  useLayoutEffect(() => {
    const measure = () => {
      const top = root_ref.current?.getBoundingClientRect().top ?? 0;
      setChartHeight(Math.max(GANTT_MIN_HEIGHT, Math.floor(window.innerHeight - top - GANTT_BOTTOM_GAP)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // ── Track the scroller's viewport, for the edge arrows, hover card and initial scroll ──
  const syncViewport = useCallback(() => {
    const scroller = scroller_ref.current;
    if (!scroller) return;
    setViewport((current) =>
      current.scroll_left === scroller.scrollLeft &&
      current.scroll_top === scroller.scrollTop &&
      current.client_width === scroller.clientWidth &&
      current.client_height === scroller.clientHeight
        ? current
        : {
            scroll_left: scroller.scrollLeft,
            scroll_top: scroller.scrollTop,
            client_width: scroller.clientWidth,
            client_height: scroller.clientHeight,
          }
    );
  }, []);

  useEffect(() => {
    const scroller = scroller_ref.current;
    if (!scroller) return;
    let frame = 0;
    const handleScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(syncViewport);
    };
    scroller.addEventListener("scroll", handleScroll, { passive: true });
    const observer = new ResizeObserver(syncViewport);
    observer.observe(scroller);
    syncViewport();
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, [syncViewport]);

  const track_viewport_width = Math.max(0, viewport.client_width - panel_width);

  // ── Rows and range ──
  const all_rows = useMemo(() => groups.flatMap((group) => group.rows), [groups]);

  const rows_by_id = useMemo(() => {
    const map = new Map<string, TRow>();
    for (const row of all_rows) map.set(getRowId(row), row);
    return map;
  }, [all_rows, getRowId]);

  /** Each row's saved range as local dates, the end never before the start. */
  const parseRange = useCallback(
    (row: TRow): { start: Date; end: Date } | null => {
      const raw = getRowRange(row);
      if (!raw) return null;
      const start = parseIsoDate(raw.start);
      if (!start) return null;
      const end = raw.end ? parseIsoDate(raw.end) : null;
      return { start, end: end && end >= start ? end : start };
    },
    [getRowRange]
  );

  const ranges_by_id = useMemo(() => {
    const map = new Map<string, { start: Date; end: Date }>();
    for (const row of all_rows) {
      const range = parseRange(row);
      if (range) map.set(getRowId(row), range);
    }
    return map;
  }, [all_rows, parseRange, getRowId]);

  const baseline_ranges_by_id = useMemo(() => {
    const map = new Map<string, { start: Date; end: Date }>();
    if (!show_baseline) return map;
    for (const [row_id, entry] of Object.entries(baseline_items)) {
      const start = parseIsoDate(entry.start);
      if (!start) continue;
      const end = entry.end ? parseIsoDate(entry.end) : null;
      map.set(row_id, { start, end: end && end >= start ? end : start });
    }
    return map;
  }, [baseline_items, show_baseline]);

  const range = useMemo(() => {
    const dates: Date[] = [];
    for (const item_range of ranges_by_id.values()) dates.push(item_range.start, item_range.end);
    for (const row_id of rows_by_id.keys()) {
      const baseline_range = baseline_ranges_by_id.get(row_id);
      if (baseline_range) dates.push(baseline_range.start, baseline_range.end);
    }
    return resolveGanttRange(dates, scale, track_viewport_width / day_width + 2);
  }, [ranges_by_id, baseline_ranges_by_id, rows_by_id, scale, track_viewport_width, day_width]);

  const header = useMemo(() => buildGanttHeader(range.start, range.end, scale), [range, scale]);
  const total_days = diffDaysLocal(range.start, range.end) + 1;
  const total_width = total_days * day_width;
  const header_height = GANTT_HEADER_ROW_HEIGHT * 2;

  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const today_x = (diffDaysLocal(range.start, today) + 0.5) * day_width;

  /** Top of each visible item row inside the body (below the header). */
  const { row_top_by_id, body_height } = useMemo(() => {
    const row_tops: Record<string, number> = {};
    let offset = 0;
    for (const group of groups) {
      offset += GANTT_GROUP_HEADER_HEIGHT;
      if (collapsed_group_ids.has(group.id)) continue;
      for (const row of group.rows) {
        row_tops[getRowId(row)] = offset;
        offset += GANTT_ROW_HEIGHT;
      }
    }
    return { row_top_by_id: row_tops, body_height: offset };
  }, [groups, collapsed_group_ids, getRowId]);

  const bar_top = show_baseline ? 5 : (GANTT_ROW_HEIGHT - GANTT_BAR_HEIGHT) / 2;
  const baseline_top = bar_top + GANTT_BAR_HEIGHT + 3;

  const toGeometry = useCallback(
    (start: Date, end: Date): BarGeometry => {
      const days = diffDaysLocal(start, end) + 1;
      return {
        start,
        end,
        left: diffDaysLocal(range.start, start) * day_width + bar_gap / 2,
        width: Math.max(GANTT_MIN_BAR_WIDTH, days * day_width - bar_gap),
      };
    },
    [range.start, day_width, bar_gap]
  );

  const getGeometry = useCallback(
    (row_id: string): BarGeometry | null => {
      if (drag_preview && drag_preview.row_id === row_id) return toGeometry(drag_preview.start, drag_preview.end);
      const item_range = ranges_by_id.get(row_id);
      return item_range ? toGeometry(item_range.start, item_range.end) : null;
    },
    [drag_preview, ranges_by_id, toGeometry]
  );

  // ── Dependencies ──
  /** predecessor id to its successor ids, the reverse of each row's own `getDependencyIds`. */
  const successors_by_id = useMemo(() => {
    const map: Record<string, string[]> = {};
    if (!getDependencyIds) return map;
    for (const row of all_rows) {
      const row_id = getRowId(row);
      for (const dependency_id of getDependencyIds(row)) (map[dependency_id] ??= []).push(row_id);
    }
    return map;
  }, [all_rows, getDependencyIds, getRowId]);

  const critical_path = useMemo(() => {
    if (!show_critical_path || !getDependencyIds) return null;
    const nodes = all_rows.flatMap((row) => {
      const row_id = getRowId(row);
      const item_range = ranges_by_id.get(row_id);
      return item_range ? [{ id: row_id, end: item_range.end, predecessor_ids: getDependencyIds(row) }] : [];
    });
    return computeCriticalPath(nodes);
  }, [show_critical_path, getDependencyIds, all_rows, getRowId, ranges_by_id]);

  /**
   * Finish to Start auto reschedule: after `dragged_row_id` settles on
   * `dragged_end`, walks every row reachable from it and pushes forward any
   * successor that now starts on or before its predecessor's end, keeping
   * its duration. Rows are finalized in topological order, so a row with two
   * predecessors is shifted by whichever demands the later start.
   */
  const computeCascade = (dragged_row_id: string, dragged_end: Date): { row_id: string; start: Date; end: Date }[] => {
    const effective_start = new Map<string, Date>();
    const effective_end = new Map<string, Date>([[dragged_row_id, dragged_end]]);

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
        if (reachable.has(successor_id)) remaining_predecessors.set(successor_id, (remaining_predecessors.get(successor_id) ?? 0) + 1);
      }
    }

    const queue: string[] = [dragged_row_id];
    while (queue.length > 0) {
      const predecessor_id = queue.shift() as string;
      const predecessor_end = effective_end.get(predecessor_id);
      if (!predecessor_end) continue;

      for (const successor_id of successors_by_id[predecessor_id] ?? []) {
        if (!reachable.has(successor_id)) continue;
        const original = ranges_by_id.get(successor_id);
        if (original) {
          const current_start = effective_start.get(successor_id) ?? original.start;
          const current_end = effective_end.get(successor_id) ?? original.end;
          const min_start = addDaysLocal(predecessor_end, 1);
          if (min_start > current_start) {
            effective_start.set(successor_id, min_start);
            effective_end.set(successor_id, addDaysLocal(min_start, diffDaysLocal(current_start, current_end)));
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
      const original = ranges_by_id.get(id);
      const new_start = effective_start.get(id);
      const new_end = effective_end.get(id);
      if (original && new_start && new_end && diffDaysLocal(original.start, new_start) !== 0) {
        updates.push({ row_id: id, start: new_start, end: new_end });
      }
    }
    return updates;
  };

  /** One elbow path per dependency whose both bars are visible (neither group collapsed). */
  const dependency_arrows = useMemo(() => {
    if (!show_dependencies || !getDependencyIds) return [];
    const arrows: { key: string; path: string; predecessor_id: string; successor_id: string; is_critical: boolean }[] = [];
    for (const row of all_rows) {
      const successor_id = getRowId(row);
      const successor_top = row_top_by_id[successor_id];
      const successor_geometry = getGeometry(successor_id);
      if (successor_top === undefined || !successor_geometry) continue;

      for (const predecessor_id of getDependencyIds(row)) {
        const predecessor_top = row_top_by_id[predecessor_id];
        const predecessor_geometry = getGeometry(predecessor_id);
        if (predecessor_top === undefined || !predecessor_geometry) continue;
        const key = `${predecessor_id}->${successor_id}`;
        arrows.push({
          key,
          predecessor_id,
          successor_id,
          is_critical: critical_path?.link_keys.has(key) ?? false,
          path: buildElbowArrowPath(
            predecessor_geometry.left + predecessor_geometry.width,
            predecessor_top + bar_top + GANTT_BAR_HEIGHT / 2,
            successor_geometry.left - 1,
            successor_top + bar_top + GANTT_BAR_HEIGHT / 2
          ),
        });
      }
    }
    return arrows;
  }, [show_dependencies, getDependencyIds, all_rows, getRowId, row_top_by_id, getGeometry, critical_path, bar_top]);

  /** Each group's span (earliest start to latest end of its dated rows), for the summary line. */
  const group_spans = useMemo(() => {
    const spans: Record<string, { start: Date; end: Date }> = {};
    for (const group of groups) {
      let start: Date | null = null;
      let end: Date | null = null;
      for (const row of group.rows) {
        const row_id = getRowId(row);
        const item_range =
          drag_preview && drag_preview.row_id === row_id ? { start: drag_preview.start, end: drag_preview.end } : ranges_by_id.get(row_id);
        if (!item_range) continue;
        if (!start || item_range.start < start) start = item_range.start;
        if (!end || item_range.end > end) end = item_range.end;
      }
      if (start && end) spans[group.id] = { start, end };
    }
    return spans;
  }, [groups, getRowId, ranges_by_id, drag_preview]);

  // ── Scrolling ──
  const scrollTimelineTo = useCallback(
    (track_x: number, behavior: ScrollBehavior = "smooth") => {
      const scroller = scroller_ref.current;
      if (!scroller) return;
      scroller.scrollTo({ left: Math.max(0, track_x), behavior });
    },
    []
  );

  const centerOnDate = useCallback(
    (date: Date, behavior: ScrollBehavior = "smooth") => {
      const scroller = scroller_ref.current;
      if (!scroller) return;
      const track_width = scroller.clientWidth - panel_width;
      scrollTimelineTo((diffDaysLocal(range.start, date) + 0.5) * day_width - track_width / 2, behavior);
    },
    [scrollTimelineTo, panel_width, range.start, day_width]
  );

  /** The date at the middle of the visible track, kept centered across scale and zoom changes. */
  const getCenterDate = (): Date => {
    const days = (viewport.scroll_left + track_viewport_width / 2) / day_width;
    return addDaysLocal(range.start, Math.floor(days));
  };

  useLayoutEffect(() => {
    const pending = pending_center_ref.current;
    if (!pending) return;
    pending_center_ref.current = null;
    centerOnDate(pending, "auto");
  }, [day_width, range.start, centerOnDate]);

  // Opens on the first item (or today when nothing has dates), once the scroller has a width.
  useLayoutEffect(() => {
    if (has_initial_scroll_ref.current || viewport.client_width === 0) return;
    has_initial_scroll_ref.current = true;
    let first_start: Date | null = null;
    for (const item_range of ranges_by_id.values()) if (!first_start || item_range.start < first_start) first_start = item_range.start;
    if (first_start) scrollTimelineTo(diffDaysLocal(range.start, first_start) * day_width - Math.min(120, track_viewport_width / 6), "auto");
    else centerOnDate(today, "auto");
  }, [viewport.client_width, ranges_by_id, range.start, day_width, track_viewport_width, scrollTimelineTo, centerOnDate, today]);

  const changeScale = (next_scale: GanttScale) => {
    if (next_scale === scale) return;
    pending_center_ref.current = getCenterDate();
    updatePrefs({ scale: next_scale, zoom_index: DEFAULT_ZOOM_INDEX });
  };

  const zoom = (direction: 1 | -1) => {
    const next_index = zoom_index + direction;
    if (next_index < 0 || next_index >= GANTT_ZOOM_LEVELS.length) return;
    pending_center_ref.current = getCenterDate();
    updatePrefs({ zoom_index: next_index });
  };

  /** Picks the most detailed scale and zoom that still shows every dated item, then centers them. */
  const autoFit = () => {
    if (ranges_by_id.size === 0) {
      centerOnDate(today);
      return;
    }
    let min_start: Date | null = null;
    let max_end: Date | null = null;
    for (const item_range of ranges_by_id.values()) {
      if (!min_start || item_range.start < min_start) min_start = item_range.start;
      if (!max_end || item_range.end > max_end) max_end = item_range.end;
    }
    if (!min_start || !max_end) return;
    const span_days = diffDaysLocal(min_start, max_end) + 1;
    const available = Math.max(200, track_viewport_width - 64);
    const candidates = GANTT_SCALES.flatMap((option) =>
      GANTT_ZOOM_LEVELS.map((level, index) => ({ scale: option.id, zoom_index: index, day_width: option.day_width * level }))
    ).sort((a, b) => b.day_width - a.day_width);
    const fit = candidates.find((candidate) => span_days * candidate.day_width <= available) ?? candidates[candidates.length - 1];
    const middle = addDaysLocal(min_start, Math.floor(span_days / 2));
    if (fit.scale === scale && fit.zoom_index === zoom_index) {
      centerOnDate(middle);
      return;
    }
    pending_center_ref.current = middle;
    updatePrefs({ scale: fit.scale, zoom_index: fit.zoom_index });
  };

  const scrollToRow = (row_id: string) => {
    const item_range = ranges_by_id.get(row_id);
    if (!item_range) return;
    centerOnDate(addDaysLocal(item_range.start, Math.floor(diffDaysLocal(item_range.start, item_range.end) / 2)));
  };

  // ── Groups ──
  const toggleGroup = (group_id: string) => {
    const next = new Set(collapsed_group_ids);
    if (next.has(group_id)) next.delete(group_id);
    else next.add(group_id);
    updatePrefs({ collapsed_group_ids: [...next] });
  };

  const are_all_collapsed = groups.length > 0 && groups.every((group) => collapsed_group_ids.has(group.id));
  const toggleAllGroups = () => updatePrefs({ collapsed_group_ids: are_all_collapsed ? [] : groups.map((group) => group.id) });

  // ── Bar drag and resize ──
  const startDrag = (row_id: string, mode: DragMode, event: React.PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const geometry = getGeometry(row_id);
    if (!geometry) return;
    event.preventDefault();
    drag_ref.current = { row_id, mode, start_x: event.clientX, orig_start: geometry.start, orig_end: geometry.end, moved: false };
    setIsDragging(true);
  };

  useEffect(() => {
    if (!is_dragging) return;

    const handleMove = (event: PointerEvent) => {
      const session = drag_ref.current;
      if (!session) return;
      const delta_x = event.clientX - session.start_x;
      if (Math.abs(delta_x) >= GANTT_DRAG_THRESHOLD) session.moved = true;
      if (!session.moved || !onDateChange) return;
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
      if (!session) return;
      if (!session.moved) {
        const row = rows_by_id.get(session.row_id);
        if (row) onRowClick?.(row);
        return;
      }
      if (!preview || preview.row_id !== session.row_id) return;
      if (diffDaysLocal(preview.start, session.orig_start) === 0 && diffDaysLocal(preview.end, session.orig_end) === 0) return;
      onDateChange?.(session.row_id, toIsoDate(preview.start), toIsoDate(preview.end));
      const cascade = computeCascade(session.row_id, preview.end);
      if (cascade.length > 0) {
        onCascadeReschedule?.(cascade.map((update) => ({ row_id: update.row_id, start: toIsoDate(update.start), end: toIsoDate(update.end) })));
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
  }, [is_dragging, day_width, onDateChange, onCascadeReschedule, successors_by_id, rows_by_id, ranges_by_id, onRowClick]);

  // ── Drawing a dependency from a bar's connector dot ──
  const toTrackPoint = (client_x: number, client_y: number): { x: number; y: number } => {
    const rect = track_layer_ref.current?.getBoundingClientRect();
    return rect ? { x: client_x - rect.left, y: client_y - rect.top } : { x: 0, y: 0 };
  };

  const startLinkDrag = (row_id: string, event: React.PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const geometry = getGeometry(row_id);
    const row_top = row_top_by_id[row_id];
    if (!geometry || row_top === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    const point = toTrackPoint(event.clientX, event.clientY);
    const next_link_drag = { from_row_id: row_id, from_x: geometry.left + geometry.width, from_y: row_top + bar_top + GANTT_BAR_HEIGHT / 2, ...point };
    link_drag_ref.current = next_link_drag;
    setLinkDrag(next_link_drag);
  };

  const is_link_dragging = link_drag !== null;
  useEffect(() => {
    if (!is_link_dragging) return;
    const handleMove = (event: PointerEvent) => {
      const current = link_drag_ref.current;
      if (!current) return;
      const next_link_drag = { ...current, ...toTrackPoint(event.clientX, event.clientY) };
      link_drag_ref.current = next_link_drag;
      setLinkDrag(next_link_drag);
    };
    const handleUp = (event: PointerEvent) => {
      const current = link_drag_ref.current;
      link_drag_ref.current = null;
      setLinkDrag(null);
      if (!current) return;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-gantt-row-id]");
      const target_id = target?.dataset.ganttRowId;
      if (target_id && target_id !== current.from_row_id) addDependency(target_id, current.from_row_id);
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
  }, [is_link_dragging]);

  /** Links `predecessor_id` before `successor_id`, unless it already is or would close a loop. */
  const addDependency = (successor_id: string, predecessor_id: string) => {
    const successor = rows_by_id.get(successor_id);
    if (!successor || !getDependencyIds || !onChangeDependencies) return;
    const current_ids = getDependencyIds(successor);
    if (current_ids.includes(predecessor_id)) return;
    const candidates = getDependencyCandidates?.(successor);
    if (candidates && !candidates.some((candidate) => candidate.id === predecessor_id)) return;
    onChangeDependencies(successor_id, [...current_ids, predecessor_id]);
  };

  const removeDependency = (successor_id: string, predecessor_id: string) => {
    const successor = rows_by_id.get(successor_id);
    if (!successor || !getDependencyIds || !onChangeDependencies) return;
    const next_ids = getDependencyIds(successor).filter((id) => id !== predecessor_id);
    onChangeDependencies(successor_id, next_ids.length ? next_ids : null);
  };

  // ── Resizing the item list ──
  const startPanelResize = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    const start_x = event.clientX;
    const start_width = prefs.panel_width;
    setIsResizingPanel(true);
    const handleMove = (move_event: PointerEvent) => {
      setPrefs((current) => ({ ...current, panel_width: clampPanelWidth(start_width + move_event.clientX - start_x) }));
    };
    const handleUp = (up_event: PointerEvent) => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setIsResizingPanel(false);
      updatePrefs({ panel_width: clampPanelWidth(start_width + up_event.clientX - start_x) });
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  // ── Rows ──
  const getGhostDay = (event: React.PointerEvent<HTMLDivElement>): number => {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(total_days - 1, Math.floor((event.clientX - rect.left) / day_width)));
  };

  const new_bar_days = getGanttScale(scale).new_bar_days;

  const createBarAt = (row_id: string, day: number) => {
    if (!onDateChange) return;
    const start = addDaysLocal(range.start, day);
    onDateChange(row_id, toIsoDate(start), toIsoDate(addDaysLocal(start, new_bar_days - 1)));
    setGhost(null);
  };

  // ── Baseline ──
  const dated_item_count = ranges_by_id.size;

  const saveBaseline = () => {
    if (!onConfigChange) return;
    const items: Record<string, { start: string; end: string }> = {};
    for (const [row_id, item_range] of ranges_by_id) items[row_id] = { start: toIsoDate(item_range.start), end: toIsoDate(item_range.end) };
    onConfigChange({
      ...config,
      show_baseline: true,
      baseline: { saved_at: new Date().toISOString(), saved_by: current_user_name ?? null, items },
    });
  };

  // ── Export ──
  const exportImage = async () => {
    const content = content_ref.current;
    if (!content) return;
    const { toPng } = await import("html-to-image");
    const background = getComputedStyle(root_ref.current ?? content).getPropertyValue("--gantt-surface").trim() || "#ffffff";
    const data_url = await toPng(content, {
      width: content.scrollWidth,
      height: content.scrollHeight,
      backgroundColor: background,
      pixelRatio: 2,
      filter: (node) => !(node instanceof HTMLElement && node.dataset.exportIgnore !== undefined),
    });
    const link = document.createElement("a");
    link.href = data_url;
    link.download = `${title.trim().replace(/[^\w-]+/g, "_") || "gantt"}.png`;
    link.click();
  };

  // ── Hover card ──
  const hover_row_id = drag_preview?.row_id ?? hovered_bar_id ?? (ghost ? ghost.row_id : null);
  const hover_card = (() => {
    if (!hover_row_id || link_drag || is_resizing_panel) return null;
    const row = rows_by_id.get(hover_row_id);
    const row_top = row_top_by_id[hover_row_id];
    const scroller = scroller_ref.current;
    if (!row || row_top === undefined || !scroller) return null;
    const geometry = ghost?.row_id === hover_row_id ? toGeometry(addDaysLocal(range.start, ghost.day), addDaysLocal(range.start, ghost.day + new_bar_days - 1)) : getGeometry(hover_row_id);
    if (!geometry) return null;
    const rect = scroller.getBoundingClientRect();
    const bar_screen_left = rect.left + panel_width + geometry.left - viewport.scroll_left;
    const bar_screen_top = rect.top + header_height + row_top + bar_top - viewport.scroll_top;
    const anchor_x = Math.min(Math.max(bar_screen_left + Math.min(geometry.width, 120) / 2, rect.left + panel_width + 8), rect.right - 8);
    const place_below = bar_screen_top - rect.top < header_height + 96;
    const baseline_range = baseline_ranges_by_id.get(hover_row_id);
    const end_shift = baseline_range ? diffDaysLocal(baseline_range.end, geometry.end) : 0;
    const is_ghost = ghost?.row_id === hover_row_id && !drag_preview;
    return {
      x: anchor_x,
      y: place_below ? bar_screen_top + GANTT_BAR_HEIGHT + 8 : bar_screen_top - 8,
      place_below,
      name: getRowName(row),
      is_ghost,
      range_label: formatGanttRange(geometry.start, geometry.end),
      duration_label: formatGanttDuration(geometry.start, geometry.end),
      baseline_label: !is_ghost && baseline_range ? formatGanttRange(baseline_range.start, baseline_range.end) : null,
      shift_label:
        !is_ghost && baseline_range
          ? end_shift === 0
            ? "On baseline"
            : `${Math.abs(end_shift)} ${Math.abs(end_shift) === 1 ? "day" : "days"} ${end_shift > 0 ? "late" : "early"}`
          : null,
      is_critical: !is_ghost && (critical_path?.item_ids.has(hover_row_id) ?? false),
    };
  })();

  // ── Menus ──
  const menu_row = row_menu ? rows_by_id.get(row_menu.row_id) ?? null : null;
  const menu_row_has_dates = row_menu ? ranges_by_id.has(row_menu.row_id) : false;
  const row_menu_sections: ActionMenuSection[] = row_menu
    ? [
        {
          key: "main",
          items: [
            ...(onRowClick && menu_row ? [{ key: "open", label: "Open item", icon: <OpenInOverlayIcon size={16} />, onClick: () => onRowClick(menu_row) }] : []),
            ...(menu_row_has_dates
              ? [{ key: "scroll", label: "Scroll to item", icon: <ArrowRightIcon size={16} />, onClick: () => scrollToRow(row_menu.row_id) }]
              : []),
            ...(onChangeDependencies && getDependencyCandidates
              ? [
                  {
                    key: "dependencies",
                    label: "Edit dependencies",
                    icon: <LinkIcon size={16} />,
                    onClick: () => setDependencyPicker({ row_id: row_menu.row_id, anchor_el: row_menu.anchor_el }),
                  },
                ]
              : []),
            ...(menu_row_has_dates && onRemoveDates
              ? [{ key: "remove-dates", label: "Remove dates", icon: <CloseIcon size={16} />, onClick: () => onRemoveDates(row_menu.row_id) }]
              : []),
          ],
        },
        ...(onDeleteRow
          ? [
              {
                key: "danger",
                items: [{ key: "delete", label: "Delete item", icon: <DeleteIcon size={16} />, danger: true, onClick: () => onDeleteRow(row_menu.row_id) }],
              },
            ]
          : []),
      ]
    : [];

  const picker_row = dependency_picker ? rows_by_id.get(dependency_picker.row_id) ?? null : null;
  const picker_selected_ids = picker_row && getDependencyIds ? getDependencyIds(picker_row) : [];

  const full_legend: GanttLegendItem[] = [
    ...legend_items,
    ...(critical_path ? [{ key: "__critical__", label: "Critical path", color: GANTT_CRITICAL_COLOR }] : []),
    ...(show_baseline ? [{ key: "__baseline__", label: "Baseline", color: GANTT_BASELINE_COLOR }] : []),
  ];

  const hidden_group_ids = config.hidden_group_ids ?? [];
  const track_visible_end = viewport.scroll_left + track_viewport_width;

  const renderHeaderSegment = (segment: GanttHeaderSegment, band: "major" | "minor") => {
    const width = segment.days * day_width;
    const label_width = segment.label.length * (band === "major" ? 8 : 6.4) + 16;
    // Major labels sit in the middle of the segment's visible part, so a month that starts off screen still shows its name.
    const left = segment.offset_days * day_width;
    const visible_start = Math.max(left, viewport.scroll_left);
    const visible_end = Math.min(left + width, viewport.scroll_left + track_viewport_width);
    const visible_width = band === "major" && visible_end > visible_start ? visible_end - visible_start : width;
    const label =
      visible_width >= label_width ? segment.label : visible_width >= segment.compact_label.length * 6 + 4 ? segment.compact_label : "";
    const strong = band === "major" && label === segment.label ? segment.strong_label : undefined;
    const label_style: React.CSSProperties | undefined =
      band === "major" && visible_end > visible_start ? { left: (visible_start + visible_end) / 2 - left } : undefined;
    return (
      <div
        key={segment.key}
        className={`board-gantt__band-segment board-gantt__band-segment--${band}`}
        style={{ left, width }}
        data-today={(band === "minor" && segment.is_today) || undefined}
        title={label === segment.label ? undefined : segment.label}
      >
        {band === "minor" && segment.is_today ? (
          <span className="board-gantt__today-pill">{label}</span>
        ) : strong ? (
          <span className="board-gantt__band-label" style={label_style}>
            <strong>{strong}</strong>
            {segment.label.slice(strong.length)}
          </span>
        ) : (
          <span className="board-gantt__band-label" style={label_style}>
            {label}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      ref={root_ref}
      className="board-gantt"
      style={{ height: chart_height }}
      data-dragging={is_dragging || is_link_dragging || is_resizing_panel || undefined}
    >
      <GanttToolbar
        title={title}
        scale={scale}
        onScaleChange={changeScale}
        can_zoom_in={zoom_index < GANTT_ZOOM_LEVELS.length - 1}
        can_zoom_out={zoom_index > 0}
        onZoom={zoom}
        onToday={() => centerOnDate(today)}
        onAutoFit={autoFit}
        is_filter_active={hidden_group_ids.length > 0}
        filter_panel={
          <GanttFilterPanel
            groups={group_options}
            hidden_group_ids={hidden_group_ids}
            onChange={onConfigChange ? (next_ids) => onConfigChange({ ...config, hidden_group_ids: next_ids.length ? next_ids : null }) : undefined}
          />
        }
        is_baseline_active={show_baseline}
        baseline_panel={
          <GanttBaselinePanel
            config={config}
            dated_item_count={dated_item_count}
            onSave={onConfigChange ? saveBaseline : undefined}
            onToggle={onConfigChange ? () => onConfigChange({ ...config, show_baseline: config.show_baseline === false }) : undefined}
            onDelete={onConfigChange ? () => onConfigChange({ ...config, baseline: null, show_baseline: false }) : undefined}
          />
        }
        onOpenSettings={setSettingsAnchorEl}
        onExportImage={() => void exportImage()}
      />

      <div className="board-gantt__body">
        <div ref={scroller_ref} className="board-gantt__scroller shell-scrollbar">
          <div
            ref={content_ref}
            className="board-gantt__content"
            style={{ width: panel_width + total_width, minHeight: header_height + body_height }}
          >
            {/* ── Header: the item list's corner and the two timeline bands ── */}
            <div className="board-gantt__head" style={{ height: header_height }}>
              {!is_panel_collapsed && (
                <div className="board-gantt__corner" style={{ width: panel_width }}>
                  <Tooltip content={are_all_collapsed ? "Expand all groups" : "Collapse all groups"} placement="right">
                    <button
                      type="button"
                      onClick={toggleAllGroups}
                      aria-label={are_all_collapsed ? "Expand all groups" : "Collapse all groups"}
                      className="board-gantt__collapse-all"
                      data-export-ignore
                    >
                      <CollapseAllIcon is_collapsed={are_all_collapsed} />
                    </button>
                  </Tooltip>
                  <Tooltip content="Hide item list" placement="left">
                    <button
                      type="button"
                      onClick={() => updatePrefs({ is_panel_collapsed: true })}
                      aria-label="Hide item list"
                      className="board-gantt__panel-toggle"
                      data-export-ignore
                    >
                      <ChevronLeftIcon size={12} />
                    </button>
                  </Tooltip>
                </div>
              )}
              <div className="board-gantt__bands" style={{ width: total_width }}>
                <div className="board-gantt__band board-gantt__band--major" style={{ height: GANTT_HEADER_ROW_HEIGHT }}>
                  {header.major.map((segment) => renderHeaderSegment(segment, "major"))}
                </div>
                <div className="board-gantt__band board-gantt__band--minor" style={{ height: GANTT_HEADER_ROW_HEIGHT }}>
                  {header.minor.map((segment) => renderHeaderSegment(segment, "minor"))}
                </div>
              </div>
            </div>

            {/* ── Track layer: grid, weekends, today line, arrows, behind and around the bars ── */}
            <div
              ref={track_layer_ref}
              className="board-gantt__track-layer"
              style={{ left: panel_width, top: header_height, width: total_width, height: Math.max(body_height, viewport.client_height - header_height) }}
            >
              {show_weekends &&
                header.minor
                  .filter((segment) => segment.is_weekend)
                  .map((segment) => (
                    <div key={`weekend-${segment.key}`} className="board-gantt__weekend" style={{ left: segment.offset_days * day_width, width: day_width }} />
                  ))}
              {header.minor.slice(1).map((segment) => (
                <div key={`grid-${segment.key}`} className="board-gantt__grid-line" style={{ left: segment.offset_days * day_width }} />
              ))}
              <div className="board-gantt__today-line" style={{ left: today_x }}>
                <span className="board-gantt__today-dot" />
              </div>
            </div>

            {/* ── Groups and rows ── */}
            {groups.map((group, group_index) => {
              const is_collapsed = collapsed_group_ids.has(group.id);
              const span = group_spans[group.id];
              const span_geometry = span ? toGeometry(span.start, span.end) : null;
              return (
                <React.Fragment key={group.id}>
                  <div
                    className="board-gantt__group-row"
                    style={{ height: GANTT_GROUP_HEADER_HEIGHT }}
                    data-first={group_index === 0 || undefined}
                    data-collapsed={is_collapsed || undefined}
                  >
                    {!is_panel_collapsed && (
                      <div className="board-gantt__group-cell" style={{ width: panel_width }}>
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.id)}
                          aria-expanded={!is_collapsed}
                          aria-label={`${is_collapsed ? "Expand" : "Collapse"} ${group.name}`}
                          className="board-gantt__group-chevron"
                          data-export-ignore
                        >
                          <ChevronRightIcon size={12} />
                        </button>
                        <span className="board-gantt__group-dot" style={{ background: group.accent_color }} aria-hidden />
                        <button type="button" className="board-gantt__group-name" onClick={() => toggleGroup(group.id)} title={group.name}>
                          {group.name}
                        </button>
                        {is_collapsed && <span className="board-gantt__group-count">{group.rows.length}</span>}
                      </div>
                    )}
                    <div className="board-gantt__group-track" style={{ width: total_width }}>
                      {show_group_summary && span && span_geometry && (
                        <div className="board-gantt__summary" style={{ left: span_geometry.left, width: span_geometry.width }}>
                          <span className="board-gantt__summary-label">
                            <strong>{group.name}</strong>
                            {` · ${formatGanttRange(span.start, span.end)} · ${formatGanttDuration(span.start, span.end)}`}
                          </span>
                          <span className="board-gantt__summary-line" style={{ background: group.accent_color }} />
                        </div>
                      )}
                    </div>
                  </div>

                  {!is_collapsed &&
                    group.rows.map((row) => {
                      const row_id = getRowId(row);
                      const geometry = getGeometry(row_id);
                      const item_range = ranges_by_id.get(row_id);
                      const preview_range = drag_preview?.row_id === row_id ? drag_preview : item_range;
                      const baseline_range = baseline_ranges_by_id.get(row_id);
                      const baseline_geometry = baseline_range ? toGeometry(baseline_range.start, baseline_range.end) : null;
                      const is_critical = critical_path?.item_ids.has(row_id) ?? false;
                      const color = is_critical ? GANTT_CRITICAL_COLOR : getRowColor(row);
                      const name = getRowName(row);
                      const is_menu_open = row_menu?.row_id === row_id || dependency_picker?.row_id === row_id;
                      const show_left_arrow = hovered_row_id === row_id && geometry && geometry.left + geometry.width < viewport.scroll_left;
                      const show_right_arrow = hovered_row_id === row_id && geometry && geometry.left > track_visible_end;

                      return (
                        <div
                          key={row_id}
                          className="board-gantt__row"
                          style={{ height: GANTT_ROW_HEIGHT }}
                          data-gantt-row-id={row_id}
                          data-selected={selectedRowId === row_id || undefined}
                          data-menu-open={is_menu_open || undefined}
                          data-link-target={(link_drag && link_drag.from_row_id !== row_id) || undefined}
                          onPointerEnter={() => setHoveredRowId(row_id)}
                          onPointerLeave={() => setHoveredRowId((current) => (current === row_id ? null : current))}
                        >
                          {!is_panel_collapsed && (
                            <div
                              className="board-gantt__row-cell"
                              style={{ width: panel_width }}
                              role="button"
                              tabIndex={0}
                              onClick={() => onRowClick?.(row)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  onRowClick?.(row);
                                }
                              }}
                            >
                              <span className="board-gantt__row-name" title={name}>
                                {name}
                              </span>
                              {preview_range && (
                                <span className="board-gantt__row-date">{formatGanttRangeCompact(preview_range.start, preview_range.end)}</span>
                              )}
                              <button
                                type="button"
                                aria-label={`Actions for ${name}`}
                                aria-haspopup="menu"
                                aria-expanded={row_menu?.row_id === row_id}
                                className="board-gantt__row-menu-button"
                                data-export-ignore
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setRowMenu({ row_id, anchor_el: event.currentTarget });
                                }}
                              >
                                <MoreDotsIcon size={16} />
                              </button>
                            </div>
                          )}

                          <div
                            className="board-gantt__row-track"
                            style={{ width: total_width }}
                            onClick={() => {
                              if (!geometry && ghost?.row_id === row_id) createBarAt(row_id, ghost.day);
                            }}
                            onPointerMove={(event) => {
                              if (geometry || !onDateChange || is_dragging || link_drag) return;
                              const day = getGhostDay(event);
                              setGhost((current) => (current?.row_id === row_id && current.day === day ? current : { row_id, day }));
                            }}
                            onPointerLeave={() => setGhost((current) => (current?.row_id === row_id ? null : current))}
                          >
                            {baseline_geometry && (
                              <div
                                className="board-gantt__baseline-bar"
                                style={{ left: baseline_geometry.left, width: baseline_geometry.width, top: baseline_top, height: GANTT_BASELINE_HEIGHT }}
                              />
                            )}

                            {!geometry && ghost?.row_id === row_id && (
                              <div
                                className="board-gantt__ghost-bar"
                                style={{
                                  left: ghost.day * day_width + bar_gap / 2,
                                  width: Math.max(GANTT_MIN_BAR_WIDTH, new_bar_days * day_width - bar_gap),
                                  top: bar_top,
                                  height: GANTT_BAR_HEIGHT,
                                }}
                              />
                            )}

                            {geometry && (
                              <div
                                className="board-gantt__bar"
                                data-critical={is_critical || undefined}
                                data-dimmed={(critical_path && !is_critical) || undefined}
                                data-draggable={Boolean(onDateChange) || undefined}
                                style={{ left: geometry.left, width: geometry.width, top: bar_top, height: GANTT_BAR_HEIGHT, background: color }}
                                onPointerDown={(event) => startDrag(row_id, "move", event)}
                                onPointerEnter={() => setHoveredBarId(row_id)}
                                onPointerLeave={() => setHoveredBarId((current) => (current === row_id ? null : current))}
                                onClick={(event) => event.stopPropagation()}
                              >
                                {resizable && onDateChange && geometry.width >= GANTT_HANDLE_WIDTH * 5 && (
                                  <>
                                    <span
                                      className="board-gantt__bar-handle board-gantt__bar-handle--start"
                                      style={{ width: GANTT_HANDLE_WIDTH }}
                                      onPointerDown={(event) => {
                                        event.stopPropagation();
                                        startDrag(row_id, "resize-start", event);
                                      }}
                                    />
                                    <span
                                      className="board-gantt__bar-handle board-gantt__bar-handle--end"
                                      style={{ width: GANTT_HANDLE_WIDTH }}
                                      onPointerDown={(event) => {
                                        event.stopPropagation();
                                        startDrag(row_id, "resize-end", event);
                                      }}
                                    />
                                  </>
                                )}
                                {onChangeDependencies && getDependencyIds && show_dependencies && (
                                  <span
                                    className="board-gantt__bar-link"
                                    title="Drag to another item to add a dependency"
                                    data-export-ignore
                                    onPointerDown={(event) => startLinkDrag(row_id, event)}
                                  />
                                )}
                              </div>
                            )}

                            {geometry && show_bar_labels && (
                              <span className="board-gantt__bar-label" style={{ left: geometry.left + geometry.width + 14, top: bar_top }}>
                                {name}
                              </span>
                            )}

                            {(show_left_arrow || show_right_arrow) && (
                              <span
                                className={`board-gantt__edge-arrow board-gantt__edge-arrow--${show_left_arrow ? "left" : "right"}`}
                                style={{ left: show_left_arrow ? viewport.scroll_left : track_visible_end - 22 }}
                                data-export-ignore
                              >
                                <Tooltip content="Scroll to item" placement={show_left_arrow ? "right" : "left"}>
                                  <button
                                    type="button"
                                    aria-label={`Scroll to ${name}`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      scrollToRow(row_id);
                                    }}
                                  >
                                    {show_left_arrow ? <ChevronLeftIcon size={10} /> : <ChevronRightIcon size={10} />}
                                  </button>
                                </Tooltip>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </React.Fragment>
              );
            })}

            {/* ── Dependency arrows, above the bars ── */}
            {(dependency_arrows.length > 0 || link_drag) && (
              <svg
                className="board-gantt__arrows"
                style={{ left: panel_width, top: header_height, width: total_width, height: body_height }}
              >
                <defs>
                  <marker id="board-gantt-arrowhead" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0.5 L7,4 L0,7.5 Z" className="board-gantt__arrowhead" />
                  </marker>
                  <marker id="board-gantt-arrowhead-critical" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0.5 L7,4 L0,7.5 Z" fill={GANTT_CRITICAL_COLOR} />
                  </marker>
                </defs>
                {dependency_arrows.map((arrow) => (
                  <g key={arrow.key} className="board-gantt__arrow" data-critical={arrow.is_critical || undefined}>
                    <path
                      d={arrow.path}
                      className="board-gantt__arrow-line"
                      markerEnd={`url(#${arrow.is_critical ? "board-gantt-arrowhead-critical" : "board-gantt-arrowhead"})`}
                    />
                    {onChangeDependencies && (
                      <path
                        d={arrow.path}
                        className="board-gantt__arrow-hit"
                        data-export-ignore
                        onClick={(event) => {
                          const point = toTrackPoint(event.clientX, event.clientY);
                          setArrowMenu({ predecessor_id: arrow.predecessor_id, successor_id: arrow.successor_id, ...point });
                        }}
                      >
                        <title>Dependency, click to remove</title>
                      </path>
                    )}
                  </g>
                ))}
                {link_drag && (
                  <path
                    d={`M ${link_drag.from_x} ${link_drag.from_y} L ${link_drag.x} ${link_drag.y}`}
                    className="board-gantt__link-preview"
                    markerEnd="url(#board-gantt-arrowhead)"
                  />
                )}
              </svg>
            )}

            {arrow_menu && (
              <span
                ref={setArrowAnchorEl}
                className="board-gantt__arrow-anchor"
                style={{ left: panel_width + arrow_menu.x, top: header_height + arrow_menu.y }}
              />
            )}
          </div>
        </div>

        {/* Covers the timeline's grid where the item list has no rows, so bars and lines never show through it. */}
        {!is_panel_collapsed && (
          <div className="board-gantt__panel-backdrop" style={{ width: panel_width, height: viewport.client_height || undefined }} aria-hidden />
        )}

        {/* The divider between the item list and the timeline, dragged to resize the list. */}
        {!is_panel_collapsed && (
          <div
            className="board-gantt__resize-handle"
            style={{ left: panel_width - 3 }}
            onPointerDown={startPanelResize}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize item list"
            data-active={is_resizing_panel || undefined}
          />
        )}
        {is_panel_collapsed && (
          <span className="board-gantt__panel-expand" style={{ top: header_height / 2 }}>
            <Tooltip content="Show item list" placement="right">
              <button type="button" aria-label="Show item list" onClick={() => updatePrefs({ is_panel_collapsed: false })}>
                <ChevronRightIcon size={12} />
              </button>
            </Tooltip>
          </span>
        )}
      </div>

      {show_legend && full_legend.length > 0 && (
        <div className="board-gantt__legend" aria-label="Legend">
          {full_legend.map((item) => (
            <span key={item.key} className="board-gantt__legend-item">
              <span
                className="board-gantt__legend-dot"
                data-shape={item.key === "__baseline__" ? "bar" : undefined}
                style={{ background: item.color }}
                aria-hidden
              />
              {item.label}
            </span>
          ))}
        </div>
      )}

      {hover_card &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="board-gantt-hover-card"
            data-placement={hover_card.place_below ? "below" : "above"}
            style={{ left: hover_card.x, top: hover_card.y }}
            role="tooltip"
          >
            <span className="board-gantt-hover-card__title">{hover_card.is_ghost ? "Click to add dates" : hover_card.name}</span>
            <span className="board-gantt-hover-card__meta">
              {hover_card.range_label} · {hover_card.duration_label}
            </span>
            {hover_card.baseline_label && (
              <span className="board-gantt-hover-card__meta">
                Baseline: {hover_card.baseline_label} · {hover_card.shift_label}
              </span>
            )}
            {hover_card.is_critical && <span className="board-gantt-hover-card__critical">On the critical path</span>}
          </div>,
          document.body
        )}

      <ActionMenu
        anchor_el={row_menu?.anchor_el ?? null}
        is_open={row_menu !== null}
        onClose={() => setRowMenu(null)}
        sections={row_menu_sections}
        aria_label="Item actions"
        width={220}
        align="start"
      />

      <BoardPopover
        anchor_el={dependency_picker?.anchor_el ?? null}
        is_open={dependency_picker !== null && picker_row !== null}
        onClose={() => setDependencyPicker(null)}
        align="start"
        width={280}
      >
        {picker_row && dependency_picker && getDependencyCandidates && onChangeDependencies && (
          <div className="board-gantt-dependency-picker">
            <p className="board-gantt-dependency-picker__title">{getRowName(picker_row)} depends on</p>
            <DependencyPickerList
              items={getDependencyCandidates(picker_row)}
              selected_ids={picker_selected_ids}
              onToggle={(item_id) => {
                const next_ids = picker_selected_ids.includes(item_id)
                  ? picker_selected_ids.filter((id) => id !== item_id)
                  : [...picker_selected_ids, item_id];
                onChangeDependencies(dependency_picker.row_id, next_ids.length ? next_ids : null);
              }}
            />
          </div>
        )}
      </BoardPopover>

      <ActionMenu
        anchor_el={arrow_menu ? arrow_anchor_el : null}
        is_open={arrow_menu !== null}
        onClose={() => setArrowMenu(null)}
        aria_label="Dependency actions"
        width={200}
        align="start"
        sections={
          arrow_menu
            ? [
                {
                  key: "main",
                  items: [
                    {
                      key: "remove",
                      label: "Remove dependency",
                      icon: <DeleteIcon size={16} />,
                      danger: true,
                      onClick: () => removeDependency(arrow_menu.successor_id, arrow_menu.predecessor_id),
                    },
                  ],
                },
              ]
            : []
        }
      />

      <BoardPopover anchor_el={settings_anchor_el} is_open={settings_anchor_el !== null} onClose={() => setSettingsAnchorEl(null)} width={300} unstyled>
        <GanttSettingsPanel
          config={config}
          date_sources={date_sources}
          active_source_id={active_source_id}
          color_sources={color_sources}
          active_color_by={active_color_by}
          has_dependency_column={Boolean(getDependencyIds)}
          onAddDependencyColumn={onAddDependencyColumn}
          onChange={onConfigChange}
        />
      </BoardPopover>
    </div>
  );
}

export default GanttChart;
