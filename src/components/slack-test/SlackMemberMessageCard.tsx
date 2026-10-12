import React from "react";
import { ExternalLink, RefreshCw, Send } from "lucide-react";
import type { SlackNotificationTestsApi } from "@/hooks/useSlackNotificationTests";
import { SLACK_TEST_MESSAGE_MAX_LENGTH } from "@/types/slack";
import { STATUS_META } from "./slackTestStatus";
import { CARD, CARD_HINT, CARD_TITLE, FIELD_HINT, FIELD_LABEL, PRIMARY_BUTTON, SELECT, TEXT_ACTION, TEXTAREA } from "./slackTestStyles";

/** Key of `SlackNotificationTest::SlackMemberMessage` on the API. */
const MEMBER_MESSAGE_TEST_KEY = "slack_member_message";

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
    <form onSubmit={submitMessage} className={CARD}>
      <h3 className={CARD_TITLE}>Message any Slack member</h3>
      <p className={CARD_HINT}>Anyone in {catalog?.workspace?.team_name ?? "the Slack workspace"}, even people who never connected their account here.</p>

      <div className="mt-4 flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="slack-member-select" className={FIELD_LABEL}>
              Slack member
            </label>
            <button
              type="button"
              onClick={() => void suite.refreshSlackMembers()}
              disabled={!catalog?.workspace || suite.is_loading_slack_members || is_busy}
              className={TEXT_ACTION}
            >
              <RefreshCw size={13} strokeWidth={1.75} className={suite.is_loading_slack_members ? "animate-spin" : undefined} aria-hidden="true" />
              Refresh
            </button>
          </div>
          <select
            id="slack-member-select"
            value={selected_slack_user_id ?? ""}
            onChange={(event) => suite.setSelectedSlackUserId(event.target.value || null)}
            disabled={slack_members.length === 0 || is_busy}
            className={SELECT}
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
            <label htmlFor="slack-member-message" className={FIELD_LABEL}>
              Message
            </label>
            <span className={FIELD_HINT}>
              {member_message.length}/{SLACK_TEST_MESSAGE_MAX_LENGTH}
            </span>
          </div>
          <textarea
            id="slack-member-message"
            value={member_message}
            onChange={(event) => suite.setMemberMessage(event.target.value)}
            maxLength={SLACK_TEST_MESSAGE_MAX_LENGTH}
            rows={4}
            disabled={is_busy}
            placeholder="Write the message"
            className={TEXTAREA}
          />
        </div>
      </div>

      {result ? (
        <div role={result.status === "failed" ? "alert" : "status"} className={`admin-notice mt-4 flex-wrap justify-between ${STATUS_META[result.status].notice_class}`}>
          <span>{result.detail}</span>
          {result.links.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="admin-link inline-flex items-center gap-1">
              {link.label}
              <ExternalLink size={13} strokeWidth={1.75} aria-hidden="true" />
            </a>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className={FIELD_HINT}>{blocker && catalog?.workspace ? blocker : null}</span>
        <button type="submit" disabled={blocker !== null || is_busy} className={PRIMARY_BUTTON}>
          <Send size={15} strokeWidth={1.75} aria-hidden="true" />
          {is_sending ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
};

export default SlackMemberMessageCard;
