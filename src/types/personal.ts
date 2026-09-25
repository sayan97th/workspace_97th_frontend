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
  /** The column the due date comes from: a Date column, or a Timeline (its end date). */
  date_column: { id: number; type: "date" | "timeline" } | null;
  date: { value: string; start: string | null } | null;
  is_done: boolean;
  can_edit: boolean;
  updated_at: string | null;
};

export type MyWorkResponseDto = {
  items: MyWorkItemDto[];
  /** The options of every Status column the items use, keyed by column id. */
  status_columns: Record<string, { id: number; label: string; options: MyWorkStatus[] }>;
};
