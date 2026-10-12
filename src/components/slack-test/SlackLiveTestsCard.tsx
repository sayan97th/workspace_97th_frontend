import React, { useState } from "react";
import { Check, Send } from "lucide-react";
import type { SlackIntegrationApi } from "@/hooks/useSlackIntegration";
import type { SlackDiagnosticsApi } from "@/hooks/useSlackDiagnostics";
import { SLACK_DIAGNOSTICS_PATH } from "./slackTestNav";
import { CARD, CARD_HINT, CARD_TITLE, PRIMARY_BUTTON, ROW_LIST, SECONDARY_BUTTON, SELECT } from "./slackTestStyles";

type SlackLiveTestsCardProps = {
  slack: SlackIntegrationApi;
  diagnostics: SlackDiagnosticsApi;
};

type TestStepProps = {
  number: number;
  title: string;
  description: string;
  is_done: boolean;
  children: React.ReactNode;
};

/** One numbered round trip: a check mark once it is done, its description and the button that runs it. */
const TestStep: React.FC<TestStepProps> = ({ number, title, description, is_done, children }) => (
  <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <span
        className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-[13px] font-semibold ${
          is_done ? "bg-[var(--admin-success-bg)] text-[var(--admin-success-text)]" : "bg-[var(--admin-neutral-bg)] text-shell-text-secondary"
        }`}
        aria-hidden="true"
      >
        {is_done ? <Check size={15} strokeWidth={2.5} /> : number}
      </span>
      <div className="min-w-0">
        <div className="text-[14px] font-medium text-shell-text">{title}</div>
        <p className="mt-0.5 text-[13px] leading-[19px] text-shell-text-secondary">{description}</p>
      </div>
    </div>
    <div className="flex flex-none flex-wrap items-center gap-2 pl-10 sm:pl-0">{children}</div>
  </li>
);

/**
 * The real Slack round trips, in the order they depend on each other: install the app into the
 * workspace, connect the admin's own account, then send a direct message and post to a channel.
 * Slack authorizations open in a new tab, the card shows that the page is waiting for it.
 */
const SlackLiveTestsCard: React.FC<SlackLiveTestsCardProps> = ({ slack, diagnostics }) => {
  const [channel_id, setChannelId] = useState("");

  const status = slack.status;
  const is_configured = status?.is_configured ?? false;
  const can_manage = status?.can_manage ?? false;
  const workspace = status?.workspace ?? null;
  const user_link = status?.current_user_link ?? null;
  const selected_channel_id = channel_id || diagnostics.channels[0]?.id || "";
  const link_description =
    status?.link_method === "authorize"
      ? "Opens a Slack authorization pinned to the active workspace, so the app knows which Slack member you are."
      : "Opens Sign in with Slack, so the app knows which Slack member you are.";

  const renderInstallDescription = () => {
    if (!is_configured) return "Set up a Slack app in Slack settings first.";
    if (workspace) return `Installed in ${workspace.team_name}. Installing again refreshes the bot token and its scopes.`;
    return "Runs Add to Slack. It proves the client ID, client secret and redirect URL all work.";
  };

  return (
    <section className={CARD}>
      <h3 className={CARD_TITLE}>Live tests</h3>
      <p className={CARD_HINT}>These talk to your real Slack workspace and send real messages.</p>

      {slack.is_awaiting_slack ? (
        <div role="status" className="admin-notice admin-notice-info mt-4 items-center justify-between">
          <span>Finish in the Slack tab. This page updates on its own once Slack sends you back.</span>
          <button type="button" onClick={slack.cancelAwaitingSlack} className="admin-link flex-none text-[13px]">
            Stop waiting
          </button>
        </div>
      ) : null}

      <ol className={ROW_LIST}>
        <TestStep number={1} title="Install the app" description={renderInstallDescription()} is_done={workspace !== null}>
          <button
            type="button"
            onClick={() => void slack.connectWorkspace(SLACK_DIAGNOSTICS_PATH)}
            disabled={!is_configured || !can_manage || slack.is_working || slack.is_awaiting_slack}
            className={workspace ? SECONDARY_BUTTON : PRIMARY_BUTTON}
          >
            {workspace ? "Reinstall" : "Add to Slack"}
          </button>
        </TestStep>

        <TestStep
          number={2}
          title="Connect your Slack account"
          description={user_link ? `Linked to ${user_link.slack_display_name ?? user_link.slack_user_id} in ${workspace?.team_name ?? "Slack"}.` : link_description}
          is_done={user_link !== null}
        >
          <button
            type="button"
            onClick={() => void slack.connectMyAccount(SLACK_DIAGNOSTICS_PATH)}
            disabled={!workspace || slack.is_working || slack.is_awaiting_slack}
            className={user_link ? SECONDARY_BUTTON : PRIMARY_BUTTON}
          >
            {user_link ? "Connect again" : "Connect my Slack"}
          </button>
        </TestStep>

        <TestStep
          number={3}
          title="Direct message"
          description="Sends you a direct message from the app, the same path tagged notifications use."
          is_done={false}
        >
          <button type="button" onClick={() => void slack.sendTestMessage()} disabled={!user_link || slack.is_working} className={SECONDARY_BUTTON}>
            <Send size={15} strokeWidth={1.75} aria-hidden="true" />
            Send me a test message
          </button>
        </TestStep>

        <TestStep number={4} title="Channel message" description="Posts to a channel with the workspace bot, the same path channel notifications use." is_done={false}>
          <select
            value={selected_channel_id}
            onChange={(event) => setChannelId(event.target.value)}
            disabled={diagnostics.channels.length === 0}
            aria-label="Slack channel"
            className={`${SELECT} w-[220px] max-w-full`}
          >
            {diagnostics.channels.length === 0 ? (
              <option value="">{diagnostics.is_loading_channels ? "Loading channels…" : "No channels"}</option>
            ) : (
              diagnostics.channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.is_private ? "🔒 " : "#"}
                  {channel.name}
                </option>
              ))
            )}
          </select>
          <button
            type="button"
            onClick={() => void diagnostics.sendChannelTest(selected_channel_id)}
            disabled={!selected_channel_id || diagnostics.is_sending_channel_test}
            className={SECONDARY_BUTTON}
          >
            <Send size={15} strokeWidth={1.75} aria-hidden="true" />
            {diagnostics.is_sending_channel_test ? "Posting…" : "Post"}
          </button>
        </TestStep>
      </ol>

      {diagnostics.channel_test_error || diagnostics.channel_test_notice ? (
        <div
          role={diagnostics.channel_test_error ? "alert" : "status"}
          className={`admin-notice mt-1 ${diagnostics.channel_test_error ? "admin-notice-error" : "admin-notice-success"}`}
        >
          {diagnostics.channel_test_error ?? diagnostics.channel_test_notice}
        </div>
      ) : null}
    </section>
  );
};

export default SlackLiveTestsCard;
