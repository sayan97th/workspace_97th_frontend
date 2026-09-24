import React, { useState } from "react";
import UserAvatar from "@/components/common/UserAvatar";
import { SendIcon } from "@/components/websocket-test/icons";
import type { SlackUserNotificationApi } from "@/hooks/useSlackUserNotification";
import { SLACK_TEST_MESSAGE_MAX_LENGTH } from "@/types/slack";

type SlackUserNotificationCardProps = {
  notification: SlackUserNotificationApi;
  /** Whether the diagnostics confirmed a working bot token, without it no message can be sent. */
  has_working_bot: boolean;
};

const DEFAULT_MESSAGE = "This is a test notification from the workspace. If you can read it, Slack notifications reach you.";

const FIELD =
  "w-full rounded-lg border border-shell-border bg-shell-panel-alt px-3 py-2 text-xs text-shell-text placeholder:text-shell-text-faint focus:border-brand-300 focus:outline-none disabled:opacity-50";

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
    return 'No member has linked their Slack account yet. Each person uses "Connect my Slack" in My Profile, or step 2 above for yourself.';
  };

  return (
    <form
      onSubmit={(event) => void submitNotification(event)}
      className="flex flex-col gap-4 rounded-2xl border border-shell-border bg-shell-panel p-5 shadow-theme-xs"
    >
      <div>
        <div className="text-sm font-semibold text-shell-text">Notify a member</div>
        <div className="text-xs text-shell-text-faint">
          Sends a Slack direct message to someone who linked their Slack account, the same path tagged notifications use.
        </div>
      </div>

      {recipients.length === 0 ? (
        <div className="rounded-lg border border-dashed border-shell-border px-3 py-4 text-center text-xs text-shell-text-secondary">
          {renderEmptyState()}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="flex flex-col gap-2">
            <label htmlFor="slack-test-recipient" className="text-xs font-medium text-shell-text-secondary">
              Recipient
            </label>
            <select
              id="slack-test-recipient"
              value={recipient?.user_id ?? ""}
              onChange={(event) => setSelectedUserId(Number(event.target.value))}
              disabled={is_sending}
              className={FIELD}
            >
              {recipients.map((candidate) => (
                <option key={candidate.user_id} value={candidate.user_id}>
                  {candidate.full_name}
                </option>
              ))}
            </select>

            {recipient ? (
              <div className="flex items-center gap-2.5 rounded-lg bg-shell-panel-alt px-3 py-2">
                <UserAvatar user={recipient} size={28} />
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-shell-text">{recipient.full_name}</div>
                  <div className="truncate text-[11px] text-shell-text-faint">
                    Slack: {recipient.slack_display_name ?? recipient.slack_user_id}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="slack-test-message" className="text-xs font-medium text-shell-text-secondary">
                Message
              </label>
              <span className="text-[11px] text-shell-text-faint">
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
              className={`${FIELD} resize-y`}
            />
          </div>
        </div>
      )}

      {send_error || send_notice ? (
        <div
          role={send_error ? "alert" : "status"}
          className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${
            send_error ? "border-error-300 bg-error-50 text-error-600" : "border-success-300 bg-success-50 text-success-600"
          }`}
        >
          <span>{send_error ?? send_notice}</span>
          <button type="button" onClick={notification.dismissMessages} className="flex-none font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!can_send}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-default disabled:opacity-50"
        >
          <SendIcon size={13} />
          {is_sending ? "Sending…" : "Send notification"}
        </button>
      </div>
    </form>
  );
};

export default SlackUserNotificationCard;
