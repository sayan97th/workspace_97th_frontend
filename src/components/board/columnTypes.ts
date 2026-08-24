import type { BoardColumnSwatch } from "./types";

/**
 * The canonical set of board column data-types. Kept here (in the generic board
 * kit) so both the presentational kit and the engine's API layer
 * (`@/types/board-content`, which re-exports this as `BoardColumnType`) share a
 * single source of truth without creating a circular import.
 */
export type BoardColumnKind =
  | "text"
  | "status"
  | "people"
  | "date"
  | "tags"
  | "number"
  | "checkbox"
  | "timeline"
  | "dependency";

/** Colour + glyph badge shown for each column kind across every picker (Add column, Sort, Group by, Hide…). */
export const COLUMN_KIND_SWATCH: Record<BoardColumnKind, BoardColumnSwatch> = {
  text: { accent_color: "#579bfc", glyph: "Te" },
  status: { accent_color: "#00c875", glyph: "St" },
  people: { accent_color: "#a358df", glyph: "Pp" },
  date: { accent_color: "#2b76e5", glyph: "Da" },
  tags: { accent_color: "#7e5bef", glyph: "Dp" },
  number: { accent_color: "#fdab3d", glyph: "#", glyph_text_color: "#3a2a00" },
  checkbox: { accent_color: "#17a2b8", glyph: "Ck" },
  timeline: { accent_color: "#ff642e", glyph: "Tl" },
  dependency: { accent_color: "#7f5347", glyph: "De" },
};

/** Which group of the Add-column menu a type belongs to (mirrors Monday's "Essentials"/"Super useful" sections). */
export type ColumnTypeSection = "essentials" | "super_useful";

/** A column type the user can add to a board from the Add-column menu. */
export type AddableColumnType = {
  kind: BoardColumnKind;
  /** Display name in the picker and default header label for the new column. */
  label: string;
  /** One-line description shown in the picker (also used as the search hint). */
  description: string;
  swatch: BoardColumnSwatch;
  /** Sensible starting width for the new column, in pixels. */
  default_width: number;
  section: ColumnTypeSection;
  /** Whether cells of this type let the user pick from a colour-coded option list (status/dropdown). */
  has_options: boolean;
};

/**
 * The ordered list of column types the Add-column menu offers. Note "Dropdown"
 * maps to the engine's multi-select `tags` kind — the board already renders and
 * filters `tags` as a colour-coded, multi-value picker, i.e. exactly a dropdown.
 */
export const ADDABLE_COLUMN_TYPES: AddableColumnType[] = [
  {
    kind: "status",
    label: "Status",
    description: "Track progress with colour-coded labels",
    swatch: COLUMN_KIND_SWATCH.status,
    default_width: 160,
    section: "essentials",
    has_options: true,
  },
  {
    kind: "tags",
    label: "Dropdown",
    description: "Pick one or more labels from a list",
    swatch: COLUMN_KIND_SWATCH.tags,
    default_width: 200,
    section: "essentials",
    has_options: true,
  },
  {
    kind: "text",
    label: "Text",
    description: "Free-form text",
    swatch: COLUMN_KIND_SWATCH.text,
    default_width: 200,
    section: "essentials",
    has_options: false,
  },
  {
    kind: "date",
    label: "Date",
    description: "Pick a calendar date",
    swatch: COLUMN_KIND_SWATCH.date,
    default_width: 150,
    section: "essentials",
    has_options: false,
  },
  {
    kind: "people",
    label: "People",
    description: "Assign board members",
    swatch: COLUMN_KIND_SWATCH.people,
    default_width: 150,
    section: "essentials",
    has_options: false,
  },
  {
    kind: "number",
    label: "Numbers",
    description: "Store numeric values",
    swatch: COLUMN_KIND_SWATCH.number,
    default_width: 130,
    section: "essentials",
    has_options: false,
  },
  {
    kind: "checkbox",
    label: "Checkbox",
    description: "A simple done / not-done toggle",
    swatch: COLUMN_KIND_SWATCH.checkbox,
    default_width: 110,
    section: "super_useful",
    has_options: false,
  },
  {
    kind: "timeline",
    label: "Timeline",
    description: "A start and end date — drives the Gantt view",
    swatch: COLUMN_KIND_SWATCH.timeline,
    default_width: 190,
    section: "super_useful",
    has_options: false,
  },
  {
    kind: "dependency",
    label: "Dependency",
    description: "Link items that must finish before this one starts",
    swatch: COLUMN_KIND_SWATCH.dependency,
    default_width: 170,
    section: "super_useful",
    has_options: false,
  },
];

/** Human-readable heading for each Add-column menu section, in display order. */
export const COLUMN_TYPE_SECTIONS: { id: ColumnTypeSection; label: string }[] = [
  { id: "essentials", label: "Essentials" },
  { id: "super_useful", label: "Super useful" },
];

/** Default palette for auto-colouring newly created status/dropdown options, cycled by index. */
export const COLUMN_OPTION_PALETTE = [
  "#00c875",
  "#fdab3d",
  "#e2445c",
  "#0086c0",
  "#a25ddc",
  "#ff642e",
  "#579bfc",
  "#9cd326",
  "#ff158a",
  "#7f5347",
];
