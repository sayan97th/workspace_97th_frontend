import type { BoardType } from "@/types/workspace";
import type { SearchAssetType } from "@/types/search";

/**
 * API types for the "Search Everything" dialog.
 *
 * These mirror `GET /api/search/everything` and `/api/search/saved`
 * (`App\Http\Controllers\Search\SearchEverythingController` and
 * `SavedSearchController` in workspace_97th_api).
 */

export type SearchEverythingTab = "all" | "boards" | "updates" | "files" | "people" | "tags" | "docs";

/** Every tab except "All" has a result count. */
export type SearchEverythingCountedTab = Exclude<SearchEverythingTab, "all">;

export type SearchEverythingSort = "relevance" | "time";

export type UpdatesFilter = "mentioned" | "wrote" | "attachments" | "links" | "reply" | "archived";

export type FileKind = "image" | "word" | "powerpoint" | "excel" | "pdf" | "zip" | "music" | "video" | "other";

export type SearchEverythingWorkspace = {
  id: number;
  name: string;
  mono: string;
  color: string;
  avatar_url: string | null;
};

export type SearchEverythingBoard = {
  id: number;
  label: string;
  asset_type: SearchAssetType;
  board_type: BoardType;
  is_archived: boolean;
  workspace: SearchEverythingWorkspace | null;
};

export type SearchEverythingItem = {
  id: number;
  name: string;
  is_subitem: boolean;
  view_id: number | null;
};

export type SearchEverythingPerson = {
  id: number;
  full_name: string;
  photo_url: string | null;
  is_deactivated: boolean;
};

export type BoardResult = SearchEverythingBoard & {
  matched_items: SearchEverythingItem[];
  matched_item_count: number;
};

export type UpdateResult = {
  id: number;
  excerpt: string;
  created_at: string | null;
  is_reply: boolean;
  attachment_count: number;
  author: SearchEverythingPerson | null;
  item: SearchEverythingItem | null;
  board: SearchEverythingBoard | null;
};

export type FileResult = {
  key: string;
  name: string;
  url: string;
  extension: string;
  kind: FileKind;
  /** Where the file lives: an update, the item's Files tab, a Files cell upload or a Files cell link. */
  source: "update" | "item" | "cell" | "link";
  created_at: string | null;
  uploaded_by: SearchEverythingPerson | null;
  item: SearchEverythingItem | null;
  board: SearchEverythingBoard | null;
};

export type PersonResult = {
  id: number;
  full_name: string;
  job_title: string | null;
  email: string;
  phone: string | null;
  photo_url: string | null;
};

export type TagResult = {
  id: number;
  board_id: number;
  label: string;
  color: string;
  usage_count: number;
};

export type DocResult = SearchEverythingBoard & {
  excerpt: string;
  updated_at: string | null;
  updated_by: SearchEverythingPerson | null;
};

export type SearchEverythingResultsByTab = {
  boards: BoardResult[];
  updates: UpdateResult[];
  files: FileResult[];
  people: PersonResult[];
  tags: TagResult[];
  docs: DocResult[];
};

/** "All" previews a few results of every tab. */
export type AllTabResults = SearchEverythingResultsByTab;

export type SearchEverythingCounts = Record<SearchEverythingCountedTab, number>;

export type SearchEverythingResponse<TData> = {
  data: TData;
  /** Only sent with the first page. */
  counts: SearchEverythingCounts | null;
  /** Count per facet checkbox of the requested tab, first page only. */
  facets: Partial<Record<UpdatesFilter | FileKind, number>>;
  meta: {
    query: string;
    tab: SearchEverythingTab;
    page: number;
    per_page: number;
    total: number;
    has_more: boolean;
  };
};

export type SearchEverythingParams = {
  q: string;
  tab: SearchEverythingTab;
  sort: SearchEverythingSort;
  date_from: string | null;
  date_to: string | null;
  include_archived: boolean;
  filters: UpdatesFilter[];
  file_types: FileKind[];
  page: number;
  per_page?: number;
};

export type SavedSearch = {
  id: number;
  query: string;
  tab: SearchEverythingTab;
  created_at: string;
};
