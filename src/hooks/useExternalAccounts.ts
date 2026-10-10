"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { externalAccountService } from "@/services/external-account.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { EXTERNAL_APPS } from "@/lib/externalApps";
import { externalAuthorizationErrorMessage, listenForExternalAuthorization, openExternalAuthorizationTab } from "@/lib/externalAccountAuthorizationTab";
import type { ExternalAccountDto, ExternalService } from "@/types/external-account";

export type ExternalAccountsApi = {
  service: ExternalService;
  accounts: ExternalAccountDto[];
  /** Whether an administrator set up the provider's app. */
  is_configured: boolean;
  can_connect: boolean;
  is_loading: boolean;
  /** True while the provider's tab is open and has not reported back yet. */
  is_awaiting_provider: boolean;
  error: string | null;
  notice: string | null;
  dismissMessages: () => void;
  /** The account the last "Connect" finished with, so the flow can select it. Cleared by `consumeConnected`. */
  connected_id: number | null;
  consumeConnected: () => void;
  connect: (return_path?: string) => Promise<void>;
  cancelAwaitingProvider: () => void;
  reload: () => Promise<void>;
};

/** Same 10 minutes the API keeps the OAuth state. */
const AWAIT_PROVIDER_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * The signed in user's own accounts for one service (Gmail, Outlook or Google Calendar), the
 * "Connect your Gmail account" step of the Automations center. Connecting opens the provider in a
 * new tab, which finishes on `/integrations/accounts/complete` and broadcasts the new account id.
 */
export function useExternalAccounts(service: ExternalService, is_enabled = true): ExternalAccountsApi {
  const app_label = EXTERNAL_APPS[service].label;
  const [accounts, setAccounts] = useState<ExternalAccountDto[]>([]);
  const [is_configured, setIsConfigured] = useState(false);
  const [can_connect, setCanConnect] = useState(false);
  const [is_loading, setIsLoading] = useState(is_enabled);
  const [is_awaiting_provider, setIsAwaitingProvider] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [connected_id, setConnectedId] = useState<number | null>(null);
  const await_timer_ref = useRef<number | null>(null);

  const reload = useCallback(async () => {
    try {
      const response = await externalAccountService.getAccounts(service);
      setAccounts(response.data);
      setIsConfigured(response.is_configured);
      setCanConnect(response.can_connect);
    } catch (failure) {
      setError(apiErrorMessage(failure, `Your ${app_label} accounts could not be loaded.`));
    } finally {
      setIsLoading(false);
    }
  }, [service, app_label]);

  useEffect(() => {
    if (!is_enabled) return;
    void reload();
  }, [is_enabled, reload]);

  const stopWaiting = useCallback(() => {
    if (await_timer_ref.current !== null) {
      window.clearTimeout(await_timer_ref.current);
      await_timer_ref.current = null;
    }
    setIsAwaitingProvider(false);
  }, []);

  useEffect(() => stopWaiting, [stopWaiting]);

  useEffect(() => {
    if (!is_enabled) return;

    return listenForExternalAuthorization((message) => {
      if (message.service !== service) return;
      stopWaiting();

      if (message.result === "connected") {
        setError(null);
        setNotice(message.email ? `Your ${app_label} account ${message.email} is connected.` : `Your ${app_label} account is connected.`);
        setConnectedId(message.account_id);
      } else {
        setNotice(null);
        setError(externalAuthorizationErrorMessage(message.reason, app_label));
      }

      void reload();
    });
  }, [is_enabled, reload, service, stopWaiting, app_label]);

  const connect = useCallback(
    async (return_path?: string) => {
      setError(null);
      setNotice(null);
      stopWaiting();
      try {
        const tab = await openExternalAuthorizationTab(app_label, () => externalAccountService.requestConnectUrl(service, return_path, "tab"));
        if (!tab) return;

        setIsAwaitingProvider(true);
        await_timer_ref.current = window.setTimeout(stopWaiting, AWAIT_PROVIDER_TIMEOUT_MS);
      } catch (failure) {
        setError(apiErrorMessage(failure, `${app_label} could not be opened. Please try again.`));
      }
    },
    [service, stopWaiting, app_label]
  );

  const dismissMessages = useCallback(() => {
    setError(null);
    setNotice(null);
  }, []);

  const consumeConnected = useCallback(() => setConnectedId(null), []);

  return {
    service,
    accounts,
    is_configured,
    can_connect,
    is_loading,
    is_awaiting_provider,
    error,
    notice,
    dismissMessages,
    connected_id,
    consumeConnected,
    connect,
    cancelAwaitingProvider: stopWaiting,
    reload,
  };
}
