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

/** Whether a Slack app was saved in Administration > Integrations, the only place it is read from. */
export type SlackCredentialsSource = "database" | "none";

export type SlackStatusDto = {
  /** Whether the Slack app credentials were saved in Administration > Integrations. */
  is_configured: boolean;
  is_connected: boolean;
  /** Whether the current user may connect, switch or disconnect workspaces (admin and account owner). */
  can_manage: boolean;
  /** Whether the current user may set up the Slack app itself, a one time developer setting (account owner only). */
  can_configure_app: boolean;
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
  /** Set when the site created the app itself, links below go to that app in Slack. */
  app_id: string | null;
  app_settings_url: string | null;
  /** Where public distribution is turned on, needed to add the app to more than one workspace. */
  distribution_url: string | null;
  /** Whether Slack can reach the events URL, false for a local API. */
  can_receive_events: boolean;
  client_id: string | null;
  client_secret_hint: string | null;
  signing_secret_hint: string | null;
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

/** Groups of the Slack notification test suite, in the order the page shows them. */
export type SlackNotificationTestCategory = "connection" | "notifications" | "direct_messages" | "channels" | "events";

/** What a notification test sends to: nothing, a linked member, a channel, or a channel about a member. */
export type SlackNotificationTestTarget = "none" | "user" | "channel" | "user_and_channel";

/** One test of `App\Enums\SlackNotificationTest`, as the catalog endpoint describes it. */
export type SlackNotificationTestDto = {
  key: string;
  label: string;
  description: string;
  category: SlackNotificationTestCategory;
  target: SlackNotificationTestTarget;
  required_scopes: string[];
  /** Scopes of `required_scopes` the active workspace was installed without, the test is skipped until it is reconnected. */
  missing_scopes: string[];
  /** Whether running the test puts a message or a file in Slack. */
  sends_message: boolean;
};

/** `GET /api/integrations/slack/diagnostics/notification-tests`. */
export type SlackNotificationTestCatalogDto = {
  workspace: { team_id: string; team_name: string } | null;
  granted_scopes: string[];
  /** Laravel queue connection, `sync` delivers queued Slack messages right away. */
  queue_connection: string;
  /** Whether Slack can reach the events URL, needed by the app mention test. */
  can_receive_events: boolean;
  tests: SlackNotificationTestDto[];
};

/** One Slack Web API call a test made, or a local check such as the recipient's preferences. */
export type SlackNotificationTestStepDto = {
  name: string;
  status: Exclude<SlackDiagnosticStatus, "skipped">;
  detail: string | null;
};

/** `POST /api/integrations/slack/diagnostics/notification-tests/{key}`. */
export type SlackNotificationTestResultDto = {
  key: string;
  label: string;
  status: SlackDiagnosticStatus;
  detail: string;
  steps: SlackNotificationTestStepDto[];
  /** Links to what the test produced in Slack, such as the message permalink. */
  links: { label: string; url: string }[];
  duration_ms: number;
  ran_at: string;
};

/** Who and where the notification tests send to. */
export type SlackNotificationTestTargets = {
  user_id: number | null;
  channel_id: string | null;
};
