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
  | "dropdown"
  | "number"
  | "checkbox"
  | "timeline"
  | "dependency"
  | "label"
  | "progress"
  | "long_text"
  | "phone"
  | "email"
  | "rating"
  | "vote"
  | "link"
  | "files"
  | "time_tracking"
  | "auto_number";

/** Colour + glyph badge shown for each column kind across every picker (Add column, Sort, Group by, Hide…). */
export const COLUMN_KIND_SWATCH: Record<BoardColumnKind, BoardColumnSwatch> = {
  text: { accent_color: "#579bfc", glyph: "Te" },
  status: { accent_color: "#00c875", glyph: "St" },
  people: { accent_color: "#a358df", glyph: "Pp" },
  date: { accent_color: "#2b76e5", glyph: "Da" },
  tags: { accent_color: "#7e5bef", glyph: "Dp" },
  dropdown: { accent_color: "#2f9e78", glyph: "▾" },
  number: { accent_color: "#fdab3d", glyph: "#", glyph_text_color: "#3a2a00" },
  checkbox: { accent_color: "#17a2b8", glyph: "Ck" },
  timeline: { accent_color: "#ff642e", glyph: "Tl" },
  dependency: { accent_color: "#7f5347", glyph: "De" },
  label: { accent_color: "#5b3fbd", glyph: "◇" },
  progress: { accent_color: "#4f6bed", glyph: "%" },
  long_text: { accent_color: "#e8b23a", glyph: "¶", glyph_text_color: "#3a2a00" },
  phone: { accent_color: "#f2a53c", glyph: "☎", glyph_text_color: "#3a2a00" },
  email: { accent_color: "#f2662a", glyph: "@" },
  rating: { accent_color: "#fdab3d", glyph: "★", glyph_text_color: "#3a2a00" },
  vote: { accent_color: "#e2445c", glyph: "♥" },
  link: { accent_color: "#0086c0", glyph: "🔗" },
  files: { accent_color: "#7f5347", glyph: "📎" },
  time_tracking: { accent_color: "#4f6bed", glyph: "⏱" },
  auto_number: { accent_color: "#5b6180", glyph: "#" },
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
 * The ordered list of column types the Add-column menu offers, in the order
 * and grouping of monday.com's own picker. "Dropdown" maps to its own
 * `dropdown` kind — a chip multi-select from the column's fixed option list,
 * with no search box or free-form "create tag" affordance (see
 * `BoardColumn::TYPE_DROPDOWN` on the API side). "Label" maps to the `label`
 * kind — a single-select pill like Status, but rendered as an outline badge
 * instead of a filled one (see `BoardColumn::TYPE_LABEL` on the API side).
 * "Dependency" isn't part of the design this menu was modeled on, but stays
 * listed since it already powers the Gantt view's arrows/auto-reschedule.
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
    kind: "dropdown",
    label: "Dropdown",
    description: "Pick one or more labels from a list",
    swatch: COLUMN_KIND_SWATCH.dropdown,
    default_width: 180,
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
    kind: "label",
    label: "Label",
    description: "A single outline badge from a colour-coded list",
    swatch: COLUMN_KIND_SWATCH.label,
    default_width: 132,
    section: "essentials",
    has_options: true,
  },
  {
    kind: "progress",
    label: "Progress",
    description: "A manually-set 0-100% value",
    swatch: COLUMN_KIND_SWATCH.progress,
    default_width: 156,
    section: "essentials",
    has_options: false,
  },
  {
    kind: "timeline",
    label: "Timeline",
    description: "A start and end date — drives the Gantt view",
    swatch: COLUMN_KIND_SWATCH.timeline,
    default_width: 190,
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
    kind: "long_text",
    label: "Long text",
    description: "A multi-line note",
    swatch: COLUMN_KIND_SWATCH.long_text,
    default_width: 240,
    section: "essentials",
    has_options: false,
  },
  {
    kind: "phone",
    label: "Phone",
    description: "Store a phone number",
    swatch: COLUMN_KIND_SWATCH.phone,
    default_width: 150,
    section: "super_useful",
    has_options: false,
  },
  {
    kind: "email",
    label: "Email",
    description: "Store an email address",
    swatch: COLUMN_KIND_SWATCH.email,
    default_width: 190,
    section: "super_useful",
    has_options: false,
  },
  {
    kind: "tags",
    label: "Tags",
    description: "Colour-coded hashtag labels",
    swatch: { accent_color: "#12c46b", glyph: "#" },
    default_width: 180,
    section: "super_useful",
    has_options: true,
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
    kind: "dependency",
    label: "Dependency",
    description: "Link items that must finish before this one starts",
    swatch: COLUMN_KIND_SWATCH.dependency,
    default_width: 170,
    section: "super_useful",
    has_options: false,
  },
  {
    kind: "rating",
    label: "Rating",
    description: "Rate items on a 5-star scale",
    swatch: COLUMN_KIND_SWATCH.rating,
    default_width: 140,
    section: "super_useful",
    has_options: false,
  },
  {
    kind: "vote",
    label: "Vote",
    description: "Let the team vote on items",
    swatch: COLUMN_KIND_SWATCH.vote,
    default_width: 110,
    section: "super_useful",
    has_options: false,
  },
  {
    kind: "link",
    label: "Link",
    description: "A clickable URL with its own display text",
    swatch: COLUMN_KIND_SWATCH.link,
    default_width: 200,
    section: "super_useful",
    has_options: false,
  },
  {
    kind: "files",
    label: "Files",
    description: "Attach one or more files directly to this cell",
    swatch: COLUMN_KIND_SWATCH.files,
    default_width: 150,
    section: "super_useful",
    has_options: false,
  },
  {
    kind: "time_tracking",
    label: "Time Tracking",
    description: "Track time spent with a start/stop timer",
    swatch: COLUMN_KIND_SWATCH.time_tracking,
    default_width: 150,
    section: "super_useful",
    has_options: false,
  },
  {
    kind: "auto_number",
    label: "Item ID",
    description: "A read-only sequential number assigned when an item is created",
    swatch: COLUMN_KIND_SWATCH.auto_number,
    default_width: 100,
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
