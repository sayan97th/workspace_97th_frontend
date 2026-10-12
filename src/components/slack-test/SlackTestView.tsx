"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { BellRing, RefreshCw } from "lucide-react";
import AdminPageActions from "@/components/administration/AdminPageActions";
import SlackMessageBanner from "@/components/slack/SlackMessageBanner";
import { useSlackDiagnostics } from "@/hooks/useSlackDiagnostics";
import { useSlackIntegration } from "@/hooks/useSlackIntegration";
import { useSlackUserNotification } from "@/hooks/useSlackUserNotification";
import SlackAppSetupCard from "./SlackAppSetupCard";
import SlackChecklistCard from "./SlackChecklistCard";
import SlackLiveTestsCard from "./SlackLiveTestsCard";
import SlackOverviewTiles from "./SlackOverviewTiles";
import SlackUserNotificationCard from "./SlackUserNotificationCard";
import { SLACK_NOTIFICATION_TESTS_PATH } from "./slackTestNav";
import { StatusPill } from "./slackTestStatus";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "./slackTestStyles";

/**
 * Slack diagnostics at /admin/test/slack, inside the Slack testing frame (`SlackTestShell`), which
 * owns the heading and the admin only gate.
 *
 * Top to bottom: what is in use (app, workspace, your accounts), every server side check next to
 * the values to copy into the Slack app, the live round trips (install, connect, direct message,
 * channel post) and a custom message to any linked member. The checks run again on their own
 * when a Slack authorization started here finishes in its tab.
 */
const SlackTestView: React.FC = () => {
  const slack = useSlackIntegration();
  const diagnostics = useSlackDiagnostics();
  const notification = useSlackUserNotification(diagnostics.has_working_bot, diagnostics.diagnostics?.ran_at ?? null);
  const { runDiagnostics } = diagnostics;
  const summary = diagnostics.diagnostics?.summary ?? null;

  // An install or "Connect my Slack" finished in the Slack tab, show its effect on every check.
  useEffect(() => {
    if (slack.completed_at > 0) void runDiagnostics();
  }, [slack.completed_at, runDiagnostics]);

  const renderOverallPill = () => {
    if (!summary || diagnostics.is_running) return null;
    if (summary.failed > 0) return <StatusPill status="failed" count={summary.failed} />;
    if (summary.warning > 0) return <StatusPill status="warning" count={summary.warning} />;
    return <span className="admin-pill admin-pill-success">All checks passed</span>;
  };

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <AdminPageActions>
        {renderOverallPill()}
        <Link href={SLACK_NOTIFICATION_TESTS_PATH} className={SECONDARY_BUTTON}>
          <BellRing size={16} strokeWidth={1.75} aria-hidden="true" />
          Notification tests
        </Link>
        <button type="button" onClick={() => void runDiagnostics()} disabled={diagnostics.is_running} className={PRIMARY_BUTTON}>
          <RefreshCw size={16} strokeWidth={1.75} className={diagnostics.is_running ? "animate-spin" : undefined} aria-hidden="true" />
          {diagnostics.is_running ? "Running checks…" : "Run checks"}
        </button>
      </AdminPageActions>

      <SlackMessageBanner error={slack.error} notice={slack.notice} onDismiss={slack.dismissMessages} />

      <SlackOverviewTiles status={slack.status} is_loading={slack.is_loading} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SlackChecklistCard diagnostics={diagnostics.diagnostics} is_running={diagnostics.is_running} run_error={diagnostics.run_error} />
        <SlackAppSetupCard app={diagnostics.diagnostics?.app ?? null} />
      </div>

      <SlackLiveTestsCard slack={slack} diagnostics={diagnostics} />

      <SlackUserNotificationCard notification={notification} has_working_bot={diagnostics.has_working_bot} />
    </div>
  );
};

export default SlackTestView;
