import { apiClient } from "@/lib/api-client";
import type {
  AdminBulkBoardResult,
  AdminContentFilterOptionsDto,
  AdminContentPage,
  AdminContentQuery,
} from "@/types/administration/content-directory";

const buildQuery = (query?: AdminContentQuery): string => {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.page) params.set("page", String(query.page));
  if (query?.per_page) params.set("per_page", String(query.per_page));
  if (query?.sort_field) params.set("sort_field", query.sort_field);
  if (query?.sort_direction) params.set("sort_direction", query.sort_direction);
  if (query?.inactive_days) params.set("inactive_days", String(query.inactive_days));
  if (query?.ids?.length) params.set("ids", query.ids.join(","));
  Object.entries(query?.filter_params ?? {}).forEach(([key, value]) => params.set(key, value));
  const search = params.toString();
  return search ? `?${search}` : "";
};

/** Talks to the Laravel `/api/admin/content` resource, behind Content directory and Tidy up. */
export const contentDirectoryService = {
  /** GET /api/admin/content */
  async getBoards(query?: AdminContentQuery): Promise<AdminContentPage> {
    return apiClient.get<AdminContentPage>(`/api/admin/content${buildQuery(query)}`);
  },

  /** GET /api/admin/content/filter-options */
  async getFilterOptions(): Promise<AdminContentFilterOptionsDto> {
    return apiClient.get<AdminContentFilterOptionsDto>("/api/admin/content/filter-options");
  },

  /** GET /api/admin/content/export */
  async exportBoards(query?: AdminContentQuery): Promise<Blob> {
    return apiClient.get<Blob>(`/api/admin/content/export${buildQuery(query)}`, { responseType: "blob" });
  },

  /** POST /api/admin/content/archive */
  async archiveBoards(board_ids: number[]): Promise<AdminBulkBoardResult> {
    return apiClient.post<AdminBulkBoardResult>("/api/admin/content/archive", { board_ids });
  },

  /** POST /api/admin/content/unarchive */
  async restoreBoards(board_ids: number[]): Promise<AdminBulkBoardResult> {
    return apiClient.post<AdminBulkBoardResult>("/api/admin/content/unarchive", { board_ids });
  },

  /** POST /api/admin/content/reassign */
  async reassignBoards(board_ids: number[], owner_id: number): Promise<AdminBulkBoardResult> {
    return apiClient.post<AdminBulkBoardResult>("/api/admin/content/reassign", { board_ids, owner_id });
  },
};
