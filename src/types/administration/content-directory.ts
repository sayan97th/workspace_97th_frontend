/** API types for Administration > Content directory and Tidy up, mirroring `AdminContentBoardResource`. */

export type AdminBoardType = "main" | "private" | "shareable";

export type AdminContentBoardDto = {
  id: number;
  label: string;
  board_type: AdminBoardType;
  is_archived: boolean;
  archived_at: string | null;
  items_count: number;
  created_at: string;
  last_activity_at: string | null;
  workspace: { id: number; name: string } | null;
  owner: { id: number; full_name: string; profile_photo_url: string | null; is_deactivated: boolean } | null;
  creator: { id: number; full_name: string } | null;
};

export type AdminContentPage = {
  data: AdminContentBoardDto[];
  current_page: number;
  last_page: number;
  total: number;
};

/** Mirrors `AdminBoardQuery::ALLOWED_SORT_FIELDS`. */
export type AdminContentSortField = "label" | "workspace" | "owner" | "items_count" | "created_at" | "last_activity_at";

export type AdminContentQuery = {
  search?: string;
  page?: number;
  per_page?: number;
  sort_field?: AdminContentSortField;
  sort_direction?: "asc" | "desc";
  /** Tidy up: only boards with no activity in the last N days. */
  inactive_days?: number;
  filter_params?: Record<string, string>;
  ids?: number[];
};

export type AdminContentFilterOptionsDto = {
  workspaces: { id: number; name: string }[];
  owners: { id: number; full_name: string; profile_photo_url: string | null; is_deactivated: boolean }[];
};

export type AdminBulkBoardResult = {
  message: string;
  updated_count: number;
  skipped_count: number;
};
