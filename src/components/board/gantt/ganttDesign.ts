/**
 * Gantt's own design tokens — same adaptive `--color-shell-*` custom
 * properties every other board view resolves through (see `KANBAN_COLORS`
 * in `../kanban/kanbanDesign.ts`), so the timeline repaints for dark mode
 * along with the rest of the shell. Bar colors are the one exception: they
 * come from a row's actual status option / group accent color, which is
 * already theme-agnostic (chosen to hold contrast in both themes), matching
 * how `BoardTable`/`BoardKanban` treat those same colors.
 */
export const GANTT_COLORS = {
  panel_bg: "var(--color-shell-bg)",
  header_bg: "var(--color-shell-panel-alt)",
  border: "var(--color-shell-border)",
  border_strong: "var(--color-shell-border-strong)",
  text: "var(--color-shell-text)",
  text_muted: "var(--color-shell-text-secondary)",
  text_faint: "var(--color-shell-text-muted)",
  hover: "var(--color-shell-hover)",
  grid_line: "var(--color-shell-border)",
  grid_line_strong: "var(--color-shell-border-strong)",
  today_line: "var(--color-brand-500)",
  row_selected: "color-mix(in srgb, var(--color-shell-panel-alt) 78%, var(--color-success-500) 22%)",
  /** Dependency arrow stroke — a neutral that reads clearly against both a bar's own color and the grid, mirroring monday.com's own gray connector lines. */
  dependency_arrow: "var(--color-shell-text-faint)",
} as const;

/** Fixed left panel (item name + date range) width, in px. */
export const GANTT_LABEL_WIDTH = 280;
/** Every row (item) height, in px — Gantt doesn't offer the row-height presets Table does. */
export const GANTT_ROW_HEIGHT = 44;
/** Group header row height, in px. */
export const GANTT_GROUP_HEADER_HEIGHT = 40;
/** Bar height within a row, in px. */
export const GANTT_BAR_HEIGHT = 26;
/** Milestone diamond side length, in px. */
export const GANTT_MILESTONE_SIZE = 16;
/** Header rows (major + minor) height, in px. */
export const GANTT_HEADER_ROW_HEIGHT = 30;
/** Width of a bar's edge drag handle, in px. */
export const GANTT_HANDLE_WIDTH = 7;
/** Minimum pointer movement, in px, before a bar press counts as a drag rather than a click. */
export const GANTT_DRAG_THRESHOLD = 4;
