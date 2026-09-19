"use client";
import React, { useState } from "react";
import Link from "next/link";
import SlackLogo from "@/components/slack/SlackLogo";
import type { SlackIntegrationApi } from "@/hooks/useSlackIntegration";
import type { ChannelFilter } from "./CommunicationView";
import { DANGER_BUTTON, EnvelopeIcon, MessageBanner, PRIMARY_BUTTON, SECONDARY_BUTTON, StatusPill } from "./integrationUi";

export type ConnectionsViewProps = {
  slack: SlackIntegrationApi;
  /** Where Slack sends the browser back to after an OAuth round trip. */
  return_path: string;
  /** Jumps to the Communication templates filtered to a channel; the buttons are hidden when omitted (boards without automations). */
  onBrowseTemplates?: (channel: ChannelFilter) => void;
};

const STEP_LABEL = "text-[11.5px] font-semibold uppercase tracking-wide text-boardtree-text-faint";

function IntegrationCard({ icon, title, status_pill, description, children }: { icon: React.ReactNode; title: string; status_pill: React.ReactNode; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[10px] border border-boardtree-border-soft p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[9px] border border-boardtree-border-soft bg-boardtree-panel-alt text-boardtree-text-muted">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-boardtree-text">{title}</h3>
            {status_pill}
          </div>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-boardtree-text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Integrate dialog > Connections. Email is built in, so it only offers shortcuts. Slack takes two
 * steps: an administrator adds the workspace, then every member links their own Slack account.
 */
export default function ConnectionsView({ slack, return_path, onBrowseTemplates }: ConnectionsViewProps) {
  const [is_confirming_disconnect, setIsConfirmingDisconnect] = useState(false);

  const status = slack.status;
  const workspace = status?.workspace ?? null;
  const link = status?.current_user_link ?? null;
  const can_manage = status?.can_manage ?? false;

  return (
    <div className="max-w-[720px]">
      <h2 className="text-[20px] font-semibold text-boardtree-text">Connections</h2>
      <p className="mb-4 mt-1 text-[13px] text-boardtree-text-muted">Connect the channels your team uses to get notified.</p>

      <MessageBanner error={slack.error} notice={slack.notice} onDismiss={slack.dismissMessages} />

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
          status_pill={slack.is_loading ? null : <StatusPill label={workspace ? "Connected" : "Not connected"} is_positive={!!workspace} />}
          description="Get a Slack message when someone tags or assigns you, and let automations post to channels or message people."
        >
          {slack.is_loading ? (
            <div className="text-[12.5px] text-boardtree-text-faint">Loading Slack...</div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <div className={STEP_LABEL}>1. Slack workspace</div>
                {!status?.is_configured && !workspace && (
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-boardtree-text-muted">
                    Slack is not configured on the server yet. Ask a developer to set <span className="font-semibold text-boardtree-text-secondary">SLACK_CLIENT_ID</span> and <span className="font-semibold text-boardtree-text-secondary">SLACK_CLIENT_SECRET</span>.
                  </p>
                )}
                {!workspace && status?.is_configured && (
                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <p className="text-[12.5px] text-boardtree-text-muted">{can_manage ? "Add the app to your Slack workspace." : "Ask an account administrator to add Slack."}</p>
                    {can_manage && (
                      <button type="button" disabled={slack.is_working} onClick={() => void slack.connectWorkspace(return_path)} className={`${PRIMARY_BUTTON} flex-none`}>
                        {slack.is_working ? "Redirecting..." : "Add to Slack"}
                      </button>
                    )}
                  </div>
                )}
                {workspace && (
                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <p className="text-[12.5px] text-boardtree-text-muted">
                      <span className="font-semibold text-boardtree-text">{workspace.team_name}</span>
                      {`, ${workspace.linked_members_count} ${workspace.linked_members_count === 1 ? "member" : "members"} connected`}
                    </p>
                    {can_manage && !is_confirming_disconnect && (
                      <button type="button" onClick={() => setIsConfirmingDisconnect(true)} className={`${SECONDARY_BUTTON} flex-none`}>Disconnect</button>
                    )}
                  </div>
                )}
                {workspace && can_manage && is_confirming_disconnect && (
                  <div className="mt-2 rounded-[8px] border border-boardtree-danger/30 bg-boardtree-danger-hover p-3">
                    <p className="text-[12.5px] leading-relaxed text-boardtree-text-secondary">Everyone stops receiving Slack notifications and automations that post to Slack are switched off.</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={slack.is_working}
                        onClick={async () => {
                          await slack.disconnectWorkspace();
                          setIsConfirmingDisconnect(false);
                        }}
                        className={DANGER_BUTTON}
                      >
                        {slack.is_working ? "Disconnecting..." : "Disconnect Slack"}
                      </button>
                      <button type="button" onClick={() => setIsConfirmingDisconnect(false)} className={SECONDARY_BUTTON}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              <div className={workspace ? "" : "opacity-50"}>
                <div className={STEP_LABEL}>2. Your Slack account</div>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <p className="text-[12.5px] text-boardtree-text-muted">
                    {link ? `Connected as ${link.slack_display_name ?? "your Slack account"}.` : "Link your own account to receive your notifications in Slack."}
                  </p>
                  {workspace && !link && (
                    <button type="button" disabled={slack.is_working} onClick={() => void slack.connectMyAccount(return_path)} className={`${PRIMARY_BUTTON} flex-none`}>
                      {slack.is_working ? "Redirecting..." : "Connect my Slack"}
                    </button>
                  )}
                  {link && (
                    <div className="flex flex-none gap-2">
                      <button type="button" disabled={slack.is_working} onClick={() => void slack.sendTestMessage()} className={SECONDARY_BUTTON}>Send test</button>
                      <button type="button" disabled={slack.is_working} onClick={() => void slack.disconnectMyAccount()} className={SECONDARY_BUTTON}>Disconnect</button>
                    </div>
                  )}
                </div>
                {link && (
                  <Link href="/profile?section=notifications" className="mt-1.5 inline-block text-[12px] font-medium text-boardtree-accent hover:underline">Choose what reaches you in Slack</Link>
                )}
              </div>

              {workspace && onBrowseTemplates && (
                <div>
                  <button type="button" onClick={() => onBrowseTemplates("slack")} className={SECONDARY_BUTTON}>Browse Slack templates</button>
                </div>
              )}
            </div>
          )}
        </IntegrationCard>
      </div>
    </div>
  );
}
