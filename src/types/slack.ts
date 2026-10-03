/**
 * API types for the Slack integration, mirrors the payloads of
 * `App\Http\Controllers\Integration\SlackIntegrationController`.
 */

export type SlackWorkspaceDto = {
  id: number;
  team_id: string;
  team_name: string;
  /** The workspace's own address, such as `https://97thfloor.slack.com/`, null when Slack did not report it. */
  team_url: string | null;
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

/** Where the Slack app credentials come from, saved in Administration or the API environment. */
export type SlackCredentialsSource = "database" | "environment" | "none";

export type SlackStatusDto = {
  /** Whether the Slack app credentials are set, in Administration or in the API environment. */
  is_configured: boolean;
  is_connected: boolean;
  /** Whether the current user may connect, switch or disconnect workspaces (admin and account owner). */
  can_manage: boolean;
  credentials_source: SlackCredentialsSource;
  /** How many Slack workspaces are connected, only one of them is active. */
  workspaces_count: number;
  /** The active workspace, the one notifications and automations use. */
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

/** Which OAuth flow finished: installing the app into a workspace, or a member linking their own account. */
export type SlackAuthorizationPurpose = "install" | "link";

/** How a Slack authorization is opened, `tab` keeps the workspace open in the original tab. */
export type SlackAuthorizationDisplay = "tab" | "page";

/** What the completion tab tells the tab that started a Slack authorization. */
export type SlackAuthorizationMessage = {
  type: "slack_authorization_complete";
  result: SlackCallbackResult;
  purpose: SlackAuthorizationPurpose | null;
  reason: string | null;
  workspace: string | null;
  matched: number | null;
};

/** One connected Slack workspace, from `GET /api/integrations/slack/workspaces`. */
export type SlackConnectedWorkspaceDto = {
  id: number;
  team_id: string;
  team_name: string;
  team_url: string | null;
  is_active: boolean;
  connected_at: string | null;
  updated_at: string | null;
  connected_by: string | null;
  linked_members_count: number;
  /** Bot scopes this workspace was installed without, "Reconnect" grants them. */
  missing_scopes: string[];
};

/** Answer of the workspace actions: a message, the refreshed status and the refreshed list. */
export type SlackWorkspacesResponse = SlackStatusDto & {
  message: string;
  workspaces: SlackConnectedWorkspaceDto[];
};

export type SlackMemberMatchResult = {
  matched: number;
  already_linked: number;
  unmatched: number;
};

/** `GET /api/integrations/slack/app`. Secrets are never returned, only their last four characters. */
export type SlackAppCredentialsDto = {
  source: SlackCredentialsSource;
  is_configured: boolean;
  client_id: string | null;
  client_secret_hint: string | null;
  signing_secret_hint: string | null;
  /** Whether the API environment also holds credentials, removing the saved ones falls back to them. */
  has_environment_credentials: boolean;
  redirect_uri: string;
  redirect_uri_override: string | null;
  default_redirect_uri: string;
  events_url: string;
  bot_scopes: string[];
  user_scopes: string[];
  updated_at: string | null;
  updated_by: string | null;
  /** A Slack app manifest, pasted into "Create New App > From an app manifest". */
  manifest: Record<string, unknown>;
};

/** Body of `PUT /api/integrations/slack/app`, a blank secret keeps the saved one. */
export type SlackAppCredentialsPayload = {
  client_id: string;
  client_secret?: string | null;
  signing_secret?: string | null;
  redirect_uri?: string | null;
};

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
  credentials_source?: SlackCredentialsSource;
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
