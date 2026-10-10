"use client";
import { useCallback, useEffect, useState } from "react";
import { externalAccountService } from "@/services/external-account.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import type { ExternalProvider, IntegrationAppDto, IntegrationAppPayload } from "@/types/external-account";

export type IntegrationAppsApi = {
  apps: IntegrationAppDto[];
  is_loading: boolean;
  /** The provider whose save or removal is in flight. */
  working_provider: ExternalProvider | null;
  error: string | null;
  notice: string | null;
  dismissMessages: () => void;
  save: (provider: ExternalProvider, payload: IntegrationAppPayload) => Promise<boolean>;
  remove: (provider: ExternalProvider) => Promise<void>;
};

/** The Google and Microsoft OAuth apps of Administration > Integrations, administrators only. */
export function useIntegrationApps(is_enabled: boolean): IntegrationAppsApi {
  const [apps, setApps] = useState<IntegrationAppDto[]>([]);
  const [is_loading, setIsLoading] = useState(is_enabled);
  const [working_provider, setWorkingProvider] = useState<ExternalProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!is_enabled) return;
    let cancelled = false;
    externalAccountService
      .getApps()
      .then((data) => {
        if (!cancelled) setApps(data);
      })
      .catch((failure) => {
        if (!cancelled) setError(apiErrorMessage(failure, "The Google and Microsoft apps could not be loaded."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [is_enabled]);

  const replace = (updated: IntegrationAppDto) => setApps((current) => current.map((app) => (app.provider === updated.provider ? updated : app)));

  const save = useCallback(async (provider: ExternalProvider, payload: IntegrationAppPayload) => {
    setWorkingProvider(provider);
    setError(null);
    setNotice(null);
    try {
      const { message, ...updated } = await externalAccountService.saveApp(provider, payload);
      replace(updated);
      setNotice(message);
      return true;
    } catch (failure) {
      setError(apiErrorMessage(failure, "The app could not be saved."));
      return false;
    } finally {
      setWorkingProvider(null);
    }
  }, []);

  const remove = useCallback(async (provider: ExternalProvider) => {
    setWorkingProvider(provider);
    setError(null);
    setNotice(null);
    try {
      const { message, ...updated } = await externalAccountService.removeApp(provider);
      replace(updated);
      setNotice(message);
    } catch (failure) {
      setError(apiErrorMessage(failure, "The app could not be removed."));
    } finally {
      setWorkingProvider(null);
    }
  }, []);

  const dismissMessages = useCallback(() => {
    setError(null);
    setNotice(null);
  }, []);

  return { apps, is_loading, working_provider, error, notice, dismissMessages, save, remove };
}
