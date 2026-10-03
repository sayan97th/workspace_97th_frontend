"use client";
import React from "react";
import Link from "next/link";
import SlackLogo from "@/components/slack/SlackLogo";
import SlackMessageBanner from "@/components/slack/SlackMessageBanner";
import SlackConnectionCard from "@/components/slack/SlackConnectionCard";
import SlackWorkspacesCard from "@/components/administration/slack/SlackWorkspacesCard";
import SlackAppCredentialsCard from "@/components/administration/slack/SlackAppCredentialsCard";
import { PRIMARY_BUTTON, SECONDARY_BUTTON, SECTION_CARD, SECTION_HINT, SECTION_TITLE } from "@/components/administration/slack/slackAdminStyles";
import { useSlackIntegration } from "@/hooks/useSlackIntegration";
import { useSlackAdministration } from "@/hooks/useSlackAdministration";

const SLACK_BENEFITS = [
  "Anyone you tag or notify in an update gets a Slack direct message, just like an in-app notification.",
  "Automations can post to a Slack channel or message a person when a status, date or column changes.",
  "Members are matched to Slack by email, anyone else connects their own account and chooses what reaches them from My Profile.",
];

/**
 * Administration > Integrations, modeled on monday.com's Slack integration and Connections page.
 * Administrators and the account owner set the Slack app, connect one or more Slack workspaces
 * and switch the active one. Every Slack authorization opens in a new tab, so the workspace
 * stays where it was.
 */
const IntegrationsSection: React.FC = () => {
  const slack = useSlackIntegration();
  const status = slack.status;
  const can_manage = status?.can_manage ?? false;
  const admin = useSlackAdministration(slack, can_manage);

  if (slack.is_loading) {
    return <div className="text-[13px] text-shell-text-faint">Loading integrations…</div>;
  }

  const workspace = status?.workspace ?? null;
  const workspaces_count = status?.workspaces_count ?? 0;

  return (
    <div className="max-w-[760px]">
      <SlackMessageBanner error={slack.error} notice={slack.notice} onDismiss={slack.dismissMessages} />

      <div className="rounded-xl border border-shell-border bg-shell-panel-alt p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-[10px] border border-shell-border bg-shell-panel">
            <SlackLogo size={24} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[15px] font-bold text-shell-text">Slack</div>
              {workspace ? (
                <span className="rounded-md bg-[#00c875]/[0.14] px-2 py-0.5 text-[11.5px] font-bold text-[#3ddc97]">Connected</span>
              ) : null}
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-shell-text-muted">
              {workspace
                ? `Active workspace: ${workspace.team_name}.${workspaces_count > 1 ? ` ${workspaces_count} workspaces are connected.` : ""}`
                : "Send notifications and automation messages straight to Slack."}
            </p>
          </div>

          {workspace?.team_url ? (
            <a href={workspace.team_url} target="_blank" rel="noopener noreferrer" className={`${SECONDARY_BUTTON} flex-none`}>
              Open Slack
            </a>
          ) : null}
        </div>

        {!workspace && !can_manage ? (
          <div className="mt-4 text-[12.5px] text-shell-text-muted">Ask an account administrator to add Slack to this account.</div>
        ) : null}
      </div>

      {can_manage ? (
        <>
          <SlackWorkspacesCard slack={slack} admin={admin} />

          {workspace ? (
            <section className={SECTION_CARD}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className={SECTION_TITLE}>Members</h3>
                  <p className={SECTION_HINT}>
                    {workspace.linked_members_count === 1 ? "1 member receives" : `${workspace.linked_members_count} members receive`} Slack notifications in{" "}
                    {workspace.team_name}. Match members whose email is the same in Slack, anyone else can use &quot;Connect my Slack&quot; in My Profile.
                  </p>
                </div>
                <button type="button" onClick={() => void admin.matchMembers()} disabled={admin.busy_key !== null} className={`${PRIMARY_BUTTON} flex-none`}>
                  {admin.busy_key === "match" ? "Matching…" : "Match members by email"}
                </button>
              </div>
            </section>
          ) : null}

          <SlackAppCredentialsCard admin={admin} />
        </>
      ) : null}

      {workspace ? (
        <div className="mt-5">
          <SlackConnectionCard slack={slack} show_messages={false} />
        </div>
      ) : null}

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

        {can_manage ? (
          <Link href="/admin/test/slack" className="mt-5 block text-[13px] font-semibold text-brand-200 hover:underline">
            Test the Slack connection
          </Link>
        ) : null}
      </div>
    </div>
  );
};

export default IntegrationsSection;
