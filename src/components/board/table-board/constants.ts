import type { BoardItem, BoardSimpleItem, Person, TableBoardOption } from "./types";

export const PEOPLE: Record<string, Person> = {
  AR: { id: "AR", initials: "AR", name: "Ana Rivas", avatar_bg: "#4f6bed" },
  LM: { id: "LM", initials: "LM", name: "Luis Mora", avatar_bg: "#7b52c9" },
  DK: { id: "DK", initials: "DK", name: "Dana Kim", avatar_bg: "#2f9e78" },
  MR: { id: "MR", initials: "MR", name: "Marco Ruiz", avatar_bg: "#e0723f" },
  JS: { id: "JS", initials: "JS", name: "Jane Soto", avatar_bg: "#c94f7c" },
  TP: { id: "TP", initials: "TP", name: "Tomás Peña", avatar_bg: "#3a8fc9" },
};

export const BOARD_STATUSES: string[] = [
  "",
  "Ready to start",
  "Backlog",
  "HOLD",
  "Pending",
  "Next Sprint",
  "Reference",
  "In Progress",
  "Working on it",
  "Waiting for review",
  "Stuck",
  "Pending Deploy",
  "In Prod",
  "Done",
  "Testing",
];

export const STATUS_BACKGROUND: Record<string, string> = {
  "": "#c9ccd4",
  "Ready to start": "#2074d4",
  Backlog: "#7b3f98",
  HOLD: "#f2662a",
  Pending: "#1f5b9e",
  "Next Sprint": "#f453b0",
  Reference: "#3a3a3a",
  "In Progress": "#f2a53c",
  "Waiting for review": "#9dd6f2",
  Stuck: "#e04455",
  "Pending Deploy": "#8a6248",
  "In Prod": "#12724a",
  Done: "#12c46b",
  Testing: "#1071c4",
  "Working on it": "#f2a53c",
};

const STATUS_FOREGROUND: Record<string, string> = {
  "": "#c9ccd4",
  "Waiting for review": "#e8f6fd",
};

export const getStatusBackground = (status: string): string => STATUS_BACKGROUND[status] || "#c9ccd4";
export const getStatusForeground = (status: string): string => STATUS_FOREGROUND[status] || "#ffffff";

/**
 * `BOARD_STATUSES`/`getStatusBackground` as a plain {@link TableBoardOption}
 * list — the shape `StatusCell`/`StatusMenu` actually render from, so the
 * standalone preview (this file) and the real, backend-driven board (which
 * builds the same shape from a real status column's `config.options`) share
 * one component contract. A status id and its label are the same string here
 * (there's no separate backing column in the mock), unlike the real board's
 * server-generated option ids.
 */
export const STATUS_OPTIONS: TableBoardOption[] = BOARD_STATUSES.filter((status) => status !== "").map((status) => ({
  id: status,
  label: status,
  color: getStatusBackground(status),
}));

export const PRIORITY_OPTIONS: TableBoardOption[] = [
  { id: "Low", label: "Low", color: "#5b6180" },
  { id: "Medium", label: "Medium", color: "#8a6d1f" },
  { id: "High", label: "High", color: "#5b3fbd" },
  { id: "Critical", label: "Critical", color: "#b02f43" },
];

/** {@link PEOPLE} as a plain array — the shape `OwnerCell`/`OwnerMenu` render from. See {@link STATUS_OPTIONS}'s own doc for why. */
export const PEOPLE_OPTIONS: Person[] = Object.values(PEOPLE);

export const TREE_GROUP_GRID_COLUMNS = "grid-cols-[36px_minmax(260px,1fr)_56px_108px_156px_148px_132px_156px]";

export const createInitialTreeItems = (): BoardItem[] => [
  {
    id: "i1",
    name: "Payment method selector",
    owner_ids: ["AR", "LM"],
    status: "Working on it",
    date: "Sep 17, 2026",
    priority: "High",
    subitems: [
      { id: "i1-s1", name: "Card tokenization spike", owner_ids: ["AR"], status: "Done", date: "Sep 8, 2026" },
      { id: "i1-s2", name: "Apple Pay / Google Pay sheet", owner_ids: ["LM", "DK", "MR"], status: "Working on it", date: "Sep 19, 2026" },
      { id: "i1-s3", name: "Saved cards empty state", owner_ids: [], status: "", date: "" },
    ],
  },
  {
    id: "i2",
    name: "Guest checkout flow",
    owner_ids: ["LM", "DK", "MR", "JS", "TP"],
    status: "Stuck",
    date: "Sep 24, 2026",
    priority: "Critical",
    subitems: [
      { id: "i2-s1", name: "Email-only identity step", owner_ids: ["LM", "JS"], status: "Working on it", date: "Sep 22, 2026" },
      { id: "i2-s2", name: "Merge guest order on signup", owner_ids: ["DK"], status: "", date: "" },
      { id: "i2-s3", name: "Fraud review threshold", owner_ids: [], status: "Stuck", date: "Sep 30, 2026" },
      { id: "i2-s4", name: "Legal copy review", owner_ids: ["MR", "TP"], status: "", date: "" },
    ],
  },
  {
    id: "i3",
    name: "Address autocomplete",
    owner_ids: ["DK", "AR"],
    status: "Working on it",
    date: "Oct 02, 2026",
    priority: "Medium",
    subitems: [
      { id: "i3-s1", name: "Provider evaluation", owner_ids: ["DK"], status: "Done", date: "Sep 5, 2026" },
      { id: "i3-s2", name: "Fallback manual entry", owner_ids: ["AR", "MR"], status: "Working on it", date: "Oct 01, 2026" },
    ],
  },
  {
    id: "i4",
    name: "Order summary redesign",
    owner_ids: ["MR"],
    status: "Done",
    date: "Aug 29, 2026",
    priority: "Low",
    subitems: [],
  },
];

export const createInitialFlatItems = (): BoardSimpleItem[] => [
  { id: "b1", name: "Post-purchase survey", owner_id: "MR", status: "Working on it", date: "Oct 09, 2026", priority: "Low", progress: 35 },
  { id: "b2", name: "Churn interview round 2", owner_id: "AR", status: "", date: "", priority: "Medium", progress: 10 },
];

export const INITIAL_OPEN_IDS: Record<string, boolean> = { i1: true, i3: true };
export const INITIAL_SELECTED_IDS: Record<string, boolean> = { "i3-s2": true };
