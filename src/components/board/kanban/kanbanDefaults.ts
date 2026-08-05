/**
 * Starting lane labels for a brand-new Kanban board — used the moment a
 * Kanban tab's backing status column is created (see `BoardKanban`'s lanes,
 * which are just that column's options). "To do" replaces the classic
 * Monday "Stuck" default so a fresh board doesn't open with a lane that
 * reads as a problem to solve. Kept as a plain `{ label, color }[]` (no
 * `BoardColumnOption` import) so the kit stays free of the API-layer types
 * under `@/types/board-content` — callers attach ids when they build the
 * column's `config.options`.
 */
export const KANBAN_DEFAULT_LANE_OPTIONS: Array<{ label: string; color: string }> = [
  { label: "To do", color: "#579bfc" },
  { label: "Working on it", color: "#fdab3d" },
  { label: "Done", color: "#00c875" },
];
