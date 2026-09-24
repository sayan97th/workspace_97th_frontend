/**
 * API types for the Slack integration, mirrors the payloads of
 * `App\Http\Controllers\Integration\SlackIntegrationController`.
 */

export type SlackWorkspaceDto = {
  team_id: string;
  team_name: string;
  connected_at: string | null;
  /** Full name of the administrator who installed the app. */
  connected_by: string | null;
  linked_members_count: number;
};

/** The signed in user's own Slack account, present once they have used "Connect my Slack". */
export type SlackUserLinkDto = {
  slack_user_id: string;
  slack_display_name: string | null;
  linked_at: string | null;
};

export type SlackStatusDto = {
  /** Whether the server has the Slack app credentials (`SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET`). */
  is_configured: boolean;
  is_connected: boolean;
  /** Whether the current user may install or disconnect the workspace (admin and super admin). */
  can_manage: boolean;
  workspace: SlackWorkspaceDto | null;
  current_user_link: SlackUserLinkDto | null;
};

export type SlackChannelDto = {
  id: string;
  name: string;
  is_private: boolean;
};

/** What the backend redirects the browser back with after a Slack OAuth round trip (`?slack=...&reason=...`). */
export type SlackCallbackResult = "connected" | "error";

export type SlackDiagnosticStatus = "passed" | "warning" | "failed" | "skipped";

/** One live check run by `App\Services\Slack\SlackDiagnosticsService`. */
export type SlackDiagnosticCheckDto = {
  key: string;
  label: string;
  status: SlackDiagnosticStatus;
  detail: string;
};

/** Values an administrator copies into the Slack app settings, never includes a secret. */
export type SlackAppSetupDto = {
  client_id: string | null;
  redirect_uri: string;
  events_url: string;
  bot_scopes: string[];
  user_scopes: string[];
};

export type SlackDiagnosticsDto = {
  ran_at: string;
  summary: Record<SlackDiagnosticStatus, number>;
  app: SlackAppSetupDto;
  checks: SlackDiagnosticCheckDto[];
};

/** A member who linked their Slack account and can receive a direct message, from the diagnostics recipients endpoint. */
export type SlackRecipientDto = {
  user_id: number;
  full_name: string;
  email: string;
  profile_photo_url: string | null;
  slack_user_id: string;
  slack_display_name: string | null;
};

/** Mirrors `SlackUserTestRequest::MESSAGE_MAX_LENGTH` on the API. */
export const SLACK_TEST_MESSAGE_MAX_LENGTH = 1000;
