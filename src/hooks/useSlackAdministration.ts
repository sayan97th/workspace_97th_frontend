"use client";
import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { slackService } from "@/services/slack.service";
import type { SlackIntegrationApi } from "@/hooks/useSlackIntegration";
import type { SlackAppCredentialsDto, SlackAppCredentialsPayload, SlackConnectedWorkspaceDto, SlackWorkspacesResponse } from "@/types/slack";

/** What an administration action is running on: a workspace id, the credentials form or the email match. */
export type SlackAdministrationBusyKey = number | "credentials" | "match" | null;

export type SlackAdministrationApi = {
  workspaces: SlackConnectedWorkspaceDto[];
  credentials: SlackAppCredentialsDto | null;
  is_loading: boolean;
  busy_key: SlackAdministrationBusyKey;
  activateWorkspace: (workspace_id: number) => Promise<void>;
  /** Resolves to true when the workspace was disconnected. */
  disconnectWorkspace: (workspace_id: number) => Promise<boolean>;
  matchMembers: () => Promise<void>;
  /** Creates the Slack app from a configuration token, resolves to true when it worked. */
  createApp: (configuration_token: string) => Promise<boolean>;
  /** Resolves to true when the credentials were saved. */
  saveCredentials: (payload: SlackAppCredentialsPayload) => Promise<boolean>;
  clearCredentials: () => Promise<boolean>;
};

/**
 * Administration > Integrations, the parts only administrators and the account owner see:
 * the connected Slack workspaces and, for the account owner only, the Slack app. Messages go through the shared
 * `slack` hook so the whole section shows one banner, and the list reloads every time a Slack
 * authorization finishes in another tab.
 */
export function useSlackAdministration(slack: SlackIntegrationApi, can_manage: boolean, can_configure_app: boolean): SlackAdministrationApi {
  const [workspaces, setWorkspaces] = useState<SlackConnectedWorkspaceDto[]>([]);
  const [credentials, setCredentials] = useState<SlackAppCredentialsDto | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [busy_key, setBusyKey] = useState<SlackAdministrationBusyKey>(null);
  const { applyStatus, completed_at, dismissMessages, reloadStatus, reportError, reportNotice } = slack;

  useEffect(() => {
    if (!can_manage) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    Promise.all([slackService.getWorkspaces(), can_configure_app ? slackService.getAppCredentials() : Promise.resolve(null)])
      .then(([next_workspaces, next_credentials]) => {
        if (cancelled) return;
        setWorkspaces(next_workspaces);
        setCredentials(next_credentials);
      })
      .catch((failure) => {
        if (!cancelled) reportError(apiErrorMessage(failure, "Failed to load the Slack settings."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [can_manage, can_configure_app, completed_at, reportError]);

  const runAction = useCallback(
    async <T,>(key: NonNullable<SlackAdministrationBusyKey>, action: () => Promise<T>, fallback_message: string): Promise<T | null> => {
      setBusyKey(key);
      dismissMessages();
      try {
        return await action();
      } catch (failure) {
        reportError(apiErrorMessage(failure, fallback_message));
        return null;
      } finally {
        setBusyKey(null);
      }
    },
    [dismissMessages, reportError]
  );

  const applyWorkspaces = useCallback(
    (response: SlackWorkspacesResponse) => {
      setWorkspaces(response.workspaces);
      applyStatus(response, response.message);
    },
    [applyStatus]
  );

  const activateWorkspace = useCallback(
    async (workspace_id: number) => {
      const response = await runAction(workspace_id, () => slackService.activateWorkspace(workspace_id), "Failed to switch the Slack workspace.");
      if (response) applyWorkspaces(response);
    },
    [applyWorkspaces, runAction]
  );

  const disconnectWorkspace = useCallback(
    async (workspace_id: number) => {
      const response = await runAction(workspace_id, () => slackService.disconnectWorkspaceById(workspace_id), "Failed to disconnect the Slack workspace.");
      if (response) applyWorkspaces(response);
      return response !== null;
    },
    [applyWorkspaces, runAction]
  );

  const matchMembers = useCallback(async () => {
    const response = await runAction("match", () => slackService.matchMembersByEmail(), "Failed to match members by email.");
    if (response) applyWorkspaces(response);
  }, [applyWorkspaces, runAction]);

  const applyCredentials = useCallback(
    async (response: (SlackAppCredentialsDto & { message: string }) | null) => {
      if (!response) return false;

      setCredentials(response);
      await reloadStatus();
      reportNotice(response.message);
      return true;
    },
    [reloadStatus, reportNotice]
  );

  const createApp = useCallback(
    async (configuration_token: string) =>
      applyCredentials(await runAction("credentials", () => slackService.createApp(configuration_token), "Failed to create the Slack app.")),
    [applyCredentials, runAction]
  );

  const saveCredentials = useCallback(
    async (payload: SlackAppCredentialsPayload) =>
      applyCredentials(await runAction("credentials", () => slackService.saveAppCredentials(payload), "Failed to save the Slack app credentials.")),
    [applyCredentials, runAction]
  );

  const clearCredentials = useCallback(
    async () => applyCredentials(await runAction("credentials", () => slackService.clearAppCredentials(), "Failed to remove the Slack app credentials.")),
    [applyCredentials, runAction]
  );

  return { workspaces, credentials, is_loading, busy_key, activateWorkspace, disconnectWorkspace, matchMembers, createApp, saveCredentials, clearCredentials };
}
