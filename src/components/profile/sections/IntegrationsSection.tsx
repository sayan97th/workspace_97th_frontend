"use client";
import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import SlackLogo from "@/components/slack/SlackLogo";
import { useSlackConnections } from "@/hooks/useSlackConnections";
import { useSlackIntegration } from "@/hooks/useSlackIntegration";
import { canSetUpOwnSlack, slackNeedsAppSetup, SLACK_PERSONAL_SETUP_PATH, SLACK_SETUP_PATH } from "@/lib/slackSetup";
import ProfileBanner from "../ProfileBanner";
import { ProfileSettingGroup, ProfileSettingRow } from "../ProfileSettingRow";
import SlackAccountRows from "./SlackAccountRows";

export type IntegrationsSectionProps = {
  /** Switches My Profile to Notifications, where the Slack column picks what reaches the member. */
  onOpenNotifications: () => void;
};

const BUTTON_DISABLED = "disabled:cursor-default disabled:opacity-50";

/**
 * My Profile > Integrations, the member side of the Slack setup, modeled on monday.com where every
 * member connects their own Slack account without opening Administration. The Slack app (its
 * Client ID and secrets) is chosen by an administrator in Administration > Slack settings and is
 * only shown here, never edited. With an active workspace the member signs in to it ("Connect my
 * Slack"), otherwise they approve the app in their own Slack workspace and their direct messages
 * go there (see `SlackService::notificationLinkFor()` on the API).
 */
const IntegrationsSection: React.FC<IntegrationsSectionProps> = ({ onOpenNotifications }) => {
  const slack = useSlackIntegration();
  const connections = useSlackConnections();

  if (slack.is_loading || connections.is_loading) {
    return (
      <div className="flex items-center justify-center py-16" role="status" aria-label="Loading integrations">
        <span className="profile-spinner" />
      </div>
    );
  }

  const status = slack.status;
  const workspace = status?.workspace ?? null;
  const link = status?.current_user_link ?? null;
  const can_manage = status?.can_manage ?? false;
  const needs_app_setup = slackNeedsAppSetup(status);
  const can_connect = canSetUpOwnSlack(status);
  const is_awaiting = slack.awaiting_purpose === "link" || connections.is_awaiting_slack;
  const is_working = slack.is_working || connections.is_working;

  const error = slack.error ?? connections.error;
  const notice = error ? null : slack.notice ?? connections.notice;
  const dismissMessages = () => {
    slack.dismissMessages();
    connections.dismissMessages();
  };

  const connectOwnWorkspace = () => void connections.connect(SLACK_PERSONAL_SETUP_PATH);
  const cancelAwaiting = () => {
    slack.cancelAwaitingSlack();
    connections.cancelAwaitingSlack();
  };

  const disconnectConnection = async (connection_id: number) => {
    await connections.disconnect(connection_id);
    // The connection's link goes with it, so the account that gets direct messages may have changed.
    await slack.reloadStatus();
  };

  let status_pill: React.ReactNode;
  if (link) status_pill = <span className="profile-pill profile-pill-success">Connected</span>;
  else if (is_awaiting) status_pill = <span className="profile-pill profile-pill-primary normal-case">Waiting for Slack</span>;
  else status_pill = <span className="profile-pill">Not connected</span>;

  let account_description: React.ReactNode;
  let account_control: React.ReactNode = null;

  if (needs_app_setup) {
    account_description = can_manage
      ? "Add the Slack app in Administration first, then come back to connect your account."
      : "Available once an administrator adds the Slack app for this account.";
  } else if (!can_connect && !link) {
    account_description = "Your role cannot connect integrations. Ask an administrator to turn on Connect integrations for your role.";
  } else if (link) {
    const team_name = link.team_name ?? workspace?.team_name ?? "Slack";
    account_description = (
      <>
        Connected as <strong>{link.slack_display_name ?? "your Slack account"}</strong> in <strong>{team_name}</strong>.
        {link.is_active_workspace === false ? " This is your own Slack workspace, not the one your account uses for channels." : null}
      </>
    );
    account_control = (
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => void slack.sendTestMessage()} disabled={is_working} className={`profile-button profile-button-secondary ${BUTTON_DISABLED}`}>
          Send test message
        </button>
      </div>
    );
  } else if (is_awaiting) {
    account_description = "Finish in the Slack tab that just opened. This page updates on its own when you are done.";
    account_control = (
      <button type="button" onClick={cancelAwaiting} className="profile-button profile-button-tertiary">
        Cancel
      </button>
    );
  } else if (workspace) {
    account_description = (
      <>
        Sign in with your <strong>{workspace.team_name}</strong> Slack account in the new tab. Mentions, assignments and automation messages then reach you as Slack direct messages.
        <button type="button" onClick={connectOwnWorkspace} disabled={is_working} className={`profile-link mt-1 block ${BUTTON_DISABLED}`}>
          My Slack is in another workspace
        </button>
      </>
    );
    account_control = (
      <button
        type="button"
        onClick={() => void slack.connectMyAccount(SLACK_PERSONAL_SETUP_PATH)}
        disabled={is_working}
        className={`profile-button profile-button-primary whitespace-nowrap ${BUTTON_DISABLED}`}
      >
        {slack.is_working ? "Opening Slack…" : "Connect my Slack"}
      </button>
    );
  } else {
    account_description = "Slack opens in a new tab. Pick your Slack workspace in the top right corner, review the permissions and click Allow.";
    account_control = (
      <button type="button" onClick={connectOwnWorkspace} disabled={is_working} className={`profile-button profile-button-primary whitespace-nowrap ${BUTTON_DISABLED}`}>
        Set up Slack
      </button>
    );
  }

  const has_accounts = link !== null || connections.connections.length > 0;

  return (
    <div>
      {error ? (
        <ProfileBanner tone="error" className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <span>{error}</span>
            <button type="button" onClick={dismissMessages} className="profile-link flex-none">
              Dismiss
            </button>
          </div>
        </ProfileBanner>
      ) : notice ? (
        <ProfileBanner tone="success" className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <span>{notice}</span>
            <button type="button" onClick={dismissMessages} className="profile-link flex-none">
              Dismiss
            </button>
          </div>
        </ProfileBanner>
      ) : null}

      <div className="profile-promo mb-7 flex-wrap">
        <span className="profile-device-icon">
          <SlackLogo size={18} />
        </span>
        <div className="min-w-[200px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="profile-row-label">Slack</span>
            {status_pill}
          </div>
          <div className="profile-row-description">Get a Slack message when someone tags you, assigns you or an automation notifies you.</div>
        </div>
        {link && link.team_url ? (
          <a href={link.team_url} target="_blank" rel="noopener noreferrer" className="profile-button profile-button-secondary">
            Open Slack
            <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
          </a>
        ) : null}
      </div>

      <ProfileSettingGroup title="Set up Slack" description="Three steps, the first one is done for you by your administrators.">
        <ProfileSettingRow
          label="1. Slack app"
          description={
            needs_app_setup
              ? "No Slack app has been added for this account yet. Only administrators and the account owner can add it."
              : `Your administrators chose ${status?.app_name ? `the ${status.app_name} app` : "the Slack app"} for everyone. Only they can change the app or its Client ID.`
          }
          control={
            needs_app_setup && can_manage ? (
              <Link href={SLACK_SETUP_PATH} className="profile-button profile-button-primary whitespace-nowrap">
                Add the Slack app
              </Link>
            ) : (
              <span className={`profile-pill ${needs_app_setup ? "" : "profile-pill-success"}`}>{needs_app_setup ? "Not set up" : "Ready"}</span>
            )
          }
        />
        <ProfileSettingRow label="2. Your Slack account" description={account_description} control={account_control} />
        <ProfileSettingRow
          label="3. Choose what reaches you"
          description="Pick which notifications are sent to Slack in the Slack column of your notification settings."
          control={
            <button type="button" onClick={onOpenNotifications} disabled={!link} className={`profile-button profile-button-secondary whitespace-nowrap ${BUTTON_DISABLED}`}>
              Notification settings
            </button>
          }
        />
      </ProfileSettingGroup>

      {has_accounts ? (
        <ProfileSettingGroup
          title="Your Slack accounts"
          description="Only you can see these. Automations you create can post through them."
          action={
            can_connect && !is_awaiting ? (
              <button type="button" onClick={connectOwnWorkspace} disabled={is_working} className={`profile-link flex-none ${BUTTON_DISABLED}`}>
                Add another account
              </button>
            ) : null
          }
        >
          <SlackAccountRows
            connections={connections.connections}
            link={link}
            active_team_name={workspace?.team_name ?? null}
            is_working={is_working}
            onDisconnectConnection={(connection_id) => void disconnectConnection(connection_id)}
            onDisconnectLink={() => void slack.disconnectMyAccount()}
          />
        </ProfileSettingGroup>
      ) : null}

      {can_manage ? (
        <p className="profile-row-description max-w-none">
          You manage Slack for the whole account in{" "}
          <Link href={SLACK_SETUP_PATH} className="profile-link">
            Administration, Slack settings
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
};

export default IntegrationsSection;
