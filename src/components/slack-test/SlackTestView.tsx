"use client";

import React from "react";
import Link from "next/link";
import SlackLogo from "@/components/slack/SlackLogo";
import SlackMessageBanner from "@/components/slack/SlackMessageBanner";
import { SendIcon } from "@/components/websocket-test/icons";
import { useSlackDiagnostics } from "@/hooks/useSlackDiagnostics";
import { useSlackIntegration } from "@/hooks/useSlackIntegration";
import { useSlackUserNotification } from "@/hooks/useSlackUserNotification";
import SlackAppSetupCard from "./SlackAppSetupCard";
import SlackChecklistCard from "./SlackChecklistCard";
import SlackLiveTestsCard from "./SlackLiveTestsCard";
import SlackTestAccessGate from "./SlackTestAccessGate";
import SlackUserNotificationCard from "./SlackUserNotificationCard";

/**
 * Admin diagnostic screen at /admin/test/slack. Checks every piece the Slack integration depends
 * on (credentials, redirect URL, signing secret, workspace, bot token, scopes, channels and
 * the admin's own link) and runs real messages through Slack, including a custom notification to any linked member, so a broken setup can be
 * narrowed down without reading server logs.
 */
const SlackTestView: React.FC = () => (
  <SlackTestAccessGate>
    <SlackTestContent />
  </SlackTestAccessGate>
);

const SlackTestContent: React.FC = () => {
  const slack = useSlackIntegration();
  const diagnostics = useSlackDiagnostics();
  const notification = useSlackUserNotification(diagnostics.has_working_bot, diagnostics.diagnostics?.ran_at ?? null);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-shell-border bg-shell-panel">
            <SlackLogo size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-shell-text">Slack diagnostics</h1>
            <p className="text-sm text-shell-text-secondary">
              Verify the Slack app credentials, the workspace connection and real message delivery.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/administration?section=integrations" className="text-xs font-semibold text-brand-200 hover:underline">
            Back to Integrations
          </Link>
          <Link
            href="/admin/test/slack/notifications"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
          >
            <SendIcon size={13} />
            Notification test suite
          </Link>
        </div>
      </div>

      <SlackMessageBanner error={slack.error} notice={slack.notice} onDismiss={slack.dismissMessages} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <SlackChecklistCard
          diagnostics={diagnostics.diagnostics}
          is_running={diagnostics.is_running}
          run_error={diagnostics.run_error}
          onRun={() => void diagnostics.runDiagnostics()}
        />
        <SlackAppSetupCard app={diagnostics.diagnostics?.app ?? null} />
      </div>

      <SlackLiveTestsCard slack={slack} diagnostics={diagnostics} />

      <SlackUserNotificationCard notification={notification} has_working_bot={diagnostics.has_working_bot} />
    </div>
  );
};

export default SlackTestView;
