/** Colour + glyph identifying a column's data type across the Sort/Group-by/Hide pickers. */
export type BoardColumnSwatch = {
  accent_color: string;
  glyph: string;
  /** Defaults to white; pale accent colours (e.g. yellow) need a dark glyph colour. */
  glyph_text_color?: string;
};

/** A single column definition shown across a board's grid, Kanban card properties and toolbar pickers. */
export type BoardColumn = {
  id: string;
  label: string;
  /** Fixed width in pixels (Monday-style boards use fixed columns). */
  width: number;
  align?: "left" | "center";
  /**
   * When true the cell renders edge-to-edge with no padding — used for
   * full-bleed coloured cells such as Status and Partner Program.
   */
  bleed?: boolean;
  /** Whether this column can be hidden via the toolbar's Hide control. Defaults to true. */
  hideable?: boolean;
  /** Whether this column can be frozen via the toolbar's Pin columns control. Defaults to true. */
  pinnable?: boolean;
  /** Colour + glyph badge shown next to this column in the Hide-columns picker. */
  swatch?: BoardColumnSwatch;
  /** Full descriptive label for pickers with more room than the in-table header (which may truncate, e.g. "Client ..."). Defaults to `label`. */
  full_label?: string;
  /** Whether this column's header can be renamed inline. Defaults to true when a rename handler is provided. */
  renamable?: boolean;
  /**
   * Rendering treatment for a `status`-kind column's cell — `"solid"`
   * (default) fills the cell edge-to-edge; `"outline"` renders a small
   * bordered pill instead, for Priority-style status columns (see
   * `StatusPill`'s own `variant` prop, which this flows into).
   */
  pill_style?: "solid" | "outline";
};

/** A collapsible group of rows (e.g. "Active Contracts"). */
export type BoardGroup<TRow> = {
  id: string;
  name: string;
  /** Accent colour for the group caret, title and the left row border. */
  accent_color: string;
  rows: TRow[];
};

/** Row height presets toggled from the toolbar's overflow menu ("Item height" submenu). */
export type BoardRowHeight = "single" | "double" | "triple";
