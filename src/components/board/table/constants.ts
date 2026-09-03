import type { ColumnKind, PersonDef, StatusDef, TagDef } from "./types";

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

export interface ColumnTypeDef {
  kind: ColumnKind;
  label: string;
  mark: string;
  accent: string;
  section: "Essentials" | "Super useful";
  default_width: number;
}

export const COLUMN_TYPE_GALLERY: ColumnTypeDef[] = [
  { kind: "status", label: "Status", mark: "≡", accent: "#12c46b", section: "Essentials", default_width: 156 },
  { kind: "dropdown", label: "Dropdown", mark: "▾", accent: "#2f9e78", section: "Essentials", default_width: 180 },
  { kind: "text", label: "Text", mark: "T", accent: "#e8b23a", section: "Essentials", default_width: 200 },
  { kind: "date", label: "Date", mark: "31", accent: "#7b52c9", section: "Essentials", default_width: 150 },
  { kind: "label", label: "Label", mark: "◇", accent: "#5b3fbd", section: "Essentials", default_width: 132 },
  { kind: "progress", label: "Progress", mark: "%", accent: "#4f6bed", section: "Essentials", default_width: 156 },
  { kind: "timeline", label: "Timeline", mark: "▭", accent: "#4f6bed", section: "Essentials", default_width: 196 },
  { kind: "people", label: "People", mark: "◎", accent: "#4f6bed", section: "Essentials", default_width: 132 },
  { kind: "number", label: "Numbers", mark: "#", accent: "#f2a53c", section: "Essentials", default_width: 120 },
  { kind: "longtext", label: "Long text", mark: "¶", accent: "#e8b23a", section: "Essentials", default_width: 240 },
  { kind: "phone", label: "Phone", mark: "☎", accent: "#f2a53c", section: "Super useful", default_width: 150 },
  { kind: "email", label: "Email", mark: "@", accent: "#f2662a", section: "Super useful", default_width: 190 },
  { kind: "tags", label: "Tags", mark: "#", accent: "#12c46b", section: "Super useful", default_width: 180 },
  { kind: "checkbox", label: "Checkbox", mark: "✓", accent: "#12c46b", section: "Super useful", default_width: 110 },
];

export const TEXT_FAMILY_KINDS: ColumnKind[] = ["text", "longtext", "phone", "email"];
export const ARRAY_VALUE_KINDS: ColumnKind[] = ["people", "dropdown", "tags"];

export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const DAY_OF_WEEK_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
