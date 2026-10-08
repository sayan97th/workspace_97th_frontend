"use client";

import React from "react";
import Link from "next/link";
import SlackLogo from "@/components/slack/SlackLogo";
import { RefreshIcon, SendIcon } from "@/components/websocket-test/icons";
import { TONE_CLASSES } from "@/components/websocket-test/status-meta";
import { useSlackNotificationTests } from "@/hooks/useSlackNotificationTests";
import type { SlackDiagnosticStatus, SlackNotificationTestCategory, SlackNotificationTestDto } from "@/types/slack";
import SlackNotificationTestRow, { RESULT_STATUS_META } from "./SlackNotificationTestRow";
import SlackTestAccessGate from "./SlackTestAccessGate";
import SlackTestTargetsCard from "./SlackTestTargetsCard";

const CATEGORIES: { key: SlackNotificationTestCategory; label: string; description: string }[] = [
  { key: "connection", label: "Connection and recipient", description: "Checks the bot and the recipient before any message is sent." },
  { key: "notifications", label: "Notification types", description: "Sample notifications with the exact layout real ones use, delivered as direct messages." },
  { key: "direct_messages", label: "Direct messages", description: "Plain and rich direct messages from the app to the recipient." },
  { key: "channels", label: "Channel messages", description: "Everything the app can do in a channel: post, mention, thread, edit, react, attach and schedule." },
  { key: "events", label: "Events from Slack", description: "Things Slack sends to the app, they only work when Slack can reach the events URL." },
];

const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-default disabled:opacity-50";

const SECONDARY_BUTTON =
  "inline-flex items-center gap-1.5 rounded-lg border border-shell-border bg-shell-panel-alt px-3 py-1.5 text-xs font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover disabled:cursor-default disabled:opacity-50";

/**
 * Admin test suite at /admin/test/slack/notifications. Lists every Slack notification test the
 * API offers, grouped by what it exercises, and runs them one at a time or all together against
 * the real workspace, showing each result with Slack's own answer and a link to the message.
 */
const SlackNotificationTestsView: React.FC = () => (
  <SlackTestAccessGate>
    <SlackNotificationTestsContent />
  </SlackTestAccessGate>
);

const SlackNotificationTestsContent: React.FC = () => {
  const suite = useSlackNotificationTests();
  const { catalog, results, summary, running_key, is_running_batch } = suite;
  const tests = catalog?.tests ?? [];
  const is_busy = is_running_batch || running_key !== null;
  const runnable_count = tests.filter((test) => suite.getBlocker(test) === null).length;
  const has_results = Object.keys(results).length > 0;

  const renderCategory = (category: (typeof CATEGORIES)[number], category_tests: SlackNotificationTestDto[]) => (
    <section key={category.key} className="flex flex-col rounded-2xl border border-shell-border bg-shell-panel p-5 shadow-theme-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-shell-text">{category.label}</h2>
          <p className="text-xs text-shell-text-faint">{category.description}</p>
        </div>
        <button type="button" onClick={() => void suite.runTests(category_tests)} disabled={is_busy} className={SECONDARY_BUTTON}>
          Run group
        </button>
      </div>

      <ul className="divide-y divide-shell-border">
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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-shell-border bg-shell-panel">
            <SlackLogo size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-shell-text">Slack notification tests</h1>
            <p className="text-sm text-shell-text-secondary">Send real notifications through Slack and check every step of their delivery.</p>
          </div>
        </div>
        <Link href="/admin/test/slack" className="text-xs font-semibold text-brand-200 hover:underline">
          Back to Slack diagnostics
        </Link>
      </div>

      {suite.load_error ? (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-lg border border-error-300 bg-error-50 px-3 py-2 text-xs text-error-600">
          <span>{suite.load_error}</span>
          <button type="button" onClick={() => void suite.reload()} className="flex-none font-semibold hover:underline">
            Try again
          </button>
        </div>
      ) : null}

      {suite.is_loading && !catalog ? <div className="text-xs text-shell-text-faint">Loading the tests…</div> : null}

      {catalog ? (
        <>
          <SlackTestTargetsCard suite={suite} />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-shell-border bg-shell-panel px-5 py-4 shadow-theme-xs">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-shell-text">
                {tests.length} tests, {runnable_count} ready to run
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {has_results ? (
                  (Object.keys(RESULT_STATUS_META) as SlackDiagnosticStatus[]).map((status) =>
                    summary[status] > 0 ? (
                      <span
                        key={status}
                        className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASSES[RESULT_STATUS_META[status].tone].bg} ${TONE_CLASSES[RESULT_STATUS_META[status].tone].text}`}
                      >
                        {summary[status]} {RESULT_STATUS_META[status].label.toLowerCase()}
                      </span>
                    ) : null
                  )
                ) : (
                  <span className="text-xs text-shell-text-faint">Running a test sends real messages to the recipient and the channel.</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => void suite.reload()} disabled={is_busy || suite.is_loading} className={SECONDARY_BUTTON}>
                <RefreshIcon size={13} className={suite.is_loading ? "animate-spin" : undefined} />
                Reload
              </button>
              {has_results ? (
                <button type="button" onClick={suite.clearResults} disabled={is_busy} className={SECONDARY_BUTTON}>
                  Clear results
                </button>
              ) : null}
              {is_running_batch ? (
                <button type="button" onClick={suite.stopBatch} className={SECONDARY_BUTTON}>
                  Stop
                </button>
              ) : null}
              <button type="button" onClick={() => void suite.runTests(tests)} disabled={is_busy || runnable_count === 0} className={PRIMARY_BUTTON}>
                <SendIcon size={13} />
                {is_running_batch ? "Running…" : "Run all tests"}
              </button>
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
