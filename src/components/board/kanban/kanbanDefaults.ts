/**
 * Starting lane labels for a brand-new Kanban board, used the moment a
 * Kanban tab's backing status column is created (see `BoardKanban`'s lanes,
 * which are just that column's options). "To do" replaces the classic
 * Monday "Stuck" default so a fresh board doesn't open with a lane that
 * reads as a problem to solve. Kept as a plain `{ label, color }[]` (no
 * `BoardColumnOption` import) so the kit stays free of the API-layer types
 * under `@/types/board-content`. Callers attach ids when they build the
 * column's `config.options`.
 */
export const KANBAN_DEFAULT_LANE_OPTIONS: Array<{ label: string; color: string }> = [
  { label: "To do", color: "#579bfc" },
  { label: "Working on it", color: "#fdab3d" },
  { label: "Done", color: "#00c875" },
];

/** The swatches offered by a lane's "Color" menu, monday.com's status colors with readable names. */
export const KANBAN_LANE_COLORS: Array<{ label: string; color: string }> = [
  { label: "Green", color: "#00c875" },
  { label: "Dark green", color: "#037f4c" },
  { label: "Orange", color: "#fdab3d" },
  { label: "Red", color: "#e2445c" },
  { label: "Pink", color: "#ff158a" },
  { label: "Purple", color: "#a25ddc" },
  { label: "Indigo", color: "#5559df" },
  { label: "Blue", color: "#579bfc" },
  { label: "Dark blue", color: "#0086c0" },
  { label: "Teal", color: "#66ccff" },
  { label: "Brown", color: "#7f5347" },
  { label: "Gray", color: "#c4c4c4" },
];
