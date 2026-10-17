import { apiClient } from "@/lib/api-client";
import type { IntegrationOverviewResponse } from "@/types/integration-overview";

export const integrationOverviewService = {
  /** GET /api/integrations/overview. Every integration app with the signed in user's connection status. */
  async getOverview(): Promise<IntegrationOverviewResponse> {
    return apiClient.get<IntegrationOverviewResponse>("/api/integrations/overview");
  },
};
