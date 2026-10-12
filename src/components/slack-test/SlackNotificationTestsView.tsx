"use client";

import React from "react";
import Link from "next/link";
import { Play, RefreshCw, Square } from "lucide-react";
import AdminPageActions from "@/components/administration/AdminPageActions";
import { useSlackNotificationTests } from "@/hooks/useSlackNotificationTests";
import { SLACK_SETUP_PATH } from "@/lib/slackSetup";
import type { SlackNotificationTestCategory, SlackNotificationTestDto } from "@/types/slack";
import SlackMemberMessageCard from "./SlackMemberMessageCard";
import SlackNotificationTestRow from "./SlackNotificationTestRow";
import SlackTestTargetsCard from "./SlackTestTargetsCard";
import { StatusSummary } from "./slackTestStatus";
import { CARD, CARD_HEADER, CARD_HINT, CARD_TITLE, PRIMARY_BUTTON, ROW_LIST, SECONDARY_BUTTON } from "./slackTestStyles";

const CATEGORIES: { key: SlackNotificationTestCategory; label: string; description: string }[] = [
  { key: "connection", label: "Connection and recipient", description: "Checks the bot and the recipient before any message is sent." },
  { key: "notifications", label: "Notification types", description: "Sample notifications with the exact layout real ones use, delivered as direct messages." },
  { key: "direct_messages", label: "Direct messages", description: "Plain and rich direct messages from the app to the recipient." },
  { key: "channels", label: "Channel messages", description: "Everything the app can do in a channel: post, mention, thread, edit, react, attach and schedule." },
  { key: "events", label: "Events from Slack", description: "Things Slack sends to the app, they only work when Slack can reach the events URL." },
];

/**
 * Slack notification tests at /admin/test/slack/notifications, inside the Slack testing frame
 * (`SlackTestShell`), which owns the heading and the admin only gate.
 *
 * Choose who and where the tests send to, then run one test, one group or every test against the
 * real workspace. Tests run one at a time and each result shows Slack's own answer, every call it
 * made and a link to the message. Run all, Stop and Reload sit in the page header.
 */
const SlackNotificationTestsView: React.FC = () => {
  const suite = useSlackNotificationTests();
  const { catalog, results, summary, running_key, is_running_batch } = suite;
  const tests = catalog?.tests ?? [];
  const is_busy = is_running_batch || running_key !== null;
  const runnable_count = tests.filter((test) => suite.getBlocker(test) === null).length;
  const result_count = Object.keys(results).length;

  const renderCategory = (category: (typeof CATEGORIES)[number], category_tests: SlackNotificationTestDto[]) => {
    const done_count = category_tests.filter((test) => results[test.key]).length;

    return (
      <section key={category.key} className={CARD} aria-labelledby={`slack-tests-${category.key}`}>
        <div className={CARD_HEADER}>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id={`slack-tests-${category.key}`} className={CARD_TITLE}>
                {category.label}
              </h3>
              <span className="text-[13px] text-shell-text-faint">
                {done_count > 0 ? `${done_count} of ${category_tests.length} run` : `${category_tests.length} ${category_tests.length === 1 ? "test" : "tests"}`}
              </span>
            </div>
            <p className={CARD_HINT}>{category.description}</p>
          </div>
          <button type="button" onClick={() => void suite.runTests(category_tests)} disabled={is_busy} className={SECONDARY_BUTTON}>
            <Play size={15} strokeWidth={1.75} aria-hidden="true" />
            Run group
          </button>
        </div>

        <ul className={ROW_LIST}>
          {category_tests.map((test) => (
            <SlackNotificationTestRow
              key={test.key}
              test={test}
              result={results[test.key] ?? null}
              is_running={running_key === test.key}
              blocker={suite.getBlocker(test)}
              is_disabled={is_busy}
              onRun={() => void suite.runTest(test)}
            />
          ))}
        </ul>
      </section>
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <AdminPageActions>
        <button type="button" onClick={() => void suite.reload()} disabled={is_busy || suite.is_loading} className={SECONDARY_BUTTON}>
          <RefreshCw size={16} strokeWidth={1.75} className={suite.is_loading ? "animate-spin" : undefined} aria-hidden="true" />
          Reload
        </button>
        {is_running_batch ? (
          <button type="button" onClick={suite.stopBatch} className="admin-button admin-button-danger">
            <Square size={14} strokeWidth={2} aria-hidden="true" />
            Stop
          </button>
        ) : null}
        <button type="button" onClick={() => void suite.runTests(tests)} disabled={is_busy || runnable_count === 0} className={PRIMARY_BUTTON}>
          <Play size={16} strokeWidth={1.75} aria-hidden="true" />
          {is_running_batch ? "Running…" : "Run all tests"}
        </button>
      </AdminPageActions>

      {suite.load_error ? (
        <div role="alert" className="admin-notice admin-notice-error justify-between">
          <span>{suite.load_error}</span>
          <button type="button" onClick={() => void suite.reload()} className="flex-none font-medium hover:underline">
            Try again
          </button>
        </div>
      ) : null}

      {suite.is_loading && !catalog ? <p className="text-[14px] text-shell-text-faint">Loading the tests…</p> : null}

      {catalog && !catalog.workspace ? (
        <div className="admin-notice admin-notice-warning justify-between">
          <span>No Slack workspace is connected, so every test is skipped. Connect one in Slack settings, then reload this page.</span>
          <Link href={SLACK_SETUP_PATH} className="admin-link flex-none">
            Open Slack settings
          </Link>
        </div>
      ) : null}

      {catalog ? (
        <>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <SlackTestTargetsCard suite={suite} />
            <SlackMemberMessageCard suite={suite} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--admin-neutral-bg)] px-4 py-3">
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-shell-text">
                {tests.length} tests, {runnable_count} ready to run
              </div>
              <div className="mt-0.5 text-[13px] text-shell-text-secondary">
                {result_count > 0
                  ? `${result_count} of ${tests.length} have a result.`
                  : "Running a test sends real messages to the recipient and the channel."}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {result_count > 0 ? <StatusSummary summary={summary} /> : null}
              {result_count > 0 ? (
                <button type="button" onClick={suite.clearResults} disabled={is_busy} className="admin-button admin-button-tertiary h-8 text-[13px]">
                  Clear results
                </button>
              ) : null}
            </div>
          </div>

          {CATEGORIES.map((category) => {
            const category_tests = tests.filter((test) => test.category === category.key);
            return category_tests.length > 0 ? renderCategory(category, category_tests) : null;
          })}
        </>
      ) : null}
    </div>
  );
};

export default SlackNotificationTestsView;
