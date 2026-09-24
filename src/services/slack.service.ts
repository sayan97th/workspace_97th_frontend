import { apiClient } from "@/lib/api-client";
import type { SlackChannelDto, SlackDiagnosticsDto, SlackRecipientDto, SlackStatusDto } from "@/types/slack";

/**
 * Talks to `App\Http\Controllers\Integration\SlackIntegrationController`. Both OAuth flows
 * work the same way: ask the API for the Slack URL, then navigate the browser to it, since a
 * top level navigation cannot carry the JWT. Slack sends the browser back to the API's
 * public callback, which redirects into the app with `?slack=connected` or `?slack=error`.
 */
export const slackService = {
  /** GET /api/integrations/slack */
  async getStatus(): Promise<SlackStatusDto> {
    return apiClient.get<SlackStatusDto>("/api/integrations/slack");
  },

  /** GET /api/integrations/slack/channels */
  async getChannels(): Promise<SlackChannelDto[]> {
    const response = await apiClient.get<{ data: SlackChannelDto[] }>("/api/integrations/slack/channels");
    return response.data;
  },

  /**
   * POST /api/integrations/slack/install-url, administrators only. `return_path` is an in-app
   * path (e.g. `/boards/42?integrate=slack`) the callback sends the browser back to.
   */
  async requestInstallUrl(return_path?: string): Promise<string> {
    const response = await apiClient.post<{ url: string }>("/api/integrations/slack/install-url", { return_path });
    return response.url;
  },

  /** DELETE /api/integrations/slack, administrators only. */
  async disconnectWorkspace(): Promise<SlackStatusDto> {
    return apiClient.delete<SlackStatusDto & { message: string }>("/api/integrations/slack");
  },

  /** POST /api/integrations/slack/link-url, `return_path` works as in {@link requestInstallUrl}. */
  async requestLinkUrl(return_path?: string): Promise<string> {
    const response = await apiClient.post<{ url: string }>("/api/integrations/slack/link-url", { return_path });
    return response.url;
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
};
