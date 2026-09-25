import { apiClient } from "@/lib/api-client";
import type { UsageStatsDto } from "@/types/administration/usage-stats";

/** Talks to the Laravel `/api/admin/usage` endpoint. */
export const usageStatsService = {
  /** GET /api/admin/usage?from=Y-m-d&to=Y-m-d */
  async getUsage(from: string, to: string): Promise<UsageStatsDto> {
    const params = new URLSearchParams({ from, to });
    return apiClient.get<UsageStatsDto>(`/api/admin/usage?${params.toString()}`);
  },
};
