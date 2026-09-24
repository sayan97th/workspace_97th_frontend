import React, { useState } from "react";
import { SendIcon } from "@/components/websocket-test/icons";
import type { SlackIntegrationApi } from "@/hooks/useSlackIntegration";
import type { SlackDiagnosticsApi } from "@/hooks/useSlackDiagnostics";

type SlackLiveTestsCardProps = {
  slack: SlackIntegrationApi;
  diagnostics: SlackDiagnosticsApi;
};

/** Where Slack sends the browser back after an OAuth round trip started from this page. */
const RETURN_PATH = "/admin/test/slack";

const BUTTON =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-default disabled:opacity-50";

const TestRow: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <div className="text-[13px] font-medium text-shell-text">{title}</div>
      <p className="mt-0.5 text-xs leading-relaxed text-shell-text-secondary">{description}</p>
    </div>
    <div className="flex flex-none flex-wrap items-center gap-2">{children}</div>
  </div>
);

/**
 * Tests that exercise the real Slack round trip: installing the app, linking the admin's own
 * account, then sending a direct message and a channel message.
 */
const SlackLiveTestsCard: React.FC<SlackLiveTestsCardProps> = ({ slack, diagnostics }) => {
  const [channel_id, setChannelId] = useState("");

  const status = slack.status;
  const is_configured = status?.is_configured ?? false;
  const workspace = status?.workspace ?? null;
  const user_link = status?.current_user_link ?? null;
  const selected_channel_id = channel_id || diagnostics.channels[0]?.id || "";

  return (
    <div className="flex flex-col rounded-2xl border border-shell-border bg-shell-panel p-5 shadow-theme-xs">
      <div>
        <div className="text-sm font-semibold text-shell-text">Live tests</div>
        <div className="text-xs text-shell-text-faint">These talk to your real Slack workspace.</div>
      </div>

      <div className="divide-y divide-shell-border">
        <TestRow
          title="1. Install the app"
          description={
            workspace
              ? `Installed in ${workspace.team_name}. Installing again refreshes the bot token and scopes.`
              : "Runs the Add to Slack flow. It proves the client ID, client secret and redirect URL all work."
          }
        >
          <button
            type="button"
            onClick={() => void slack.connectWorkspace(RETURN_PATH)}
            disabled={!is_configured || slack.is_working}
            className={BUTTON}
          >
            {workspace ? "Reinstall" : "Add to Slack"}
          </button>
        </TestRow>

        <TestRow
          title="2. Link your Slack account"
          description={
            user_link
              ? `Linked to ${user_link.slack_display_name ?? user_link.slack_user_id}.`
              : "Runs Sign in with Slack so the app knows which Slack member you are."
          }
        >
          <button
            type="button"
            onClick={() => void slack.connectMyAccount(RETURN_PATH)}
            disabled={!workspace || slack.is_working}
            className={BUTTON}
          >
            {user_link ? "Link again" : "Connect my Slack"}
          </button>
        </TestRow>

        <TestRow title="3. Direct message" description="Sends you a direct message from the app, the same path tagged notifications use.">
          <button type="button" onClick={() => void slack.sendTestMessage()} disabled={!user_link || slack.is_working} className={BUTTON}>
            <SendIcon size={13} />
            Send me a test message
          </button>
        </TestRow>

        <TestRow title="4. Channel message" description="Posts to a channel, the same path the Slack automations use.">
          <select
            value={selected_channel_id}
            onChange={(event) => setChannelId(event.target.value)}
            disabled={diagnostics.channels.length === 0}
            aria-label="Slack channel"
            className="max-w-[200px] rounded-lg border border-shell-border bg-shell-panel-alt px-2.5 py-2 text-xs text-shell-text disabled:opacity-50"
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
            className={BUTTON}
          >
            <SendIcon size={13} />
            {diagnostics.is_sending_channel_test ? "Posting…" : "Post"}
          </button>
        </TestRow>
      </div>

      {diagnostics.channel_test_error || diagnostics.channel_test_notice ? (
        <div
          role={diagnostics.channel_test_error ? "alert" : "status"}
          className={`rounded-lg border px-3 py-2 text-xs ${
            diagnostics.channel_test_error ? "border-error-300 bg-error-50 text-error-600" : "border-success-300 bg-success-50 text-success-600"
          }`}
        >
          {diagnostics.channel_test_error ?? diagnostics.channel_test_notice}
        </div>
      ) : null}
    </div>
  );
};

export default SlackLiveTestsCard;
