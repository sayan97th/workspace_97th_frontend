import React from "react";
import UserAvatar from "@/components/common/UserAvatar";
import { RefreshIcon } from "@/components/websocket-test/icons";
import type { SlackNotificationTestsApi } from "@/hooks/useSlackNotificationTests";

const FIELD =
  "w-full rounded-lg border border-shell-border bg-shell-panel-alt px-3 py-2 text-xs text-shell-text focus:border-brand-300 focus:outline-none disabled:opacity-50";

/**
 * Who receives the direct message tests and which channel the channel tests post to, plus the
 * workspace and queue the suite runs against.
 */
const SlackTestTargetsCard: React.FC<{ suite: SlackNotificationTestsApi }> = ({ suite }) => {
  const { catalog, recipients, channels, selected_user_id, selected_channel_id, is_running_batch, running_key } = suite;
  const is_busy = is_running_batch || running_key !== null;
  const recipient = recipients.find((candidate) => candidate.user_id === selected_user_id) ?? null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-shell-border bg-shell-panel p-5 shadow-theme-xs">
      <div>
        <div className="text-sm font-semibold text-shell-text">Test targets</div>
        <div className="text-xs text-shell-text-faint">
          {catalog?.workspace ? `Runs against the ${catalog.workspace.team_name} workspace.` : "No Slack workspace is connected."}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="slack-suite-recipient" className="text-xs font-medium text-shell-text-secondary">
            Recipient
          </label>
          <select
            id="slack-suite-recipient"
            value={selected_user_id ?? ""}
            onChange={(event) => suite.setSelectedUserId(event.target.value ? Number(event.target.value) : null)}
            disabled={recipients.length === 0 || is_busy}
            className={FIELD}
          >
            {recipients.length === 0 ? (
              <option value="">No member linked Slack yet</option>
            ) : (
              recipients.map((candidate) => (
                <option key={candidate.user_id} value={candidate.user_id}>
                  {candidate.full_name}
                </option>
              ))
            )}
          </select>
          {recipient ? (
            <div className="flex items-center gap-2.5 rounded-lg bg-shell-panel-alt px-3 py-2">
              <UserAvatar user={recipient} size={28} />
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-shell-text">{recipient.full_name}</div>
                <div className="truncate text-[11px] text-shell-text-faint">
                  Slack: {recipient.slack_display_name ?? recipient.slack_user_id} · {recipient.email}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[11px] leading-relaxed text-shell-text-faint">
              Direct message tests need a member who used &quot;Connect my Slack&quot; or was matched by email.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="slack-suite-channel" className="text-xs font-medium text-shell-text-secondary">
              Channel
            </label>
            <button
              type="button"
              onClick={() => void suite.refreshChannels()}
              disabled={!catalog?.workspace || suite.is_refreshing_channels || is_busy}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-200 hover:underline disabled:cursor-default disabled:opacity-50 disabled:no-underline"
            >
              <RefreshIcon size={11} className={suite.is_refreshing_channels ? "animate-spin" : undefined} />
              Refresh
            </button>
          </div>
          <select
            id="slack-suite-channel"
            value={selected_channel_id ?? ""}
            onChange={(event) => suite.setSelectedChannelId(event.target.value || null)}
            disabled={channels.length === 0 || is_busy}
            className={FIELD}
          >
            {channels.length === 0 ? (
              <option value="">No channels</option>
            ) : (
              channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.is_private ? "🔒 " : "#"}
                  {channel.name}
                </option>
              ))
            )}
          </select>
          <p className="text-[11px] leading-relaxed text-shell-text-faint">
            Use a test channel, these tests post real messages. Private channels need the app invited first, and the ephemeral and
            mention tests need the recipient in the channel too.
          </p>
        </div>
      </div>

      {catalog ? (
        <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-shell-border pt-3 text-[11px] text-shell-text-faint">
          <span>
            Queue connection: <span className="font-semibold text-shell-text-secondary">{catalog.queue_connection}</span>
          </span>
          <span>
            Events URL reachable by Slack:{" "}
            <span className="font-semibold text-shell-text-secondary">{catalog.can_receive_events ? "Yes" : "No, not public HTTPS"}</span>
          </span>
          <span>
            Granted scopes: <span className="font-semibold text-shell-text-secondary">{catalog.granted_scopes.length}</span>
          </span>
        </div>
      ) : null}
    </div>
  );
};

export default SlackTestTargetsCard;
