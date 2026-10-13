import { COLUMN_TYPE_GALLERY, type ColumnTypeDef } from "../constants";
import type { ColumnKind } from "../types";

/** One column type card in the Column Center. */
export interface ColumnCenterEntry {
  /** Unique per card, `kind` plus the gallery label (Status and Priority share a kind). */
  id: string;
  type: ColumnTypeDef;
  title: string;
  description: string;
  /** The Column Center's own icon color, brighter than the compact menu's. */
  accent: string;
}

/** A featured card, drawn with a wide illustration above its text. */
export interface ColumnCenterFeature extends ColumnCenterEntry {
  illustration: "dependency" | "progress_tracking" | "time_tracking";
}

/** Several columns added together in one click. */
export interface ColumnCenterCombo {
  id: string;
  title: string;
  description: string;
  entries: ColumnCenterEntry[];
}

export type ColumnCenterCategoryId = "featured" | "essentials" | "super_useful" | "team_power_up" | "board_power_up" | "combos";

export interface ColumnCenterCategory {
  id: ColumnCenterCategoryId;
  label: string;
}

/**
 * The categories in monday.com's order. "AI-powered" and "Marketplace apps"
 * are left out on purpose: AI columns are not offered in this app, and there
 * is no marketplace to list.
 */
export const COLUMN_CENTER_CATEGORIES: ColumnCenterCategory[] = [
  { id: "featured", label: "Featured" },
  { id: "essentials", label: "Essentials" },
  { id: "super_useful", label: "Super useful" },
  { id: "team_power_up", label: "Team Power-Up" },
  { id: "board_power_up", label: "Board Power-Up" },
  { id: "combos", label: "Combos" },
];

function galleryType(kind: ColumnKind, label?: string): ColumnTypeDef {
  const type = COLUMN_TYPE_GALLERY.find((entry) => entry.kind === kind && (label === undefined || entry.label === label));
  if (!type) throw new Error(`No gallery entry for the ${kind} column type`);
  return type;
}

function entry(kind: ColumnKind, description: string, accent: string, label?: string): ColumnCenterEntry {
  const type = galleryType(kind, label);
  return { id: `${type.kind}:${type.label}`, type, title: type.label, description, accent };
}

const STATUS = entry("status", "Get an instant overview of where things stand", "#00c875", "Status");
const PRIORITY = entry("status", "Prioritize tasks and focus on what is most important", "#ffcb00", "Priority");
const LABEL = entry("label", "Categorize and triage work with custom labels", "#a25ddc");
const PEOPLE = entry("people", "Assign people to improve team work", "#00c2e8");
const DOC = entry("doc", "Document your work and increase collaboration", "#5559df");
const NUMBERS = entry("number", "Add revenue, costs, time estimations and more", "#ffcb00");
const TIMELINE = entry("timeline", "Visualize your item's duration, with a start and end date", "#a25ddc");
const DATE = entry("date", "Add dates like deadlines to ensure you never drop the ball", "#00d26a");
const TEXT = entry("text", "Add textual information e.g. addresses, names or keywords", "#00a9ff");
const LONG_TEXT = entry("longtext", "Add large amounts of text without changing column width", "#5559df");
const CONNECT_BOARDS = entry("connect_board", "Connect data from other boards", "#f65f7c");
const MIRROR = entry("mirror", "Show and edit columns' data from connected boards", "#f65f7c");

const CHECKBOX = entry("checkbox", "Check off items and see what's done at a glance", "#ffcb00");
const LINK = entry("link", "Simply hyperlink to any website", "#00a9ff");
const WORLD_CLOCK = entry("world_clock", "Keep track of the time anywhere in the world", "#00d26a");
const ITEM_ID = entry("auto_number", "Show a unique ID for each item", "#00a9ff");
const PHONE = entry("phone", "Call your contacts directly from your board", "#5559df");
const LOCATION = entry("location", "Place your locations and open them on a map", "#f65f7c");
const FILES = entry("files", "Add files & docs to your item", "#00c2e8");

const TAGS = entry("tags", "Add tags to categorize items across multiple boards", "#a25ddc");
const VOTE = entry("vote", "Vote on an item e.g. pick a new feature or a favorite lunch place", "#00d26a");
const RATING = entry("rating", "Rate or rank anything visually", "#00a9ff");
const CREATION_LOG = entry("creation_log", "Add the item's creator and creation date automatically", "#5559df");
const LAST_UPDATED = entry("last_updated", "Add the person that last updated the item and the date", "#f65f7c");
const AUTO_NUMBER = entry("item_number", "Number items according to their order in the group", "#ffcb00");
const PROGRESS_TRACKING = entry("progress_tracking", "Show progress by combining status columns in a battery", "#a25ddc");
const CHECKLIST = entry("checklist", "Break an item into sub-tasks and check them off", "#00d26a");

const BUTTON = entry("button", "Perform actions on items by clicking a button", "#5559df");
const DEPENDENCY = entry("dependency", "Set up dependencies between items in the board", "#5559df");
const DROPDOWN = entry("dropdown", "Create a dropdown list of options", "#00d26a");
const WEEK = entry("week", "Select the week on which each item should be completed", "#ffcb00");
const FORMULA = entry("formula", "Use functions to manipulate data across multiple columns", "#5559df");
const COUNTRY = entry("country", "Choose a country", "#00d26a");
const COLOR_PICKER = entry("color_picker", "Manage a design system using a color palette", "#00a9ff");
const TIME_TRACKING = entry("time_tracking", "Easily track time spent on each item, group, and board", "#ffcb00");
const HOUR = entry("hour", "Add times to manage and schedule tasks, shifts and more", "#ffcb00");
const EMAIL = entry("email", "Email team members and clients directly from your board", "#ffcb00");
const PROGRESS = entry("progress", "Set a 0 to 100% progress bar by hand", "#00c875");

export const COLUMN_CENTER_FEATURED: ColumnCenterFeature[] = [
  { ...DEPENDENCY, illustration: "dependency" },
  { ...PROGRESS_TRACKING, title: "Progress tracking", illustration: "progress_tracking" },
  { ...TIME_TRACKING, title: "Time tracking", illustration: "time_tracking" },
];

/** Every regular category's cards, in monday.com's order. */
export const COLUMN_CENTER_SECTIONS: Record<Exclude<ColumnCenterCategoryId, "featured" | "combos">, ColumnCenterEntry[]> = {
  essentials: [STATUS, PRIORITY, LABEL, PEOPLE, DOC, NUMBERS, TIMELINE, DATE, TEXT, LONG_TEXT, CONNECT_BOARDS, MIRROR],
  super_useful: [CHECKBOX, LINK, WORLD_CLOCK, ITEM_ID, PHONE, LOCATION, FILES],
  team_power_up: [TAGS, VOTE, RATING, CREATION_LOG, LAST_UPDATED, AUTO_NUMBER, PROGRESS_TRACKING, CHECKLIST],
  board_power_up: [BUTTON, DEPENDENCY, DROPDOWN, WEEK, FORMULA, COUNTRY, COLOR_PICKER, TIME_TRACKING, HOUR, EMAIL, PROGRESS],
};

export const COLUMN_CENTER_COMBOS: ColumnCenterCombo[] = [
  { id: "project_tracking", title: "Project tracking", description: "Owner, status and timeline to run any project", entries: [PEOPLE, STATUS, TIMELINE] },
  { id: "task_priorities", title: "Task priorities", description: "Know what to work on next with a status, a priority and a due date", entries: [STATUS, PRIORITY, DATE] },
  { id: "time_management", title: "Time management", description: "Plan the week and track the time it really took", entries: [WEEK, TIME_TRACKING, NUMBERS] },
  { id: "item_history", title: "Item history", description: "See who created each item and who changed it last", entries: [CREATION_LOG, LAST_UPDATED] },
];

/** Every card once (Dependency and Progress tracking appear in two categories), for the search box. */
export const COLUMN_CENTER_ALL_ENTRIES: ColumnCenterEntry[] = Array.from(
  new Map(Object.values(COLUMN_CENTER_SECTIONS).flat().map((card) => [card.id, card])).values()
);
