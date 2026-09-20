"use client";
import React, { useState } from "react";
import SlackLogo from "@/components/slack/SlackLogo";
import type { SlackIntegrationApi } from "@/hooks/useSlackIntegration";
import type { BoardAutomationDto } from "@/types/board-automation";
import { COMMUNICATION_ACTION_TYPES } from "../../automations/communicationTemplates";
import { DANGER_BUTTON, EnvelopeIcon, MessageBanner, PRIMARY_BUTTON, SECONDARY_BUTTON, StatusPill } from "../integrationUi";

export type MyConnectionsTabProps = {
  slack: SlackIntegrationApi;
  /** Where Slack sends the browser back to after an OAuth round trip. */
  return_path: string;
  automations: BoardAutomationDto[];
  /** Switches the dialog to Create > Connections for the full setup guide. */
  onOpenSetup: () => void;
};

function ConnectionRow({ icon, name, description, status_pill, used_by, children }: { icon: React.ReactNode; name: string; description: React.ReactNode; status_pill: React.ReactNode; used_by?: number; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-boardtree-border-soft px-4 py-4 last:border-b-0">
      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[9px] border border-boardtree-border-soft bg-boardtree-panel-alt text-boardtree-text-muted">{icon}</div>
      <div className="min-w-[220px] flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-semibold text-boardtree-text">{name}</h3>
          {status_pill}
        </div>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-boardtree-text-muted">{description}</p>
        {used_by !== undefined && <p className="mt-0.5 text-[12px] text-boardtree-text-faint">{used_by === 1 ? "Used by 1 automation on this table" : `Used by ${used_by} automations on this table`}</p>}
      </div>
      {children && <div className="flex flex-none flex-wrap gap-2">{children}</div>}
    </div>
  );
}

/**
 * Manage > My connections. What the automations on this table can reach: email, the Slack workspace,
 * and the signed in user's own Slack account, with the connect and disconnect actions inline.
 */
export default function MyConnectionsTab({ slack, return_path, automations, onOpenSetup }: MyConnectionsTabProps) {
  const [is_confirming_disconnect, setIsConfirmingDisconnect] = useState(false);

  const status = slack.status;
  const workspace = status?.workspace ?? null;
  const link = status?.current_user_link ?? null;
  const can_manage = status?.can_manage ?? false;

  const communication_automations = automations.filter((a) => COMMUNICATION_ACTION_TYPES.includes(a.action_type));
  const email_count = communication_automations.filter((a) => a.action_type === "send_email").length;
  const slack_count = communication_automations.length - email_count;

  return (
    <div>
      <MessageBanner error={slack.error} notice={slack.notice} onDismiss={slack.dismissMessages} />

      <div className="overflow-hidden rounded-[10px] border border-boardtree-border-soft bg-boardtree-surface">
        <ConnectionRow
          icon={<EnvelopeIcon />}
          name="Email"
          description="Sent by your account's mail service, so there is nothing to connect."
          status_pill={<StatusPill label="Ready to use" is_positive />}
          used_by={email_count}
        />

        <ConnectionRow
          icon={<SlackLogo size={22} />}
          name="Slack workspace"
          status_pill={slack.is_loading ? null : <StatusPill label={workspace ? "Connected" : "Not connected"} is_positive={!!workspace} />}
          description={
            slack.is_loading ? "Loading Slack..." : workspace ? (
              <>
                <span className="font-semibold text-boardtree-text">{workspace.team_name}</span>
                {`, ${workspace.linked_members_count} ${workspace.linked_members_count === 1 ? "member" : "members"} connected`}
              </>
            ) : status && !status.is_configured ? (
              "Slack is not configured on the server yet. Ask a developer to set the Slack app credentials."
            ) : can_manage ? (
              "Add the app to your Slack workspace so automations can post to channels and message people."
            ) : (
              "Ask an account administrator to add Slack."
            )
          }
          used_by={slack.is_loading ? undefined : slack_count}
        >
          {!workspace && status?.is_configured && can_manage && (
            <button type="button" disabled={slack.is_working} onClick={() => void slack.connectWorkspace(return_path)} className={PRIMARY_BUTTON}>
              {slack.is_working ? "Redirecting..." : "Add to Slack"}
            </button>
          )}
          {workspace && can_manage && !is_confirming_disconnect && (
            <button type="button" onClick={() => setIsConfirmingDisconnect(true)} className={SECONDARY_BUTTON}>Disconnect</button>
          )}
        </ConnectionRow>

        {workspace && can_manage && is_confirming_disconnect && (
          <div className="border-b border-boardtree-border-soft bg-boardtree-danger-hover px-4 py-3">
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

        <ConnectionRow
          icon={<SlackLogo size={22} />}
          name="My Slack account"
          status_pill={slack.is_loading || !workspace ? null : <StatusPill label={link ? "Connected" : "Not connected"} is_positive={!!link} />}
          description={
            !workspace
              ? "Available once a Slack workspace is connected."
              : link
                ? `Connected as ${link.slack_display_name ?? "your Slack account"}.`
                : "Link your own account to receive your notifications in Slack and to be reachable by Slack message automations."
          }
        >
          {workspace && !link && (
            <button type="button" disabled={slack.is_working} onClick={() => void slack.connectMyAccount(return_path)} className={PRIMARY_BUTTON}>
              {slack.is_working ? "Redirecting..." : "Connect my Slack"}
            </button>
          )}
          {link && (
            <>
              <button type="button" disabled={slack.is_working} onClick={() => void slack.sendTestMessage()} className={SECONDARY_BUTTON}>Send test</button>
              <button type="button" disabled={slack.is_working} onClick={() => void slack.disconnectMyAccount()} className={SECONDARY_BUTTON}>Disconnect</button>
            </>
          )}
        </ConnectionRow>
      </div>

      <p className="mt-3 text-[12.5px] text-boardtree-text-muted">
        Need the full setup guide?{" "}
        <button type="button" onClick={onOpenSetup} className="font-medium text-boardtree-accent hover:underline">Open Connections</button>
      </p>
    </div>
  );
}
