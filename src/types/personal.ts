/** The workspace a board belongs to, as the personal pages show it. */
export type PersonalWorkspaceSummary = {
  id: number;
  name: string;
  slug?: string;
  color: string | null;
  mono: string | null;
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

/** `GET /api/home/recent-boards`, one board the user opened recently. */
export type RecentBoardDto = {
  id: number;
  label: string;
  view_key: string | null;
  board_type: string | null;
  is_favorite: boolean;
  visited_at: string;
  workspace: PersonalWorkspaceSummary | null;
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
