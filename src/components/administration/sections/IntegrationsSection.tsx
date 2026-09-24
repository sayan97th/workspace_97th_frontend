"use client";
import React, { useState } from "react";
import Link from "next/link";
import SlackLogo from "@/components/slack/SlackLogo";
import SlackMessageBanner from "@/components/slack/SlackMessageBanner";
import { useSlackIntegration } from "@/hooks/useSlackIntegration";
import { format } from "date-fns";

const PRIMARY_BUTTON =
  "rounded-[9px] bg-brand-500 px-4 py-[10px] text-[13px] font-bold text-white transition-colors hover:bg-brand-600 disabled:cursor-default disabled:opacity-50";
const SECONDARY_BUTTON =
  "rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-3.5 py-[10px] text-[13px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover disabled:cursor-default disabled:opacity-50";

const SLACK_BENEFITS = [
  "Anyone you tag or notify in an update gets a Slack direct message, just like an in-app notification.",
  "Automations can post to a Slack channel or message a person when a status, date or column changes.",
  "Each member connects their own Slack account and chooses what reaches them from My Profile.",
];

/** Administration > Integrations, connect the account to a Slack workspace so notifications and automations can reach Slack. */
const IntegrationsSection: React.FC = () => {
  const slack = useSlackIntegration();
  const [is_confirming_disconnect, setIsConfirmingDisconnect] = useState(false);

  if (slack.is_loading) {
    return <div className="text-[13px] text-shell-text-faint">Loading integrations…</div>;
  }

  const status = slack.status;
  const workspace = status?.workspace ?? null;
  const can_manage = status?.can_manage ?? false;

  const confirmDisconnect = async () => {
    await slack.disconnectWorkspace();
    setIsConfirmingDisconnect(false);
  };

  return (
    <div className="max-w-[720px]">
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
                ? `Connected to the ${workspace.team_name} workspace.`
                : "Send notifications and automation messages straight to Slack."}
            </p>
          </div>

          {!workspace && can_manage ? (
            <button
              type="button"
              onClick={() => void slack.connectWorkspace()}
              disabled={slack.is_working || !status?.is_configured}
              className={`${PRIMARY_BUTTON} flex-none whitespace-nowrap`}
            >
              {slack.is_working ? "Redirecting…" : "Add to Slack"}
            </button>
          ) : null}

          {workspace && can_manage && !is_confirming_disconnect ? (
            <button
              type="button"
              onClick={() => setIsConfirmingDisconnect(true)}
              className={`${SECONDARY_BUTTON} flex-none whitespace-nowrap`}
            >
              Disconnect
            </button>
          ) : null}
        </div>

        {!status?.is_configured ? (
          <div className="mt-4 rounded-[9px] border border-shell-border bg-shell-panel px-3.5 py-3 text-[12.5px] leading-relaxed text-shell-text-muted">
            Slack is not configured on the server yet. Create a Slack app, then set{" "}
            <span className="font-semibold text-shell-text-secondary">SLACK_CLIENT_ID</span>,{" "}
            <span className="font-semibold text-shell-text-secondary">SLACK_CLIENT_SECRET</span> and{" "}
            <span className="font-semibold text-shell-text-secondary">SLACK_SIGNING_SECRET</span> in the API environment.
          </div>
        ) : null}

        {!workspace && status?.is_configured && !can_manage ? (
          <div className="mt-4 text-[12.5px] text-shell-text-muted">Ask an account administrator to add Slack to this account.</div>
        ) : null}

        {workspace ? (
          <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-shell-border pt-4 sm:grid-cols-3">
            <div>
              <dt className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-shell-text-faint">Workspace</dt>
              <dd className="mt-1 text-[13.5px] font-semibold text-shell-text">{workspace.team_name}</dd>
            </div>
            <div>
              <dt className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-shell-text-faint">Connected by</dt>
              <dd className="mt-1 text-[13.5px] font-semibold text-shell-text">
                {workspace.connected_by ?? "Unknown"}
                {workspace.connected_at ? (
                  <span className="block text-[12px] font-normal text-shell-text-muted">
                    {format(new Date(workspace.connected_at), "MMM d, yyyy")}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-shell-text-faint">Members connected</dt>
              <dd className="mt-1 text-[13.5px] font-semibold text-shell-text">{workspace.linked_members_count}</dd>
            </div>
          </dl>
        ) : null}

        {workspace && is_confirming_disconnect ? (
          <div className="mt-5 rounded-[9px] border border-[#e2445c]/25 bg-[#e2445c]/[0.06] p-4">
            <div className="text-[13.5px] font-bold text-shell-text">Disconnect Slack?</div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-shell-text-muted">
              Every member will stop receiving Slack notifications and automations that post to Slack will be switched off.
              You can connect again at any time.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void confirmDisconnect()}
                disabled={slack.is_working}
                className="rounded-[9px] bg-[#e2445c] px-4 py-[9px] text-[13px] font-bold text-white transition-colors hover:bg-[#c22d45] disabled:cursor-default disabled:opacity-50"
              >
                {slack.is_working ? "Disconnecting…" : "Disconnect Slack"}
              </button>
              <button type="button" onClick={() => setIsConfirmingDisconnect(false)} className={SECONDARY_BUTTON}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>

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

        {workspace ? (
          <Link
            href="/profile?section=notifications"
            className="mt-3 inline-block text-[13px] font-semibold text-brand-200 hover:underline"
          >
            Connect your own Slack account in My Profile
          </Link>
        ) : null}
      </div>
    </div>
  );
};

export default IntegrationsSection;
