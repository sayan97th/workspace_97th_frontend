import { apiClient } from "@/lib/api-client";
import type { GlobalSearchResults } from "@/types/search";

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
