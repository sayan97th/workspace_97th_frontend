/** The workspace a board belongs to, as the personal pages show it. */
export type PersonalWorkspaceSummary = {
  id: number;
  name: string;
  slug?: string;
  color: string | null;
  mono: string | null;
  avatar_url?: string | null;
};

/** `GET /api/favorites`, one starred board or folder. */
export type FavoriteItemDto = {
  id: number;
  label: string;
  type: "leaf" | "group";
  view_key: string | null;
  board_type: string | null;
  workspace: PersonalWorkspaceSummary | null;
};

/** `GET /api/favorites`: starred boards and folders plus whole starred workspaces. */
export type FavoritesResponseDto = {
  data: FavoriteItemDto[];
  workspaces: PersonalWorkspaceSummary[];
};

/** One group of a recent board's snapshot, drawn as a colored bar with its rows. */
export type RecentBoardPreviewGroup = { id: number; name: string; color: string | null; item_count: number };

/**
 * What a "Recently visited" card previews: the kind of the tab the user last
 * had open, or `doc_page` for a Doc and `workspace` for Manage Workspace.
 */
export type RecentBoardPreviewKind =
  | "table"
  | "kanban"
  | "gantt"
  | "calendar"
  | "chart"
  | "dashboard"
  | "workload"
  | "canvas"
  | "doc"
  | "doc_page"
  | "form"
  | "file_gallery"
  | "workspace";

/** One Table preview cell: its real Status/Label color, or only whether it holds a value. */
export type RecentBoardPreviewCell = { color: string | null; filled: boolean };

/** A sample Table row. `name_ratio` (0.3 to 1) follows the item name's length. */
export type RecentBoardPreviewRow = { name_ratio: number; cells: RecentBoardPreviewCell[] };

export type RecentBoardTablePreview = {
  /** Column kinds drawn next to the name, e.g. `["status", "people", "date"]`. */
  columns: string[];
  /** Sample rows keyed by group id. */
  rows: Record<string, RecentBoardPreviewRow[]>;
};

export type RecentBoardKanbanCard = { name_ratio: number; people_count: number; has_date: boolean };

export type RecentBoardKanbanPreview = {
  lanes: Array<{ label: string; color: string; item_count: number; cards: RecentBoardKanbanCard[] }>;
};

/** Timeline bars as fractions (0 to 1) of the span they cover. */
export type RecentBoardGanttPreview = {
  bars: Array<{ start: number; end: number; color: string; is_milestone: boolean }>;
  today: number | null;
};

export type RecentBoardCalendarPreview = {
  year: number;
  /** 1 to 12. */
  month: number;
  /** Weekday of the 1st, 0 is Sunday. */
  first_weekday: number;
  day_count: number;
  today: number | null;
  events: Array<{ day: number; color: string }>;
};

export type RecentBoardChartPreview = {
  chart_type: "bar" | "stacked_bar" | "line" | "pie" | "donut" | string;
  points: Array<{ label: string; color: string | null; value: number }>;
  series: Array<{ color: string | null; values: number[] }>;
};

export type RecentBoardDocBlock = {
  type: "heading" | "paragraph" | "bullet" | "numbered" | "todo" | "image" | "code" | "quote" | "divider" | "table";
  text: string | null;
  level?: number;
  checked?: boolean;
};

export type RecentBoardDocPreview = { blocks: RecentBoardDocBlock[]; word_count: number };

export type RecentBoardFormPreview = {
  title: string;
  accent_color: string;
  question_count: number;
  questions: Array<{ label: string; type: string }>;
};

export type RecentBoardFilesPreview = {
  file_count: number;
  files: Array<{ extension: string; is_image: boolean; url: string | null }>;
};

export type RecentBoardWorkspacePreview = {
  color: string | null;
  cover_url: string | null;
  board_count: number;
  doc_count: number;
  member_count: number;
};

/**
 * The card snapshot of a board's last opened tab. The base fields come from
 * the board's items, the optional block matching `kind` carries what that
 * kind of tab draws.
 */
export type RecentBoardPreview = {
  kind: RecentBoardPreviewKind;
  /** The tab's name, null for a Doc page or Manage Workspace. */
  view_label: string | null;
  item_count: number;
  group_count: number;
  groups: RecentBoardPreviewGroup[];
  table?: RecentBoardTablePreview;
  kanban?: RecentBoardKanbanPreview;
  gantt?: RecentBoardGanttPreview;
  calendar?: RecentBoardCalendarPreview;
  chart?: RecentBoardChartPreview;
  doc?: RecentBoardDocPreview;
  form?: RecentBoardFormPreview;
  files?: RecentBoardFilesPreview;
  workload?: { loads: number[] };
  workspace?: RecentBoardWorkspacePreview;
};

/** `GET /api/home/recent-boards`, one board the user opened recently. */
export type RecentBoardDto = {
  id: number;
  label: string;
  view_key: string | null;
  board_type: string | null;
  is_favorite: boolean;
  visited_at: string;
  workspace: PersonalWorkspaceSummary | null;
  /** Null for a board without a primary view. */
  preview: RecentBoardPreview | null;
};

export type MyWorkStatus = { id: string; label: string; color: string };

export type MyWorkPerson = {
  id: number;
  full_name: string;
  profile_photo_url: string | null;
  is_deactivated: boolean;
};

/** `GET /api/my-work`, one item the user is assigned to. */
export type MyWorkItemDto = {
  id: number;
  name: string;
  parent: { id: number; name: string } | null;
  board: { id: number; label: string; workspace: Omit<PersonalWorkspaceSummary, "slug"> | null };
  group: { id: number; name: string; color: string };
  /** The item's first Status column, used for the inline status picker. */
  status_column_id: number | null;
  status: MyWorkStatus | null;
  /** A Status column labeled "Priority", edited like Status. */
  priority_column_id: number | null;
  priority: MyWorkStatus | null;
  /** Everyone in the People column that assigns the item to the user. */
  people: MyWorkPerson[];
  /** Updates posted on the item, replies included. */
  updates_count: number;
  /** The column the due date comes from: a Date column, or a Timeline (its end date). */
  date_column: { id: number; type: "date" | "timeline"; label: string } | null;
  date: { value: string; start: string | null } | null;
  /** The item's first Timeline, sent even when the due date comes from a Date column. */
  timeline: { start: string | null; end: string | null } | null;
  is_done: boolean;
  can_edit: boolean;
  updated_at: string | null;
};

export type MyWorkResponseDto = {
  items: MyWorkItemDto[];
  /** The options of every Status and Priority column the items use, keyed by column id. */
  status_columns: Record<string, { id: number; label: string; options: MyWorkStatus[] }>;
};

/** `GET /api/my-work/boards`, a board "New item" can add to. */
export type MyWorkBoardDto = {
  id: number;
  label: string;
  workspace: Omit<PersonalWorkspaceSummary, "slug"> | null;
};

/** One Status or Priority column of a board, with the options the "New Item" dialog offers. */
export type MyWorkFormStatusColumn = { id: number; label: string; options: MyWorkStatus[] };

/** `GET /api/my-work/boards/{board_id}/form`, what the "New Item" dialog can fill in on a board. */
export type MyWorkBoardFormDto = {
  groups: { id: number; name: string; color: string }[];
  people_column: { id: number; label: string } | null;
  date_column: { id: number; label: string; type: "date" | "timeline" } | null;
  status_column: MyWorkFormStatusColumn | null;
  priority_column: MyWorkFormStatusColumn | null;
};

/**
 * `POST /api/my-work/items` body. `date` is the section's (or calendar day's)
 * due date, when it has one. The rest are optional picks from the dialog,
 * the board's first group is used when `group_id` is left out.
 */
export type CreateMyWorkItemPayload = {
  board_id: number;
  name: string;
  date: string | null;
  group_id?: number | null;
  status?: string | null;
  priority?: string | null;
};

/** `POST /api/my-work/items`. `is_assigned` is false when the board has no People column to assign the user in. */
export type CreateMyWorkItemResponseDto = {
  message: string;
  item: { id: number; board_id: number; name: string };
  is_assigned: boolean;
};
