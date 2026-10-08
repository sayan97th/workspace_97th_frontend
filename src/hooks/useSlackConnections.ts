"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { slackService } from "@/services/slack.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { listenForSlackAuthorization, openSlackAuthorizationTab } from "@/lib/slackAuthorizationTab";
import { slackCallbackErrorMessage } from "@/hooks/useSlackIntegration";
import type { SlackConnectionDto } from "@/types/slack";

export type SlackConnectionsApi = {
  connections: SlackConnectionDto[];
  /** Whether the Slack app was set up in Administration. */
  is_configured: boolean;
  /** Whether the signed in user may connect another account. */
  can_connect: boolean;
  is_loading: boolean;
  /** True while the Slack tab is open and has not reported back yet. */
  is_awaiting_slack: boolean;
  /** True while a disconnect request is in flight. */
  is_working: boolean;
  error: string | null;
  notice: string | null;
  dismissMessages: () => void;
  /** The account the last "Connect" finished with, so the flow can select it. Cleared by `consumeConnected`. */
  connected_id: number | null;
  consumeConnected: () => void;
  /** Opens Slack's "Allow the app to access Slack" page in a new tab and waits for it to report back. */
  connect: (return_path?: string) => Promise<void>;
  cancelAwaitingSlack: () => void;
  disconnect: (connection_id: number) => Promise<void>;
  reload: () => Promise<void>;
};

/** Same 10 minutes the API keeps the OAuth state, see `useSlackIntegration`. */
const AWAIT_SLACK_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * The signed in user's own Slack accounts for automations, the "Connect your Slack account" step
 * of the Automations center. Connecting opens Slack in a new tab, the tab finishes on
 * `/integrations/slack/complete`, which broadcasts the new connection id back here.
 */
export function useSlackConnections(is_enabled = true): SlackConnectionsApi {
  const [connections, setConnections] = useState<SlackConnectionDto[]>([]);
  const [is_configured, setIsConfigured] = useState(false);
  const [can_connect, setCanConnect] = useState(false);
  const [is_loading, setIsLoading] = useState(is_enabled);
  const [is_awaiting_slack, setIsAwaitingSlack] = useState(false);
  const [is_working, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [connected_id, setConnectedId] = useState<number | null>(null);
  const await_timer_ref = useRef<number | null>(null);

  const reload = useCallback(async () => {
    try {
      const response = await slackService.getConnections();
      setConnections(response.data);
      setIsConfigured(response.is_configured);
      setCanConnect(response.can_connect);
    } catch (failure) {
      setError(apiErrorMessage(failure, "Your Slack accounts could not be loaded."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!is_enabled) return;
    void reload();
  }, [is_enabled, reload]);

  const stopWaiting = useCallback(() => {
    if (await_timer_ref.current !== null) {
      window.clearTimeout(await_timer_ref.current);
      await_timer_ref.current = null;
    }
    setIsAwaitingSlack(false);
  }, []);

  useEffect(() => stopWaiting, [stopWaiting]);

  useEffect(() => {
    if (!is_enabled) return;

    return listenForSlackAuthorization((message) => {
      if (message.purpose !== "connect") return;
      stopWaiting();

      if (message.result === "connected") {
        setError(null);
        setNotice(message.workspace ? `Your ${message.workspace} Slack account is connected.` : "Your Slack account is connected.");
        setConnectedId(message.connection_id ?? null);
      } else {
        setNotice(null);
        setError(slackCallbackErrorMessage(message.reason));
      }

      void reload();
    });
  }, [is_enabled, reload, stopWaiting]);

  const connect = useCallback(
    async (return_path?: string) => {
      setError(null);
      setNotice(null);
      stopWaiting();
      try {
        const tab = await openSlackAuthorizationTab(() => slackService.requestConnectionUrl(return_path, "tab"));
        if (!tab) return;

        setIsAwaitingSlack(true);
        await_timer_ref.current = window.setTimeout(stopWaiting, AWAIT_SLACK_TIMEOUT_MS);
      } catch (failure) {
        setError(apiErrorMessage(failure, "Slack could not be opened. Please try again."));
      }
    },
    [stopWaiting]
  );

  const disconnect = useCallback(
    async (connection_id: number) => {
      setIsWorking(true);
      setError(null);
      setNotice(null);
      try {
        const response = await slackService.deleteConnection(connection_id);
        setConnections((current) => current.filter((connection) => connection.id !== connection_id));
        setNotice(response.message);
      } catch (failure) {
        setError(apiErrorMessage(failure, "The Slack account could not be disconnected."));
      } finally {
        setIsWorking(false);
      }
    },
    []
  );

  const dismissMessages = useCallback(() => {
    setError(null);
    setNotice(null);
  }, []);

  const consumeConnected = useCallback(() => setConnectedId(null), []);

  return {
    connections,
    is_configured,
    can_connect,
    is_loading,
    is_awaiting_slack,
    is_working,
    error,
    notice,
    dismissMessages,
    connected_id,
    consumeConnected,
    connect,
    cancelAwaitingSlack: stopWaiting,
    disconnect,
    reload,
  };
}
