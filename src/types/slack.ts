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
