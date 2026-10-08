import type { SlackStatusDto } from "@/types/slack";

/**
 * Administration > Integrations > Slack, where an administrator or the account owner sets up the
 * Slack app once and connects workspaces. Mirrors `SlackStatus::SETUP_PATH` on the API.
 */
export const SLACK_SETUP_PATH = "/administration/integrations/slack";

/** Roles allowed on the Slack setup page, the same `role:super_admin,admin` gate the API routes use. */
export const SLACK_SETUP_ROLES = ["super_admin", "admin"];

/** Query param the setup page reads to explain why a member was sent there from "Connect my Slack". */
export const SLACK_SETUP_REASON_PARAM = "reason";

/** API error codes that mean Slack still has to be set up before anyone can use "Connect my Slack". */
const SETUP_ERROR_CODES = new Set(["not_configured", "not_installed"]);

/** The setup page URL, with the reason a person was sent there when there is one. */
export const slackSetupHref = (reason?: "connect"): string =>
  reason ? `${SLACK_SETUP_PATH}?${SLACK_SETUP_REASON_PARAM}=${reason}` : SLACK_SETUP_PATH;

/** Whether Slack still needs the one time setup, older API answers without `needs_setup` are derived from the flags. */
export const slackNeedsSetup = (status: SlackStatusDto | null): boolean =>
  status ? status.needs_setup ?? (!status.is_configured || !status.is_connected) : false;

/** Whether an API failure means the Slack app or the workspace is missing. */
export const isSlackSetupError = (failure: unknown): boolean => {
  const code = (failure as { code?: unknown } | null)?.code;
  return typeof code === "string" && SETUP_ERROR_CODES.has(code);
};
