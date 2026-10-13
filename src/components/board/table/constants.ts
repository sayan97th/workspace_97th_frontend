import type { ColumnKind, PersonDef, StatusDef, TagDef } from "./types";
import type { BoardColumnKind } from "../columnTypes";

export const GROUP_PALETTE = [
  "#4f6bed", "#2f9e78", "#a25ddc", "#e2b203", "#0086c0", "#e04455",
  "#12c46b", "#fdab3d", "#f453b0", "#1a7fa8", "#7b52c9", "#f2662a",
  "#0f8f7e", "#c9a227", "#2074d4", "#b03060", "#3faf5a", "#8a6248",
  "#5a3fc0", "#d4763a", "#12724a", "#c94f8f", "#3a8fc9", "#6b7189",
];

export const STATUS_PALETTE = [
  "#2074d4", "#1071c4", "#3a8fc9", "#7b3f98", "#7b52c9", "#12c46b",
  "#12724a", "#2f9e78", "#f2a53c", "#f2662a", "#e04455", "#f453b0",
  "#8a6248", "#3a3a3a", "#9dd6f2", "#6b7189", "#e2b203", "#c9ccd4",
];

export const LABEL_PALETTE = ["#2074d4", "#7b52c9", "#12c46b", "#f2a53c", "#e04455", "#f453b0", "#12724a", "#3a8fc9"];

export const TAG_PALETTE = ["#2074d4", "#9aa0b6", "#e8b23a", "#e04455", "#a24ec9", "#12724a", "#f2662a", "#3a8fc9"];

export const DEFAULT_STATUS_DEFS: StatusDef[] = [
  { id: "sd-empty", label: "", color: "#c9ccd4", fixed: true },
  { id: "sd-ready", label: "Ready to start", color: "#2074d4" },
  { id: "sd-backlog", label: "Backlog", color: "#7b3f98" },
  { id: "sd-hold", label: "HOLD", color: "#f2662a" },
  { id: "sd-pending", label: "Pending", color: "#1f5b9e" },
  { id: "sd-next-sprint", label: "Next Sprint", color: "#f453b0" },
  { id: "sd-reference", label: "Reference", color: "#3a3a3a" },
  { id: "sd-working", label: "Working on it", color: "#f2a53c" },
  { id: "sd-review", label: "Waiting for review", color: "#9dd6f2" },
  { id: "sd-stuck", label: "Stuck", color: "#e04455" },
  { id: "sd-deploy", label: "Pending Deploy", color: "#8a6248" },
  { id: "sd-inprod", label: "In Prod", color: "#12724a" },
  { id: "sd-done", label: "Done", color: "#12c46b" },
  { id: "sd-testing", label: "Testing", color: "#1071c4" },
];

export const DEFAULT_LABEL_DEFS: StatusDef[] = [
  { id: "lb-empty", label: "", color: "#9aa0b6", fixed: true },
  { id: "lb-low", label: "Low", color: "#5b6180" },
  { id: "lb-medium", label: "Medium", color: "#8a6d1f" },
  { id: "lb-high", label: "High", color: "#5b3fbd" },
  { id: "lb-critical", label: "Critical", color: "#b02f43" },
];

export const DEFAULT_TAG_DEFS: TagDef[] = [
  { id: "tg-seo", label: "#seo", color: "#2074d4" },
  { id: "tg-content", label: "#content", color: "#9aa0b6" },
  { id: "tg-ppc", label: "#ppc", color: "#e8b23a" },
  { id: "tg-newcontent", label: "#newcontent", color: "#e04455" },
  { id: "tg-seooptimizations", label: "#seooptimizations", color: "#a24ec9" },
];

export const PEOPLE: PersonDef[] = [
  { id: "AR", initials: "AR", name: "Ana Rivas", color: "#4f6bed" },
  { id: "LM", initials: "LM", name: "Luis Mora", color: "#7b52c9" },
  { id: "DK", initials: "DK", name: "Dana Kim", color: "#2f9e78" },
  { id: "MR", initials: "MR", name: "Marco Ruiz", color: "#e0723f" },
  { id: "JS", initials: "JS", name: "Jane Soto", color: "#c94f7c" },
  { id: "TP", initials: "TP", name: "Tom Palmer", color: "#3a8fc9" },
];

export const DROPDOWN_OPTION_COLORS = ["#579bfc", "#00c875", "#fdab3d", "#e2445c", "#a25ddc", "#66ccff", "#037f4c", "#ff7575"];

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
}

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
  { kind: "phone", label: "Phone", description: "Store a phone number", accent: "#66ccff", section: "More columns", default_width: 150 },
  { kind: "email", label: "Email", description: "Store an email address", accent: "#66ccff", section: "More columns", default_width: 190 },
  { kind: "rating", label: "Rating", description: "Rate items on a 5 star scale", accent: "#fdab3d", section: "More columns", default_width: 140 },
  { kind: "vote", label: "Vote", description: "Let the team vote on items", accent: "#ff7575", section: "More columns", default_width: 110 },
  { kind: "time_tracking", label: "Time Tracking", description: "Track time spent with a start and stop timer", accent: "#a25ddc", section: "More columns", default_width: 150 },
  { kind: "auto_number", label: "Item ID", description: "A read only number assigned when an item is created", accent: "#4eccc6", section: "More columns", default_width: 100 },
  { kind: "dependency", label: "Dependency", description: "Link items that must finish before this one starts", accent: "#a25ddc", section: "More columns", default_width: 200 },
  { kind: "checklist", label: "Checklist", description: "A to do list inside the cell", accent: "#00c875", section: "More columns", default_width: 200 },
  { kind: "button", label: "Button", description: "Run an automation with one click", accent: "#579bfc", section: "More columns", default_width: 140 },
];

/** The column menu's "Add column to the right" shortlist, in monday.com's order. The rest of the gallery is under "More columns". */
export const QUICK_ADD_COLUMN_KINDS: ColumnKind[] = ["status", "text", "people", "timeline", "date", "tags", "number"];

/**
 * The column menu's "Change column type": the kinds each kind can turn into
 * while its cell values still make sense, the way monday.com only offers
 * compatible types. A kind missing here (formula, mirror, button...) can't be changed.
 */
export const CHANGE_TYPE_TARGETS: Partial<Record<ColumnKind, ColumnKind[]>> = {
  status: ["text", "longtext", "dropdown"],
  label: ["status", "dropdown", "text", "longtext"],
  dropdown: ["status", "label", "tags", "text", "longtext"],
  text: ["longtext", "number", "email", "phone", "link", "status", "dropdown"],
  longtext: ["text"],
  number: ["text", "longtext", "rating", "progress"],
  date: ["timeline", "text"],
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
};

export const TEXT_FAMILY_KINDS: ColumnKind[] = ["text", "longtext", "phone", "email"];
export const ARRAY_VALUE_KINDS: ColumnKind[] = ["people", "dropdown", "tags"];

export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Shared clamp for a column's `width`, whether set from the header menu's numeric input or by dragging its resize handle. */
export const MIN_COLUMN_WIDTH = 40;
export const MAX_COLUMN_WIDTH = 600;
