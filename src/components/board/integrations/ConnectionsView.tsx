"use client";
import React, { useState } from "react";
import Link from "next/link";
import SlackLogo from "@/components/slack/SlackLogo";
import type { SlackIntegrationApi } from "@/hooks/useSlackIntegration";
import { CheckIcon } from "@/icons/workspace-icons";
import type { ChannelFilter } from "./CommunicationView";
import { EnvelopeIcon, MessageBanner, PRIMARY_BUTTON, SECONDARY_BUTTON, StatusPill } from "./integrationUi";
import SlackConnectAccountDialog from "./SlackConnectAccountDialog";
import { SLACK_SETUP_PATH } from "@/lib/slackSetup";

export type ConnectionsViewProps = {
  slack: SlackIntegrationApi;
  /** Where Slack sends the browser back to after an OAuth round trip. */
  return_path: string;
  /** Jumps to the Communication templates filtered to a channel; the buttons are hidden when omitted (boards without automations). */
  onBrowseTemplates?: (channel: ChannelFilter) => void;
};

type StepState = "done" | "current" | "locked";

function IntegrationCard({ icon, title, status_pill, description, children }: { icon: React.ReactNode; title: string; status_pill: React.ReactNode; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[10px] border border-boardtree-border-soft p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[9px] border border-boardtree-border-soft bg-boardtree-panel-alt text-boardtree-text-muted">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-outfit text-section-title text-boardtree-text">{title}</h3>
            {status_pill}
          </div>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-boardtree-text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const STEP_BADGE: Record<StepState, string> = {
  done: "bg-[#00c875] text-white",
  current: "bg-boardtree-accent text-white",
  locked: "border border-boardtree-border bg-boardtree-surface text-boardtree-text-faint",
};

/** One numbered step of the Slack setup, with a line down to the next step. */
function SetupStep({ number, state, title, description, action, children, is_last = false }: {
  number: number;
  state: StepState;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  is_last?: boolean;
}) {
  return (
    <li className="relative flex gap-3" aria-current={state === "current" ? "step" : undefined}>
      {!is_last && <span aria-hidden="true" className={`absolute bottom-[-12px] left-[11px] top-7 w-px ${state === "done" ? "bg-[#00c875]/50" : "bg-boardtree-border-soft"}`} />}
      <span className={`relative flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11.5px] font-semibold ${STEP_BADGE[state]}`}>
        {state === "done" ? <CheckIcon size={12} /> : number}
        <span className="sr-only">{state === "done" ? ", done" : state === "locked" ? ", not available yet" : ", to do"}</span>
      </span>
      <div className={`min-w-0 flex-1 ${state === "locked" ? "opacity-60" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-boardtree-text">{title}</div>
            <div className="mt-0.5 text-[12.5px] leading-relaxed text-boardtree-text-muted">{description}</div>
          </div>
          {action && <div className="flex flex-none flex-wrap gap-2">{action}</div>}
        </div>
        {children}
      </div>
    </li>
  );
}

/**
 * Integrate dialog > Connections. Email is built in, so it only offers shortcuts. Slack takes two
 * steps: an administrator connects the workspace once in Administration > Integrations > Slack,
 * then every member links their own Slack account through {@link SlackConnectAccountDialog}.
 */
export default function ConnectionsView({ slack, return_path, onBrowseTemplates }: ConnectionsViewProps) {
  const [is_connect_dialog_open, setIsConnectDialogOpen] = useState(false);

  const status = slack.status;
  const workspace = status?.workspace ?? null;
  const link = status?.current_user_link ?? null;
  const can_manage = status?.can_manage ?? false;

  let status_pill: React.ReactNode = null;
  if (!slack.is_loading) {
    if (link) status_pill = <StatusPill label="Connected" is_positive />;
    else if (workspace) status_pill = <StatusPill label="1 of 2 steps done" is_positive={false} />;
    else status_pill = <StatusPill label="Not connected" is_positive={false} />;
  }

  let workspace_description: React.ReactNode;
  let workspace_action: React.ReactNode = null;

  if (workspace) {
    workspace_description = (
      <>
        <span className="font-semibold text-boardtree-text">{workspace.team_name}</span>
        {` is connected, ${workspace.linked_members_count} ${workspace.linked_members_count === 1 ? "member has" : "members have"} linked their account.`}
      </>
    );
    if (can_manage) {
      workspace_action = <Link href={SLACK_SETUP_PATH} className={`${SECONDARY_BUTTON} inline-flex items-center`}>Manage workspace</Link>;
    }
  } else if (can_manage) {
    workspace_description = status?.is_configured
      ? "The Slack app is ready. Add your Slack workspace in Administration > Integrations > Slack."
      : "Set up the Slack app and add your workspace in Administration > Integrations > Slack. It is done once for the whole account.";
    workspace_action = (
      <Link href={SLACK_SETUP_PATH} className={`${PRIMARY_BUTTON} inline-flex items-center`}>
        {status?.is_configured ? "Add workspace" : "Set up Slack"}
      </Link>
    );
  } else {
    workspace_description = "An account administrator connects the Slack workspace once for everyone. Ask one to set it up in Administration > Integrations > Slack.";
  }

  let account_description: React.ReactNode;
  let account_action: React.ReactNode = null;

  if (!workspace) {
    account_description = "Available once a Slack workspace is connected.";
  } else if (link) {
    account_description = (
      <>
        Connected as <span className="font-semibold text-boardtree-text">{link.slack_display_name ?? "your Slack account"}</span>. Your notifications reach you in Slack.
      </>
    );
    account_action = (
      <>
        <button type="button" disabled={slack.is_working} onClick={() => void slack.sendTestMessage()} className={SECONDARY_BUTTON}>Send test</button>
        <button type="button" disabled={slack.is_working} onClick={() => void slack.disconnectMyAccount()} className={SECONDARY_BUTTON}>Disconnect</button>
      </>
    );
  } else {
    account_description = slack.awaiting_purpose === "link"
      ? "Waiting for Slack. Finish signing in in the new tab."
      : `Sign in with your ${workspace.team_name} account to receive your notifications in Slack.`;
    account_action = (
      <button type="button" onClick={() => setIsConnectDialogOpen(true)} className={PRIMARY_BUTTON}>Connect my Slack</button>
    );
  }

  return (
    <div className="max-w-[720px]">
      <h2 className="text-boardtree-text font-heading text-dialog-title">Connections</h2>
      <p className="mb-4 mt-1 text-[13px] text-boardtree-text-muted">Connect the channels your team uses to get notified.</p>

      {/* The dialog shows Slack errors itself while it is open. */}
      {!is_connect_dialog_open && <MessageBanner error={slack.error} notice={slack.notice} onDismiss={slack.dismissMessages} />}

      <div className="flex flex-col gap-3">
        <IntegrationCard
          icon={<EnvelopeIcon />}
          title="Email"
          status_pill={<StatusPill label="Ready to use" is_positive />}
          description="Notification emails and email automations are sent by your account's mail service, so there is nothing to connect."
        >
          <div className="flex flex-wrap gap-2">
            <Link href="/profile?section=notifications" className={`${SECONDARY_BUTTON} inline-flex items-center`}>Email preferences</Link>
            {onBrowseTemplates && <button type="button" onClick={() => onBrowseTemplates("email")} className={SECONDARY_BUTTON}>Browse email templates</button>}
          </div>
        </IntegrationCard>

        <IntegrationCard
          icon={<SlackLogo size={22} />}
          title="Slack"
          status_pill={status_pill}
          description="Get a Slack message when someone tags or assigns you, and let automations post to channels or message people."
        >
          {slack.is_loading ? (
            <div className="text-[12.5px] text-boardtree-text-faint">Loading Slack...</div>
          ) : (
            <>
              <ol aria-label="Slack setup steps" className="flex flex-col gap-6 rounded-[8px] bg-boardtree-panel-alt p-4">
                <SetupStep
                  number={1}
                  state={workspace ? "done" : "current"}
                  title="Connect a Slack workspace"
                  description={workspace_description}
                  action={workspace_action}
                />
                <SetupStep
                  number={2}
                  state={!workspace ? "locked" : link ? "done" : "current"}
                  title="Connect your Slack account"
                  description={account_description}
                  action={account_action}
                  is_last
                >
                  {link && (
                    <Link href="/profile?section=notifications" className="mt-1.5 inline-block text-[12px] font-medium text-boardtree-accent hover:underline">Choose what reaches you in Slack</Link>
                  )}
                </SetupStep>
              </ol>

              {workspace && onBrowseTemplates && (
                <div className="mt-4">
                  <button type="button" onClick={() => onBrowseTemplates("slack")} className={SECONDARY_BUTTON}>Browse Slack templates</button>
                </div>
              )}
            </>
          )}
        </IntegrationCard>
      </div>

      {is_connect_dialog_open && workspace && (
        <SlackConnectAccountDialog
          slack={slack}
          return_path={return_path}
          onClose={() => {
            setIsConnectDialogOpen(false);
            slack.dismissMessages();
          }}
        />
      )}
    </div>
  );
}
