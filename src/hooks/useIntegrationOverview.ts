"use client";
import { useCallback, useEffect, useState } from "react";
import { integrationOverviewService } from "@/services/integration-overview.service";
import type { IntegrationAppKey, IntegrationAppOverviewDto } from "@/types/integration-overview";

export type IntegrationOverviewApi = {
  apps: IntegrationAppOverviewDto[];
  can_manage: boolean;
  is_loading: boolean;
  /** The app's entry, null while loading or when the request failed. */
  appFor: (key: IntegrationAppKey) => IntegrationAppOverviewDto | null;
  reload: () => Promise<void>;
};

/**
 * Where the signed in user stands with every integration app, for the Integrations dialog's
 * sidebar badges and overview cards. A failed request leaves the list empty, the dialog still
 * works and simply shows no status.
 */
export function useIntegrationOverview(is_enabled = true): IntegrationOverviewApi {
  const [apps, setApps] = useState<IntegrationAppOverviewDto[]>([]);
  const [can_manage, setCanManage] = useState(false);
  const [is_loading, setIsLoading] = useState(is_enabled);

  const reload = useCallback(async () => {
    try {
      const response = await integrationOverviewService.getOverview();
      setApps(response.data);
      setCanManage(response.can_manage);
    } catch {
      // The badges are informative only, every page loads its own data.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (is_enabled) void reload();
  }, [is_enabled, reload]);

  const appFor = useCallback((key: IntegrationAppKey) => apps.find((app) => app.key === key) ?? null, [apps]);

  return { apps, can_manage, is_loading, appFor, reload };
}
