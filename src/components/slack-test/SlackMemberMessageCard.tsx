import React from "react";
import { RefreshIcon, SendIcon } from "@/components/websocket-test/icons";
import { TONE_CLASSES } from "@/components/websocket-test/status-meta";
import type { SlackNotificationTestsApi } from "@/hooks/useSlackNotificationTests";
import { SLACK_TEST_MESSAGE_MAX_LENGTH } from "@/types/slack";
import { RESULT_STATUS_META } from "./SlackNotificationTestRow";

/** Key of `SlackNotificationTest::SlackMemberMessage` on the API. */
const MEMBER_MESSAGE_TEST_KEY = "slack_member_message";

const FIELD =
  "w-full rounded-lg border border-shell-border bg-shell-panel-alt px-3 py-2 text-xs text-shell-text placeholder:text-shell-text-faint focus:border-brand-300 focus:outline-none disabled:opacity-50";

/**
 * Pick any person in the Slack workspace from a list and send them a direct message, whether or
 * not they ever linked an account here. Runs the suite's "Message any Slack member" test, so the
 * result shows Slack's real answer and a link to the message.
 */
const SlackMemberMessageCard: React.FC<{ suite: SlackNotificationTestsApi }> = ({ suite }) => {
  const { catalog, slack_members, selected_slack_user_id, member_message, running_key, is_running_batch } = suite;
  const test = catalog?.tests.find((candidate) => candidate.key === MEMBER_MESSAGE_TEST_KEY) ?? null;
  const result = suite.results[MEMBER_MESSAGE_TEST_KEY] ?? null;
  const is_sending = running_key === MEMBER_MESSAGE_TEST_KEY;
  const is_busy = is_running_batch || running_key !== null;
  const blocker = test ? suite.getBlocker(test) : "This test is not available on the API.";

  const submitMessage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (test && blocker === null && !is_busy) void suite.runTest(test);
  };

  const renderMemberLabel = (member: (typeof slack_members)[number]) => {
    const name = member.real_name ?? member.display_name ?? member.name;
    return member.email ? `${name} (${member.email})` : `${name} (@${member.name})`;
  };

  return (
    <form onSubmit={submitMessage} className="flex flex-col gap-4 rounded-2xl border border-shell-border bg-shell-panel p-5 shadow-theme-xs">
      <div>
        <div className="text-sm font-semibold text-shell-text">Send a message to a Slack member</div>
        <div className="text-xs text-shell-text-faint">
          Anyone in {catalog?.workspace?.team_name ?? "the Slack workspace"}, even people who never connected their account here.
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="slack-member-select" className="text-xs font-medium text-shell-text-secondary">
            Slack member
          </label>
          <button
            type="button"
            onClick={() => void suite.refreshSlackMembers()}
            disabled={!catalog?.workspace || suite.is_loading_slack_members || is_busy}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-200 hover:underline disabled:cursor-default disabled:opacity-50 disabled:no-underline"
          >
            <RefreshIcon size={11} className={suite.is_loading_slack_members ? "animate-spin" : undefined} />
            Refresh
          </button>
        </div>
        <select
          id="slack-member-select"
          value={selected_slack_user_id ?? ""}
          onChange={(event) => suite.setSelectedSlackUserId(event.target.value || null)}
          disabled={slack_members.length === 0 || is_busy}
          className={FIELD}
        >
          <option value="">
            {suite.is_loading_slack_members ? "Loading Slack members…" : slack_members.length === 0 ? "No Slack members found" : "Choose a member"}
          </option>
          {slack_members.map((member) => (
            <option key={member.id} value={member.id}>
              {renderMemberLabel(member)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor="slack-member-message" className="text-xs font-medium text-shell-text-secondary">
            Message
          </label>
          <span className="text-[11px] text-shell-text-faint">
            {member_message.length}/{SLACK_TEST_MESSAGE_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="slack-member-message"
          value={member_message}
          onChange={(event) => suite.setMemberMessage(event.target.value)}
          maxLength={SLACK_TEST_MESSAGE_MAX_LENGTH}
          rows={3}
          disabled={is_busy}
          placeholder="Write the message"
          className={`${FIELD} resize-y`}
        />
      </div>

      {result ? (
        <div
          role={result.status === "failed" ? "alert" : "status"}
          className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${TONE_CLASSES[RESULT_STATUS_META[result.status].tone].border} ${TONE_CLASSES[RESULT_STATUS_META[result.status].tone].bg} ${TONE_CLASSES[RESULT_STATUS_META[result.status].tone].text}`}
        >
          <span>{result.detail}</span>
          {result.links.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-200 hover:underline">
              {link.label}
            </a>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] text-shell-text-faint">{blocker && catalog?.workspace ? blocker : null}</span>
        <button
          type="submit"
          disabled={blocker !== null || is_busy}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-default disabled:opacity-50"
        >
          <SendIcon size={13} />
          {is_sending ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
};

export default SlackMemberMessageCard;
