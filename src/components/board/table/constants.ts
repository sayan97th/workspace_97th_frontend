import type { ColumnKind, PersonDef, StatusDef, TagDef } from "./types";
import type { BoardColumnKind } from "../columnTypes";
import type { ColumnGlyphId } from "./menus/ColumnTypeIcon";
import { PALETTE, PALETTE_CYCLE } from "@/lib/color-palette";

/** Colors new groups cycle through (Tonk's palette, most distinct hues first). Group color is picked with `ColorSwatchGrid`. */
export const GROUP_PALETTE = PALETTE_CYCLE;

/** Colors new Status, Label and Tag options cycle through. */
export const STATUS_PALETTE = PALETTE_CYCLE;

export const LABEL_PALETTE = PALETTE_CYCLE;

export const TAG_PALETTE = PALETTE_CYCLE;

/** Neutral of an empty Status cell. System color, never offered in the picker. */
export const EMPTY_STATUS_COLOR = "#c9ccd4";

/** Neutral of an empty Label cell. System color, never offered in the picker. */
export const EMPTY_LABEL_COLOR = "#9aa0b6";

export const DEFAULT_STATUS_DEFS: StatusDef[] = [
  { id: "sd-empty", label: "", color: EMPTY_STATUS_COLOR, fixed: true },
  { id: "sd-ready", label: "Ready to start", color: PALETTE.blue },
  { id: "sd-backlog", label: "Backlog", color: PALETTE.plum },
  { id: "sd-hold", label: "HOLD", color: PALETTE.orange },
  { id: "sd-pending", label: "Pending", color: PALETTE.deep_teal },
  { id: "sd-next-sprint", label: "Next Sprint", color: PALETTE.rose },
  { id: "sd-reference", label: "Reference", color: PALETTE.charcoal },
  { id: "sd-working", label: "Working on it", color: PALETTE.amber },
  { id: "sd-review", label: "Waiting for review", color: PALETTE.aqua },
  { id: "sd-stuck", label: "Stuck", color: PALETTE.red },
  { id: "sd-deploy", label: "Pending Deploy", color: PALETTE.rust },
  { id: "sd-inprod", label: "In Prod", color: PALETTE.moss },
  { id: "sd-done", label: "Done", color: PALETTE.green },
  { id: "sd-testing", label: "Testing", color: PALETTE.teal },
];

export const DEFAULT_LABEL_DEFS: StatusDef[] = [
  { id: "lb-empty", label: "", color: EMPTY_LABEL_COLOR, fixed: true },
  { id: "lb-low", label: "Low", color: PALETTE.slate },
  { id: "lb-medium", label: "Medium", color: PALETTE.amber },
  { id: "lb-high", label: "High", color: PALETTE.plum },
  { id: "lb-critical", label: "Critical", color: PALETTE.crimson },
];

export const DEFAULT_TAG_DEFS: TagDef[] = [
  { id: "tg-seo", label: "#seo", color: PALETTE.blue },
  { id: "tg-content", label: "#content", color: PALETTE.slate },
  { id: "tg-ppc", label: "#ppc", color: PALETTE.amber },
  { id: "tg-newcontent", label: "#newcontent", color: PALETTE.red },
  { id: "tg-seooptimizations", label: "#seooptimizations", color: PALETTE.plum },
];

export const PEOPLE: PersonDef[] = [
  { id: "AR", initials: "AR", name: "Ana Rivas", color: "#4f6bed" },
  { id: "LM", initials: "LM", name: "Luis Mora", color: "#7b52c9" },
  { id: "DK", initials: "DK", name: "Dana Kim", color: "#2f9e78" },
  { id: "MR", initials: "MR", name: "Marco Ruiz", color: "#e0723f" },
  { id: "JS", initials: "JS", name: "Jane Soto", color: "#c94f7c" },
  { id: "TP", initials: "TP", name: "Tom Palmer", color: "#3a8fc9" },
];

export const DROPDOWN_OPTION_COLORS = PALETTE_CYCLE;

export const DEFAULT_DROPDOWN_OPTIONS = ["Design", "Engineering", "Marketing", "Legal"];

/**
 * Where a type sits in the "+" column gallery: the first two sections are always
 * shown, like monday.com's picker, and "More columns" holds the rest of the
 * catalog behind the gallery's footer button (and in search results).
 */
export type ColumnGallerySection = "Essentials" | "Super useful" | "More columns";

export const COLUMN_GALLERY_SECTIONS: ColumnGallerySection[] = ["Essentials", "Super useful", "More columns"];

export interface ColumnTypeDef {
  kind: ColumnKind;
  label: string;
  /** One line summary, matched by the gallery's "Search or describe your column" box. */
  description: string;
  /** Background of the type's icon chip (see `ColumnTypeIcon`). */
  accent: string;
  section: ColumnGallerySection;
  default_width: number;
  /** Draws another glyph than the kind's own (Priority, a Status column with priority labels). */
  glyph?: ColumnGlyphId;
  /** Starts the new column with these labels instead of the kind's defaults (Priority). */
  preset_options?: { label: string; color: string }[];
  /** Starts a People column with "Assign item creator" on (Reporter), see `ColumnDef.auto_assign_creator`. */
  preset_auto_assign_creator?: boolean;
}

/** monday.com's Priority labels, most urgent first, in Tonk's palette (mirrored by the API import). */
export const PRIORITY_PRESET_OPTIONS = [
  { label: "Critical", color: PALETTE.charcoal },
  { label: "High", color: PALETTE.plum },
  { label: "Medium", color: PALETTE.lavender },
  { label: "Low", color: PALETTE.blue },
];

/** Every column type a board can hold, in the gallery's display order (row by row, two per row). */
export const COLUMN_TYPE_GALLERY: ColumnTypeDef[] = [
  { kind: "status", label: "Status", description: "Track progress with color coded labels", accent: "#00c875", section: "Essentials", default_width: 156 },
  { kind: "dropdown", label: "Dropdown", description: "Pick one or more labels from a list", accent: "#00c875", section: "Essentials", default_width: 180 },
  { kind: "text", label: "Text", description: "Free form text", accent: "#ffcb00", section: "Essentials", default_width: 200 },
  { kind: "date", label: "Date", description: "Pick a calendar date and an optional time", accent: "#a25ddc", section: "Essentials", default_width: 150 },
  { kind: "people", label: "People", description: "Assign owners and teammates", accent: "#66ccff", section: "Essentials", default_width: 132 },
  { kind: "number", label: "Numbers", description: "Store numeric values, budgets or amounts", accent: "#ffcb00", section: "Essentials", default_width: 120 },
  { kind: "files", label: "Files", description: "Attach files, images and documents", accent: "#ff7575", section: "Super useful", default_width: 150 },
  { kind: "timeline", label: "Timeline", description: "A start and end date, drives the Gantt view", accent: "#a25ddc", section: "Super useful", default_width: 196 },
  { kind: "tags", label: "Tags", description: "Hashtag keywords shared across boards", accent: "#fdab3d", section: "Super useful", default_width: 180 },
  { kind: "checkbox", label: "Checkbox", description: "A simple done or not done toggle", accent: "#fdab3d", section: "Super useful", default_width: 110 },
  { kind: "connect_board", label: "Connect boards", description: "Link items from other boards", accent: "#ff7575", section: "Super useful", default_width: 200 },
  { kind: "formula", label: "Formula", description: "Calculate values from other columns", accent: "#4eccc6", section: "Super useful", default_width: 150 },
  { kind: "link", label: "Link", description: "A clickable URL with its own display text", accent: "#66ccff", section: "Super useful", default_width: 200 },
  { kind: "mirror", label: "Mirror", description: "Show a column from connected items", accent: "#4eccc6", section: "Super useful", default_width: 160 },
  { kind: "label", label: "Label", description: "A single outline badge from a color coded list", accent: "#579bfc", section: "More columns", default_width: 132 },
  { kind: "progress", label: "Progress", description: "A manually set 0 to 100% value", accent: "#00c875", section: "More columns", default_width: 156 },
  { kind: "longtext", label: "Long text", description: "A multi line note", accent: "#ffcb00", section: "More columns", default_width: 240 },
  { kind: "phone", label: "Phone", description: "Store a phone number", accent: "#66ccff", section: "More columns", default_width: 180 },
  { kind: "email", label: "Email", description: "Store an email address", accent: "#66ccff", section: "More columns", default_width: 190 },
  { kind: "rating", label: "Rating", description: "Rate items on a 5 star scale", accent: "#fdab3d", section: "More columns", default_width: 140 },
  { kind: "vote", label: "Vote", description: "Let the team vote on items", accent: "#ff7575", section: "More columns", default_width: 160 },
  { kind: "time_tracking", label: "Time Tracking", description: "Track time spent with a start and stop timer", accent: "#a25ddc", section: "More columns", default_width: 180 },
  { kind: "auto_number", label: "Item ID", description: "Show the unique ID of each item", accent: "#4eccc6", section: "More columns", default_width: 140 },
  { kind: "dependency", label: "Dependency", description: "Link items that must finish before this one starts", accent: "#a25ddc", section: "More columns", default_width: 200 },
  { kind: "checklist", label: "Checklist", description: "A to do list inside the cell", accent: "#00c875", section: "More columns", default_width: 200 },
  { kind: "button", label: "Button", description: "Run an automation with one click", accent: "#579bfc", section: "More columns", default_width: 140 },
  { kind: "status", label: "Priority", description: "Prioritize tasks and focus on what is most important", accent: "#ffcb00", section: "More columns", default_width: 140, glyph: "priority", preset_options: PRIORITY_PRESET_OPTIONS },
  { kind: "doc", label: "Doc", description: "Document your work and increase collaboration", accent: "#5559df", section: "More columns", default_width: 170 },
  { kind: "world_clock", label: "World clock", description: "Keep track of the time anywhere in the world", accent: "#00c875", section: "More columns", default_width: 160 },
  { kind: "location", label: "Location", description: "Store an address and open it on a map", accent: "#f65f7c", section: "More columns", default_width: 200 },
  { kind: "people", label: "Reporter", description: "Assign the person who created the item, still editable", accent: "#66ccff", section: "More columns", default_width: 140, preset_auto_assign_creator: true },
  { kind: "creation_log", label: "Creation log", description: "Add the item's creator and creation date automatically", accent: "#5559df", section: "More columns", default_width: 180 },
  { kind: "last_updated", label: "Last updated", description: "Add the person that last updated the item and the date", accent: "#f65f7c", section: "More columns", default_width: 180 },
  { kind: "item_number", label: "Auto number", description: "Number items according to their order in the group", accent: "#ffcb00", section: "More columns", default_width: 110 },
  { kind: "progress_tracking", label: "Progress tracking", description: "Show progress by combining status columns in a battery", accent: "#a25ddc", section: "More columns", default_width: 180 },
  { kind: "week", label: "Week", description: "Select the week on which each item should be completed", accent: "#ffcb00", section: "More columns", default_width: 170 },
  { kind: "country", label: "Country", description: "Choose a country", accent: "#00c875", section: "More columns", default_width: 170 },
  { kind: "color_picker", label: "Color picker", description: "Manage a design system using a color palette", accent: "#00a9ff", section: "More columns", default_width: 180 },
  { kind: "hour", label: "Hour", description: "Add times to manage and schedule tasks, shifts and more", accent: "#ffcb00", section: "More columns", default_width: 120 },
];

/**
 * The config a column picked from a gallery starts with, when its entry is a
 * preset (Priority is a Status column with priority labels, Reporter a People
 * column that assigns the item creator). Looked up by kind and default label,
 * which is what every add column call carries.
 */
export function presetConfigFor(
  kind: ColumnKind,
  label: string
): { options?: { id: string; label: string; color: string; is_active: boolean }[]; auto_assign_creator?: boolean } | undefined {
  const type = COLUMN_TYPE_GALLERY.find((entry) => entry.kind === kind && entry.label === label);
  if (type?.preset_auto_assign_creator) return { auto_assign_creator: true };
  const preset = type?.preset_options;
  if (!preset) return undefined;
  return { options: preset.map((option) => ({ id: crypto.randomUUID(), label: option.label, color: option.color, is_active: true })) };
}

/** The column menu's "Add column to the right" shortlist, in monday.com's order. The rest of the gallery is under "More columns". */
export const QUICK_ADD_COLUMN_KINDS: ColumnKind[] = ["status", "text", "people", "timeline", "date", "tags", "number"];

/**
 * The column menu's "Change column type": the kinds each kind can turn into
 * while its cell values still make sense, the way monday.com only offers
 * compatible types. A kind missing here (formula, mirror, button...) can't be changed.
 */
/** The column kinds that show dates, the only ones the column menu offers "Date format" for. */
export const DATE_DISPLAY_KINDS: ColumnKind[] = ["date", "creation_log", "last_updated"];

export const CHANGE_TYPE_TARGETS: Partial<Record<ColumnKind, ColumnKind[]>> = {
  status: ["text", "longtext", "dropdown"],
  label: ["status", "dropdown", "text", "longtext"],
  dropdown: ["status", "label", "tags", "text", "longtext"],
  text: ["longtext", "number", "email", "phone", "link", "status", "dropdown"],
  longtext: ["text"],
  number: ["text", "longtext", "rating", "progress"],
  // Creation log and Last updated are read only and show the item's own dates. A Date column's
  // stored dates are kept while it is one of them, so changing it back brings them back.
  date: ["timeline", "creation_log", "last_updated", "text"],
  // Back to a Date column, the dates they showed are written into the empty cells (see `BoardDateAutoFiller`).
  // To a People column, each item's creator is kept and new items keep getting theirs (see `BoardPeopleAutoAssigner`).
  creation_log: ["date", "last_updated", "people"],
  last_updated: ["date", "creation_log"],
  timeline: ["date", "text"],
  people: ["text"],
  tags: ["dropdown", "text"],
  email: ["text", "link"],
  phone: ["text"],
  link: ["text"],
  rating: ["number", "text"],
  progress: ["number"],
  checkbox: ["text"],
  vote: ["number"],
};

/**
 * This package's own `ColumnKind` → the generic board engine's `BoardColumnKind`
 * (`../columnTypes`, the vocabulary `boardContentService.createColumn` and the
 * rest of the engine's API layer speak) — used when a column picked from the
 * "+" gallery here (`COLUMN_TYPE_GALLERY`) must be persisted through
 * `TableBoardView`'s `onAddColumn`. The reverse mapping is `TABLE_COLUMN_KIND`
 * in `TableBoardView.tsx`.
 */
export const TABLE_KIND_TO_ENGINE_KIND: Record<ColumnKind, BoardColumnKind> = {
  text: "text",
  longtext: "long_text",
  number: "number",
  status: "status",
  label: "label",
  date: "date",
  timeline: "timeline",
  people: "people",
  progress: "progress",
  dropdown: "dropdown",
  tags: "tags",
  checkbox: "checkbox",
  phone: "phone",
  email: "email",
  rating: "rating",
  vote: "vote",
  link: "link",
  files: "files",
  time_tracking: "time_tracking",
  auto_number: "auto_number",
  dependency: "dependency",
  formula: "formula",
  connect_board: "connect_board",
  mirror: "mirror",
  checklist: "checklist",
  button: "button",
  doc: "doc",
  world_clock: "world_clock",
  location: "location",
  creation_log: "creation_log",
  last_updated: "last_updated",
  item_number: "item_number",
  week: "week",
  country: "country",
  color_picker: "color_picker",
  hour: "hour",
  progress_tracking: "progress_tracking",
};

export const TEXT_FAMILY_KINDS: ColumnKind[] = ["text", "longtext", "phone", "email"];
export const ARRAY_VALUE_KINDS: ColumnKind[] = ["people", "dropdown", "tags"];

export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Shared clamp for a column's `width`, whether set from the header menu's numeric input or by dragging its resize handle. */
export const MIN_COLUMN_WIDTH = 40;
export const MAX_COLUMN_WIDTH = 600;

/** Longest item or subitem name the API accepts (`board_items.name` is a `varchar(255)` column). */
export const ITEM_NAME_MAX_LENGTH = 255;
