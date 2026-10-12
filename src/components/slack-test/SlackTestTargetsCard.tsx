import React from "react";
import { RefreshCw } from "lucide-react";
import UserAvatar from "@/components/common/UserAvatar";
import type { SlackNotificationTestsApi } from "@/hooks/useSlackNotificationTests";
import { CARD, CARD_HINT, CARD_TITLE, FIELD_HINT, FIELD_LABEL, SELECT, TEXT_ACTION } from "./slackTestStyles";

/**
 * Who receives the direct message tests and which channel the channel tests post to, plus the
 * workspace, queue and events setup the suite runs against.
 */
const SlackTestTargetsCard: React.FC<{ suite: SlackNotificationTestsApi }> = ({ suite }) => {
  const { catalog, recipients, channels, selected_user_id, selected_channel_id, is_running_batch, running_key } = suite;
  const is_busy = is_running_batch || running_key !== null;
  const recipient = recipients.find((candidate) => candidate.user_id === selected_user_id) ?? null;

  return (
    <section className={CARD}>
      <h3 className={CARD_TITLE}>Test targets</h3>
      <p className={CARD_HINT}>{catalog?.workspace ? `Every test runs against the ${catalog.workspace.team_name} workspace.` : "No Slack workspace is connected."}</p>

      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="slack-suite-recipient" className={FIELD_LABEL}>
            Recipient
          </label>
          <select
            id="slack-suite-recipient"
            value={selected_user_id ?? ""}
            onChange={(event) => suite.setSelectedUserId(event.target.value ? Number(event.target.value) : null)}
            disabled={recipients.length === 0 || is_busy}
            className={SELECT}
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
            <div className="flex items-center gap-2.5 rounded-lg bg-[var(--admin-neutral-bg)] px-3 py-2">
              <UserAvatar user={recipient} size={32} />
              <div className="min-w-0">
                <div className="truncate text-[14px] font-medium text-shell-text">{recipient.full_name}</div>
                <div className="truncate text-[13px] text-shell-text-faint">
                  Slack: {recipient.slack_display_name ?? recipient.slack_user_id}, {recipient.email}
                </div>
              </div>
            </div>
          ) : (
            <p className={FIELD_HINT}>Direct message tests need a member who used &quot;Connect my Slack&quot; or was matched by email.</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="slack-suite-channel" className={FIELD_LABEL}>
              Channel
            </label>
            <button type="button" onClick={() => void suite.refreshChannels()} disabled={!catalog?.workspace || suite.is_refreshing_channels || is_busy} className={TEXT_ACTION}>
              <RefreshCw size={13} strokeWidth={1.75} className={suite.is_refreshing_channels ? "animate-spin" : undefined} aria-hidden="true" />
              Refresh
            </button>
          </div>
          <select
            id="slack-suite-channel"
            value={selected_channel_id ?? ""}
            onChange={(event) => suite.setSelectedChannelId(event.target.value || null)}
            disabled={channels.length === 0 || is_busy}
            className={SELECT}
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
          <p className={FIELD_HINT}>
            Use a test channel, these tests post real messages. Private channels need the app invited first, and the ephemeral and mention tests need the
            recipient in the channel too.
          </p>
        </div>
      </div>

      {catalog ? (
        <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-1 border-t border-[var(--admin-divider)] pt-3 text-[13px] sm:grid-cols-3">
          <div>
            <dt className="text-shell-text-faint">Queue connection</dt>
            <dd className="font-medium text-shell-text">{catalog.queue_connection}</dd>
          </div>
          <div>
            <dt className="text-shell-text-faint">Events from Slack</dt>
            <dd className="font-medium text-shell-text">{catalog.can_receive_events ? "Reachable" : "Not public HTTPS"}</dd>
          </div>
          <div>
            <dt className="text-shell-text-faint">Granted scopes</dt>
            <dd className="font-medium text-shell-text">{catalog.granted_scopes.length}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
};

export default SlackTestTargetsCard;
