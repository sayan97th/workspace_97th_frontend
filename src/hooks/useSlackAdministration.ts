"use client";
import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { slackService } from "@/services/slack.service";
import type { SlackIntegrationApi } from "@/hooks/useSlackIntegration";
import type {
  SlackAppCredentialsDto,
  SlackAppCredentialsPayload,
  SlackConnectedWorkspaceDto,
  SlackAppKey,
  SlackWorkspacesResponse,
} from "@/types/slack";

/** What an administration action is running on: a workspace id, the credentials form, the app selection, the email match or the invitations setting. */
export type SlackAdministrationBusyKey = number | "credentials" | "select_app" | "match" | "invitations" | null;

export type SlackAdministrationApi = {
  workspaces: SlackConnectedWorkspaceDto[];
  credentials: SlackAppCredentialsDto | null;
  is_loading: boolean;
  busy_key: SlackAdministrationBusyKey;
  activateWorkspace: (workspace_id: number) => Promise<void>;
  /** Resolves to true when the workspace was disconnected. */
  disconnectWorkspace: (workspace_id: number) => Promise<boolean>;
  matchMembers: () => Promise<void>;
  /** Turns Slack invitations on or off for one workspace. */
  setNotifyInvitations: (workspace_id: number, notify_invitations: boolean) => Promise<void>;
  /** Creates a Slack app from a configuration token, resolves to true when it worked. */
  createApp: (configuration_token: string, label: string | null) => Promise<boolean>;
  /** Saves a new app, or updates the saved app `app_id`. Resolves to true when the credentials were saved. */
  saveCredentials: (payload: SlackAppCredentialsPayload, app_id: number | null) => Promise<boolean>;
  removeCredentials: (app_id: number) => Promise<boolean>;
  /** Selects the app in use, resolves to true when it worked. */
  selectApp: (app: SlackAppKey) => Promise<boolean>;
};

/**
 * Administration > Integrations > Slack, the parts only administrators and the account owner see:
 * the Slack app and the connected Slack workspaces. Messages go through the shared
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

  const setNotifyInvitations = useCallback(
    async (workspace_id: number, notify_invitations: boolean) => {
      const response = await runAction(
        "invitations",
        () => slackService.updateWorkspaceSettings(workspace_id, { notify_invitations }),
        "Failed to update the Slack invitations setting."
      );
      if (response) applyWorkspaces(response);
    },
    [applyWorkspaces, runAction]
  );

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
    async (configuration_token: string, label: string | null) =>
      applyCredentials(await runAction("credentials", () => slackService.createApp(configuration_token, label), "Failed to create the Slack app.")),
    [applyCredentials, runAction]
  );

  const saveCredentials = useCallback(
    async (payload: SlackAppCredentialsPayload, app_id: number | null) =>
      applyCredentials(
        await runAction(
          "credentials",
          () => (app_id === null ? slackService.addAppCredentials(payload) : slackService.updateAppCredentials(app_id, payload)),
          "Failed to save the Slack app credentials."
        )
      ),
    [applyCredentials, runAction]
  );

  const removeCredentials = useCallback(
    async (app_id: number) =>
      applyCredentials(await runAction("credentials", () => slackService.removeAppCredentials(app_id), "Failed to remove the Slack app credentials.")),
    [applyCredentials, runAction]
  );

  const selectApp = useCallback(
    async (app: SlackAppKey) => {
      const response = await runAction("select_app", () => slackService.selectApp(app), "Failed to switch the Slack app.");
      if (!response) return false;

      // The active workspace follows the app, so the list is read again. A failed read keeps the current list.
      await slackService.getWorkspaces().then(setWorkspaces, () => undefined);
      return applyCredentials(response);
    },
    [applyCredentials, runAction]
  );

  return {
    workspaces,
    credentials,
    is_loading,
    busy_key,
    activateWorkspace,
    disconnectWorkspace,
    matchMembers,
    setNotifyInvitations,
    createApp,
    saveCredentials,
    removeCredentials,
    selectApp,
  };
}
