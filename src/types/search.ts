import type { BoardType } from "@/types/workspace";

/**
 * API types for the top bar's "Search for anything..." box.
 *
 * These mirror the payload of `GET /api/search`
 * (`App\Http\Controllers\Search\GlobalSearchController` in workspace_97th_api).
 */

/** Minimal workspace reference embedded on a board or item result. */
export type SearchWorkspaceRef = {
  id: number;
  slug: string;
  name: string;
};

export type SearchWorkspaceResult = SearchWorkspaceRef & {
  mono: string;
  color: string;
  avatar_url: string | null;
};

export type SearchAssetType = "board" | "doc" | "dashboard" | "workflow";

export type SearchBoardResult = {
  id: number;
  label: string;
  asset_type: SearchAssetType;
  board_type: BoardType;
  icon: string | null;
  workspace: SearchWorkspaceRef;
};

export type SearchItemResult = {
  id: number;
  name: string;
  is_subitem: boolean;
  /** Name of the parent item when this result is a subitem, otherwise null. */
  parent_name: string | null;
  /** Tab (board view) the item lives on, needed to open its drawer in the right tab. */
  view_id: number;
  board: { id: number; label: string };
  workspace: SearchWorkspaceRef;
};

export type GlobalSearchResults = {
  workspaces: SearchWorkspaceResult[];
  boards: SearchBoardResult[];
  items: SearchItemResult[];
};

export const empty_global_search_results: GlobalSearchResults = {
  workspaces: [],
  boards: [],
  items: [],
};

/** Minimum number of characters the API accepts, mirrors `GlobalSearchService::MIN_TERM_LENGTH`. */
export const GLOBAL_SEARCH_MIN_LENGTH = 2;
