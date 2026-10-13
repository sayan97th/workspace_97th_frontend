import { apiClient } from "@/lib/api-client";
import type { GlobalSearchResults } from "@/types/search";
import type {
  SavedSearch,
  SearchEverythingParams,
  SearchEverythingResponse,
  SearchEverythingTab,
} from "@/types/search-everything";

type SearchOptions = {
  /** Max rows per group, the API caps this at 10. */
  limit?: number;
  /** Lets the caller cancel a stale request when the user keeps typing. */
  signal?: AbortSignal;
};

/**
 * Talks to `App\Http\Controllers\Search\GlobalSearchController`
 * (workspace_97th_api).
 */
export const searchService = {
  /** GET /api/search?q=&limit= */
  async search(query: string, options: SearchOptions = {}): Promise<GlobalSearchResults> {
    const params = new URLSearchParams({ q: query });
    if (options.limit) params.set("limit", String(options.limit));

    const response = await apiClient.get<{ data: GlobalSearchResults }>(
      `/api/search?${params.toString()}`,
      { signal: options.signal }
    );
    return response.data;
  },
};

/**
 * Talks to `SearchEverythingController` and `SavedSearchController`
 * (workspace_97th_api), the "Search Everything" dialog.
 */
export const searchEverythingService = {
  /** GET /api/search/everything */
  async search<TData>(params: SearchEverythingParams, signal?: AbortSignal): Promise<SearchEverythingResponse<TData>> {
    const query = new URLSearchParams({ q: params.q, tab: params.tab, sort: params.sort, page: String(params.page) });
    if (params.per_page) query.set("per_page", String(params.per_page));
    if (params.date_from) query.set("date_from", params.date_from);
    if (params.date_to) query.set("date_to", params.date_to);
    if (params.include_archived) query.set("include_archived", "1");
    params.filters.forEach((filter) => query.append("filters[]", filter));
    params.file_types.forEach((file_type) => query.append("file_types[]", file_type));

    return apiClient.get<SearchEverythingResponse<TData>>(`/api/search/everything?${query.toString()}`, { signal });
  },

  /** GET /api/search/saved */
  async listSaved(): Promise<SavedSearch[]> {
    const response = await apiClient.get<{ data: SavedSearch[] }>("/api/search/saved");
    return response.data;
  },

  /** POST /api/search/saved */
  async save(query: string, tab: SearchEverythingTab): Promise<SavedSearch> {
    const response = await apiClient.post<{ data: SavedSearch }>("/api/search/saved", { query, tab });
    return response.data;
  },

  /** DELETE /api/search/saved/{id} */
  async removeSaved(id: number): Promise<void> {
    await apiClient.delete(`/api/search/saved/${id}`);
  },
};
