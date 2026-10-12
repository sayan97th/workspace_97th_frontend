import React, { useState } from "react";
import { Send } from "lucide-react";
import UserAvatar from "@/components/common/UserAvatar";
import type { SlackUserNotificationApi } from "@/hooks/useSlackUserNotification";
import { SLACK_TEST_MESSAGE_MAX_LENGTH } from "@/types/slack";
import { CARD, CARD_HINT, CARD_TITLE, FIELD_HINT, FIELD_LABEL, PRIMARY_BUTTON, SELECT, TEXTAREA } from "./slackTestStyles";

type SlackUserNotificationCardProps = {
  notification: SlackUserNotificationApi;
  /** Whether the diagnostics confirmed a working bot token, without it no message can be sent. */
  has_working_bot: boolean;
};

const DEFAULT_MESSAGE = "This is a test notification from the workspace. If you can read it, Slack notifications reach you.";

/**
 * Sends a custom Slack direct message to any member who linked their Slack account, through the
 * same path tagged notifications use, so an administrator can confirm a specific person gets them.
 */
const SlackUserNotificationCard: React.FC<SlackUserNotificationCardProps> = ({ notification, has_working_bot }) => {
  const [selected_user_id, setSelectedUserId] = useState<number | null>(null);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  const { recipients, is_loading_recipients, is_sending, send_error, send_notice } = notification;
  const recipient = recipients.find((candidate) => candidate.user_id === selected_user_id) ?? recipients[0] ?? null;
  const trimmed_message = message.trim();
  const can_send = has_working_bot && recipient !== null && trimmed_message.length > 0 && !is_sending;

  const submitNotification = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!can_send || !recipient) return;
    await notification.sendNotification(recipient.user_id, trimmed_message);
  };

  const renderEmptyState = () => {
    if (!has_working_bot) return "Needs a connected workspace with a valid bot token. Fix the failing connection checks first.";
    if (is_loading_recipients) return "Loading members…";
    return 'No member has linked their Slack account yet. Each person uses "Connect my Slack" in My Profile, or "Match members by email" in Slack settings links everyone at once.';
  };

  return (
    <form onSubmit={(event) => void submitNotification(event)} className={CARD}>
      <h3 className={CARD_TITLE}>Notify a member</h3>
      <p className={CARD_HINT}>Sends a Slack direct message to someone who linked their Slack account, the same path tagged notifications use.</p>

      {recipients.length === 0 ? (
        <div className="admin-table-empty mt-4 rounded-lg border border-dashed border-[var(--admin-list-border)]">{renderEmptyState()}</div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="flex flex-col gap-2">
            <label htmlFor="slack-test-recipient" className={FIELD_LABEL}>
              Recipient
            </label>
            <select
              id="slack-test-recipient"
              value={recipient?.user_id ?? ""}
              onChange={(event) => setSelectedUserId(Number(event.target.value))}
              disabled={is_sending}
              className={SELECT}
            >
              {recipients.map((candidate) => (
                <option key={candidate.user_id} value={candidate.user_id}>
                  {candidate.full_name}
                </option>
              ))}
            </select>

            {recipient ? (
              <div className="flex items-center gap-2.5 rounded-lg bg-[var(--admin-neutral-bg)] px-3 py-2">
                <UserAvatar user={recipient} size={32} />
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium text-shell-text">{recipient.full_name}</div>
                  <div className="truncate text-[13px] text-shell-text-faint">Slack: {recipient.slack_display_name ?? recipient.slack_user_id}</div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="slack-test-message" className={FIELD_LABEL}>
                Message
              </label>
              <span className={FIELD_HINT}>
                {message.length}/{SLACK_TEST_MESSAGE_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id="slack-test-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={SLACK_TEST_MESSAGE_MAX_LENGTH}
              rows={4}
              disabled={is_sending}
              placeholder="Write the notification message"
              className={TEXTAREA}
            />
          </div>
        </div>
      )}

      {send_error || send_notice ? (
        <div role={send_error ? "alert" : "status"} className={`admin-notice mt-4 justify-between ${send_error ? "admin-notice-error" : "admin-notice-success"}`}>
          <span>{send_error ?? send_notice}</span>
          <button type="button" onClick={notification.dismissMessages} className="flex-none font-medium hover:underline">
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button type="submit" disabled={!can_send} className={PRIMARY_BUTTON}>
          <Send size={15} strokeWidth={1.75} aria-hidden="true" />
          {is_sending ? "Sending…" : "Send notification"}
        </button>
      </div>
    </form>
  );
};

export default SlackUserNotificationCard;
