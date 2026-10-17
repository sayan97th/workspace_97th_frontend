"use client";
import React from "react";
import type { SlackAdministrationApi } from "@/hooks/useSlackAdministration";
import type { SlackConnectedWorkspaceDto } from "@/types/slack";
import SettingsToggleRow from "@/components/administration/SettingsToggleRow";
import { SECTION_CARD, SECTION_HINT, SECTION_TITLE } from "@/components/administration/slack/slackAdminStyles";

export type SlackInvitationsCardProps = {
  workspace: SlackConnectedWorkspaceDto;
  admin: SlackAdministrationApi;
};

/**
 * Administration > Integrations > Slack > Invitations. People invited to a workspace or a board, or
 * added to a board from the Share dialog, also get a direct message from the app's bot. The bot finds
 * them by email, so they do not need an account or to sign in first, the email invitation is sent either way.
 */
const SlackInvitationsCard: React.FC<SlackInvitationsCardProps> = ({ workspace, admin }) => {
  const is_busy = admin.busy_key !== null;

  return (
    <section className={SECTION_CARD}>
      <h3 className={SECTION_TITLE}>Invitations</h3>
      <p className={SECTION_HINT}>
        Invitations always go out by email. Slack only reaches people whose email is the same in {workspace.team_name}, nobody needs to sign
        in to Slack from this app first.
      </p>

      <SettingsToggleRow
        className="mt-4 border-t border-shell-border pt-4"
        label="Send invitations on Slack"
        description="Workspace and board invitations, and people added to a board from Share, also get a Slack direct message with a button to open it."
        is_on={workspace.notify_invitations}
        onToggle={() => {
          if (!is_busy) void admin.setNotifyInvitations(workspace.id, !workspace.notify_invitations);
        }}
      />

      {workspace.notify_invitations && !workspace.can_lookup_by_email ? (
        <div className="mt-3 admin-notice admin-notice-warning">
          {workspace.team_name} was connected without the users:read.email permission, so only members who already linked their Slack
          account get invitations there. Reconnect the workspace above to reach everyone by email.
        </div>
      ) : null}
    </section>
  );
};

export default SlackInvitationsCard;
