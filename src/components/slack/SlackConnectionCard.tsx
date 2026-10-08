"use client";
import React from "react";
import Link from "next/link";
import SlackLogo from "@/components/slack/SlackLogo";
import SlackMessageBanner from "@/components/slack/SlackMessageBanner";
import type { SlackIntegrationApi } from "@/hooks/useSlackIntegration";
import { slackNeedsSetup, slackSetupHref } from "@/lib/slackSetup";

export type SlackConnectionCardProps = {
  slack: SlackIntegrationApi;
  /** False when the screen already shows the shared Slack banner above this card. */
  show_messages?: boolean;
};

const PRIMARY_BUTTON =
  "rounded-lg bg-brand-500 px-4 py-[9px] text-[12.5px] font-bold text-white transition-colors hover:bg-brand-600 disabled:cursor-default disabled:opacity-50";
const SECONDARY_BUTTON =
  "rounded-lg border border-shell-border-strong px-3.5 py-[9px] text-[12.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover disabled:cursor-default disabled:opacity-50";

/**
 * My Profile > Notifications > Slack, where a member links their own Slack account so
 * mentions, assignments and automation messages reach them as Slack direct messages. Slack
 * opens in a new tab, signed in to the active workspace only, so the card names that workspace.
 */
const SlackConnectionCard: React.FC<SlackConnectionCardProps> = ({ slack, show_messages = true }) => {
  if (slack.is_loading) {
    return null;
  }

  const status = slack.status;
  const link = status?.current_user_link ?? null;
  const workspace_name = status?.workspace?.team_name ?? null;
  const workspace_domain = status?.workspace?.team_url?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? null;

  let description: React.ReactNode;
  let action: React.ReactNode = null;

  if (slackNeedsSetup(status)) {
    // Slack is set up once by an administrator before anyone can connect, so send them to that page first.
    if (status?.can_configure_app) {
      description = "Slack has to be set up for the account before you can connect your own Slack. It only takes a few minutes and is done once.";
      action = (
        <Link href={slackSetupHref("connect")} className={`${PRIMARY_BUTTON} flex-none whitespace-nowrap`}>
          Set up Slack
        </Link>
      );
    } else {
      description = "Slack is not set up for this account yet. Ask an administrator or the account owner to set it up, then connect your Slack here.";
    }
  } else if (link) {
    description = `Connected as ${link.slack_display_name ?? "your Slack account"} in ${workspace_name}. Choose what reaches you in the Slack column below.`;
    action = (
      <div className="flex flex-none gap-2">
        <button type="button" onClick={() => void slack.sendTestMessage()} disabled={slack.is_working} className={SECONDARY_BUTTON}>
          Send test message
        </button>
        <button type="button" onClick={() => void slack.disconnectMyAccount()} disabled={slack.is_working} className={SECONDARY_BUTTON}>
          Disconnect
        </button>
      </div>
    );
  } else {
    description = slack.awaiting_purpose === "link"
      ? `Waiting for Slack. Finish in the new tab, signed in with your ${workspace_name} account.`
      : `Get a Slack message from the app when someone tags you, assigns you or an automation notifies you. Slack opens in a new tab, sign in with your ${workspace_name}${workspace_domain ? ` (${workspace_domain})` : ""} account.`;
    action = (
      <button type="button" onClick={() => void slack.connectMyAccount()} disabled={slack.is_working} className={`${PRIMARY_BUTTON} flex-none whitespace-nowrap`}>
        {slack.is_working ? "Opening Slack…" : "Connect my Slack"}
      </button>
    );
  }

  return (
    <div className="mb-6">
      {show_messages ? <SlackMessageBanner error={slack.error} notice={slack.notice} onDismiss={slack.dismissMessages} /> : null}

      <div className="flex items-center gap-[14px] rounded-xl border border-shell-border bg-shell-hover px-[18px] py-4">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] border border-shell-border bg-shell-panel">
          <SlackLogo size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold text-shell-text">Slack notifications</div>
          <div className="mt-[1px] text-[12.5px] leading-relaxed text-shell-text-muted">{description}</div>
        </div>
        {action}
      </div>
    </div>
  );
};

export default SlackConnectionCard;
