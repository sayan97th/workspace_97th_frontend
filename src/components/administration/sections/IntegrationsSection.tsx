"use client";
import React from "react";
import Link from "next/link";
import SlackLogo from "@/components/slack/SlackLogo";
import SlackMessageBanner from "@/components/slack/SlackMessageBanner";
import SlackConnectionCard from "@/components/slack/SlackConnectionCard";
import IntegrationAppsCard from "@/components/administration/integrations/IntegrationAppsCard";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/components/administration/slack/slackAdminStyles";
import { useSlackIntegration } from "@/hooks/useSlackIntegration";
import { canSetUpOwnSlack, slackNeedsAppSetup, slackNeedsSetup, SLACK_PERSONAL_SETUP_PATH, SLACK_SETUP_PATH } from "@/lib/slackSetup";

const SLACK_BENEFITS = [
  "Anyone you tag or notify in an update gets a Slack direct message, just like an in-app notification.",
  "Automations can post to a Slack channel or message a person when a status, date or column changes.",
  "Members are matched to Slack by email, anyone else connects their own account and chooses what reaches them from My Profile.",
  "People invited to a workspace or a board also get the invitation in Slack when their email is in the connected Slack workspace, no sign in needed.",
];

/**
 * Administration > Integrations, the list of integrations of the account, modeled on monday.com's
 * Integrations page. The Slack setup itself is the next rail page,
 * Administration > Connections > Slack settings ({@link SLACK_SETUP_PATH}), which only administrators
 * and the account owner can open. Everyone else sees whether Slack is ready and links their own account.
 */
const IntegrationsSection: React.FC = () => {
  const slack = useSlackIntegration();
  const status = slack.status;
  const can_manage = status?.can_manage ?? false;

  if (slack.is_loading) {
    return <div className="text-[13px] text-shell-text-faint">Loading integrations…</div>;
  }

  const workspace = status?.workspace ?? null;
  const workspaces_count = status?.workspaces_count ?? 0;
  const needs_setup = slackNeedsSetup(status);
  // Members set up Slack for their own account in My Profile once the app is in place.
  const can_set_up_own = !can_manage && !slackNeedsAppSetup(status) && canSetUpOwnSlack(status);

  const app_summary = status?.app_name ? ` Using the ${status.app_name} Slack app.` : "";

  let summary: string;
  if (!needs_setup && workspace) {
    summary = `Active workspace: ${workspace.team_name}.${workspaces_count > 1 ? ` ${workspaces_count} workspaces are connected.` : ""}${can_manage ? app_summary : ""}`;
  } else if (status?.is_configured) {
    summary = can_manage
      ? `The Slack app is set up.${app_summary} Connect a Slack workspace to start sending notifications.`
      : "The Slack app is set up. Set up Slack for your own account to receive your notifications there.";
  } else {
    summary = "Send notifications and automation messages straight to Slack. Set it up once for the whole account.";
  }

  return (
    <div className="max-w-[760px]">
      <SlackMessageBanner error={slack.error} notice={slack.notice} onDismiss={slack.dismissMessages} />

      <div className="rounded-lg border border-[var(--admin-list-border)] bg-shell-panel p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-[10px] border border-shell-border bg-shell-panel">
            <SlackLogo size={24} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[16px] font-semibold text-shell-text">Slack</div>
              {needs_setup ? (
                <span className="admin-pill admin-pill-warning">Setup required</span>
              ) : (
                <span className="admin-pill admin-pill-success">Connected</span>
              )}
            </div>
            <p className="mt-1 text-[14px] leading-5 text-shell-text-secondary">{summary}</p>
          </div>

          {can_manage ? (
            <Link href={SLACK_SETUP_PATH} className={`${needs_setup ? PRIMARY_BUTTON : SECONDARY_BUTTON} flex-none`}>
              {needs_setup ? "Set up Slack" : "Manage Slack"}
            </Link>
          ) : can_set_up_own ? (
            <Link href={SLACK_PERSONAL_SETUP_PATH} className={`${needs_setup ? PRIMARY_BUTTON : SECONDARY_BUTTON} flex-none`}>
              {needs_setup ? "Set up my Slack" : "My Slack accounts"}
            </Link>
          ) : workspace?.team_url ? (
            <a href={workspace.team_url} target="_blank" rel="noopener noreferrer" className={`${SECONDARY_BUTTON} flex-none`}>
              Open Slack
            </a>
          ) : null}
        </div>

        {needs_setup && !can_manage && !can_set_up_own ? (
          <div className="mt-4 text-[12.5px] text-shell-text-muted">Ask an account administrator or the account owner to add the Slack app for this account.</div>
        ) : null}
      </div>

      {!needs_setup || (status?.current_user_link ?? null) !== null ? (
        <div className="mt-5">
          <SlackConnectionCard slack={slack} show_messages={false} />
        </div>
      ) : null}

      {can_manage ? <IntegrationAppsCard /> : null}

      <div className="mt-6">
        <div className="mb-2.5 text-[13px] font-bold text-shell-text-secondary">What Slack adds</div>
        <ul className="flex flex-col gap-2">
          {SLACK_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2.5 text-[14px] leading-5 text-shell-text-secondary">
              <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[var(--admin-button-primary)]" />
              {benefit}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default IntegrationsSection;
