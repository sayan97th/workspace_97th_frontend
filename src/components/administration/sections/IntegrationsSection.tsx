"use client";
import React from "react";
import Link from "next/link";
import SlackLogo from "@/components/slack/SlackLogo";
import SlackMessageBanner from "@/components/slack/SlackMessageBanner";
import SlackConnectionCard from "@/components/slack/SlackConnectionCard";
import IntegrationAppsCard from "@/components/administration/integrations/IntegrationAppsCard";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/components/administration/slack/slackAdminStyles";
import { useSlackIntegration } from "@/hooks/useSlackIntegration";
import { slackNeedsSetup, SLACK_SETUP_PATH } from "@/lib/slackSetup";

const SLACK_BENEFITS = [
  "Anyone you tag or notify in an update gets a Slack direct message, just like an in-app notification.",
  "Automations can post to a Slack channel or message a person when a status, date or column changes.",
  "Members are matched to Slack by email, anyone else connects their own account and chooses what reaches them from My Profile.",
];

/**
 * Administration > Integrations, the list of integrations of the account, modeled on monday.com's
 * Integrations page. The Slack setup itself lives on its own page,
 * Administration > Integrations > Slack ({@link SLACK_SETUP_PATH}), which only administrators and
 * the account owner can open. Everyone else sees whether Slack is ready and links their own account.
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

  let summary: string;
  if (!needs_setup && workspace) {
    summary = `Active workspace: ${workspace.team_name}.${workspaces_count > 1 ? ` ${workspaces_count} workspaces are connected.` : ""}`;
  } else if (status?.is_configured) {
    summary = "The Slack app is set up. Connect a Slack workspace to start sending notifications.";
  } else {
    summary = "Send notifications and automation messages straight to Slack. Set it up once for the whole account.";
  }

  return (
    <div className="max-w-[760px]">
      <SlackMessageBanner error={slack.error} notice={slack.notice} onDismiss={slack.dismissMessages} />

      <div className="rounded-xl border border-shell-border bg-shell-panel-alt p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-[10px] border border-shell-border bg-shell-panel">
            <SlackLogo size={24} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[15px] font-bold text-shell-text">Slack</div>
              {needs_setup ? (
                <span className="rounded-md bg-[#fdab3d]/[0.14] px-2 py-0.5 text-[11.5px] font-bold text-[#fdab3d]">Setup required</span>
              ) : (
                <span className="rounded-md bg-[#00c875]/[0.14] px-2 py-0.5 text-[11.5px] font-bold text-[#3ddc97]">Connected</span>
              )}
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-shell-text-muted">{summary}</p>
          </div>

          {can_manage ? (
            <Link href={SLACK_SETUP_PATH} className={`${needs_setup ? PRIMARY_BUTTON : SECONDARY_BUTTON} flex-none`}>
              {needs_setup ? "Set up Slack" : "Manage Slack"}
            </Link>
          ) : workspace?.team_url ? (
            <a href={workspace.team_url} target="_blank" rel="noopener noreferrer" className={`${SECONDARY_BUTTON} flex-none`}>
              Open Slack
            </a>
          ) : null}
        </div>

        {needs_setup && !can_manage ? (
          <div className="mt-4 text-[12.5px] text-shell-text-muted">Ask an account administrator or the account owner to set up Slack for this account.</div>
        ) : null}
      </div>

      {!needs_setup ? (
        <div className="mt-5">
          <SlackConnectionCard slack={slack} show_messages={false} />
        </div>
      ) : null}

      {can_manage ? <IntegrationAppsCard /> : null}

      <div className="mt-6">
        <div className="mb-2.5 text-[13px] font-bold text-shell-text-secondary">What Slack adds</div>
        <ul className="flex flex-col gap-2">
          {SLACK_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-shell-text-muted">
              <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-brand-500" />
              {benefit}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default IntegrationsSection;
