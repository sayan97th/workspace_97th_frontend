import { apiClient } from "@/lib/api-client";
import type {
  SlackAppCredentialsDto,
  SlackAppCredentialsPayload,
  SlackAuthorizationDisplay,
  SlackChannelDto,
  SlackConnectedWorkspaceDto,
  SlackDiagnosticsDto,
  SlackMemberMatchResult,
  SlackNotificationTestCatalogDto,
  SlackNotificationTestResultDto,
  SlackNotificationTestTargets,
  SlackRecipientDto,
  SlackStatusDto,
  SlackWorkspaceMemberDto,
  SlackWorkspacesResponse,
} from "@/types/slack";

/**
 * Talks to the Slack controllers of the API. Both OAuth flows work the same way: ask the API
 * for the Slack URL, then open it, since a top level navigation cannot carry the JWT. With
 * `display: "tab"` Slack opens in a new tab and the API's public callback finishes on
 * `/integrations/slack/complete`, which reports back to this tab. With `"page"` the callback
 * redirects into the app with `?slack=connected` or `?slack=error`.
 */
export const slackService = {
  /** GET /api/integrations/slack */
  async getStatus(): Promise<SlackStatusDto> {
    return apiClient.get<SlackStatusDto>("/api/integrations/slack");
  },

  /**
   * GET /api/integrations/slack/channels. Every public channel plus the private channels the
   * app was invited to. `refresh` skips the API's short lived cache, for a channel just
   * created or joined in Slack.
   */
  async getChannels(refresh = false): Promise<SlackChannelDto[]> {
    const response = await apiClient.get<{ data: SlackChannelDto[] }>(`/api/integrations/slack/channels${refresh ? "?refresh=1" : ""}`);
    return response.data;
  },

  /**
   * POST /api/integrations/slack/install-url, administrators only. `return_path` is an in-app
   * path (e.g. `/boards/42?integrate=slack`) the callback sends the browser back to.
   */
  async requestInstallUrl(return_path?: string, display: SlackAuthorizationDisplay = "tab"): Promise<string> {
    const response = await apiClient.post<{ url: string }>("/api/integrations/slack/install-url", { return_path, display });
    return response.url;
  },

  /** DELETE /api/integrations/slack, administrators only. Disconnects the active workspace. */
  async disconnectWorkspace(): Promise<SlackStatusDto & { message: string }> {
    return apiClient.delete<SlackStatusDto & { message: string }>("/api/integrations/slack");
  },

  /** POST /api/integrations/slack/link-url, `return_path` works as in {@link requestInstallUrl}. */
  async requestLinkUrl(return_path?: string, display: SlackAuthorizationDisplay = "tab"): Promise<string> {
    const response = await apiClient.post<{ url: string }>("/api/integrations/slack/link-url", { return_path, display });
    return response.url;
  },

  /** GET /api/integrations/slack/workspaces, administrators only. The active workspace first. */
  async getWorkspaces(): Promise<SlackConnectedWorkspaceDto[]> {
    const response = await apiClient.get<{ data: SlackConnectedWorkspaceDto[] }>("/api/integrations/slack/workspaces");
    return response.data;
  },

  /** POST /api/integrations/slack/workspaces/{id}/activate, administrators only. */
  async activateWorkspace(workspace_id: number): Promise<SlackWorkspacesResponse> {
    return apiClient.post<SlackWorkspacesResponse>(`/api/integrations/slack/workspaces/${workspace_id}/activate`);
  },

  /** DELETE /api/integrations/slack/workspaces/{id}, administrators only. */
  async disconnectWorkspaceById(workspace_id: number): Promise<SlackWorkspacesResponse> {
    return apiClient.delete<SlackWorkspacesResponse>(`/api/integrations/slack/workspaces/${workspace_id}`);
  },

  /** POST /api/integrations/slack/match-members, administrators only. Links members by email in the active workspace. */
  async matchMembersByEmail(): Promise<SlackWorkspacesResponse & { result: SlackMemberMatchResult }> {
    return apiClient.post<SlackWorkspacesResponse & { result: SlackMemberMatchResult }>("/api/integrations/slack/match-members");
  },

  /** GET /api/integrations/slack/app, account owner only. */
  async getAppCredentials(): Promise<SlackAppCredentialsDto> {
    return apiClient.get<SlackAppCredentialsDto>("/api/integrations/slack/app");
  },

  /**
   * POST /api/integrations/slack/app/create, account owner only. Creates the Slack app from the
   * site's manifest with an app configuration token and saves its credentials, the token is not stored.
   */
  async createApp(configuration_token: string): Promise<SlackAppCredentialsDto & { message: string }> {
    return apiClient.post<SlackAppCredentialsDto & { message: string }>("/api/integrations/slack/app/create", { configuration_token });
  },

  /** PUT /api/integrations/slack/app, account owner only. */
  async saveAppCredentials(payload: SlackAppCredentialsPayload): Promise<SlackAppCredentialsDto & { message: string }> {
    return apiClient.put<SlackAppCredentialsDto & { message: string }>("/api/integrations/slack/app", payload);
  },

  /** DELETE /api/integrations/slack/app, account owner only. Connected workspaces keep working, new ones cannot be added until an app is saved again. */
  async clearAppCredentials(): Promise<SlackAppCredentialsDto & { message: string }> {
    return apiClient.delete<SlackAppCredentialsDto & { message: string }>("/api/integrations/slack/app");
  },

  /** DELETE /api/integrations/slack/link */
  async unlinkMyAccount(): Promise<SlackStatusDto> {
    return apiClient.delete<SlackStatusDto & { message: string }>("/api/integrations/slack/link");
  },

  /** POST /api/integrations/slack/link/test, sends the caller a direct message. */
  async sendTestMessage(): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>("/api/integrations/slack/link/test");
  },

  /** GET /api/integrations/slack/diagnostics, administrators only. Runs every check live. */
  async runDiagnostics(): Promise<SlackDiagnosticsDto> {
    return apiClient.get<SlackDiagnosticsDto>("/api/integrations/slack/diagnostics");
  },

  /** POST /api/integrations/slack/diagnostics/channel-test, administrators only. */
  async sendChannelTestMessage(channel_id: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>("/api/integrations/slack/diagnostics/channel-test", { channel_id });
  },

  /** GET /api/integrations/slack/diagnostics/recipients, administrators only. Members with a linked Slack account. */
  async getNotificationRecipients(): Promise<SlackRecipientDto[]> {
    const response = await apiClient.get<{ data: SlackRecipientDto[] }>("/api/integrations/slack/diagnostics/recipients");
    return response.data;
  },

  /** POST /api/integrations/slack/diagnostics/user-test, administrators only. Sends `message` to `user_id` as a Slack direct message. */
  async sendUserTestNotification(user_id: number, message: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>("/api/integrations/slack/diagnostics/user-test", { user_id, message });
  },

  /** GET /api/integrations/slack/diagnostics/notification-tests, administrators only. Every test of the notification test suite. */
  async getNotificationTests(): Promise<SlackNotificationTestCatalogDto> {
    return apiClient.get<SlackNotificationTestCatalogDto>("/api/integrations/slack/diagnostics/notification-tests");
  },

  /**
   * GET /api/integrations/slack/diagnostics/slack-members, administrators only. Every person in the
   * active Slack workspace, linked to the app or not. `refresh` skips the API's short lived cache.
   */
  async getSlackMembers(refresh = false): Promise<SlackWorkspaceMemberDto[]> {
    const response = await apiClient.get<{ data: SlackWorkspaceMemberDto[] }>(`/api/integrations/slack/diagnostics/slack-members${refresh ? "?refresh=1" : ""}`);
    return response.data;
  },

  /**
   * POST /api/integrations/slack/diagnostics/notification-tests/{key}, administrators only. Runs one
   * test against the real Slack workspace, a failed test still answers 200 with its result.
   */
  async runNotificationTest(key: string, targets: SlackNotificationTestTargets): Promise<SlackNotificationTestResultDto> {
    return apiClient.post<SlackNotificationTestResultDto>(`/api/integrations/slack/diagnostics/notification-tests/${encodeURIComponent(key)}`, targets);
  },
};
