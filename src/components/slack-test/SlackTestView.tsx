"use client";

import React from "react";
import Link from "next/link";
import SlackLogo from "@/components/slack/SlackLogo";
import SlackMessageBanner from "@/components/slack/SlackMessageBanner";
import { useAuth } from "@/context/AuthContext";
import { useSlackDiagnostics } from "@/hooks/useSlackDiagnostics";
import { useSlackIntegration } from "@/hooks/useSlackIntegration";
import { useSlackUserNotification } from "@/hooks/useSlackUserNotification";
import SlackAppSetupCard from "./SlackAppSetupCard";
import SlackChecklistCard from "./SlackChecklistCard";
import SlackLiveTestsCard from "./SlackLiveTestsCard";
import SlackUserNotificationCard from "./SlackUserNotificationCard";

/** Matches the `role:super_admin,admin` gate on the diagnostics endpoints. */
const SLACK_TEST_ROLES = ["super_admin", "admin"];

/**
 * Admin diagnostic screen at /admin/test/slack. Checks every piece the Slack integration depends
 * on (credentials, redirect URL, signing secret, workspace, bot token, scopes, channels and
 * the admin's own link) and runs real messages through Slack, including a custom notification to any linked member, so a broken setup can be
 * narrowed down without reading server logs.
 */
const SlackTestView: React.FC = () => {
  const { isLoading: is_auth_loading, hasAnyRole } = useAuth();

  if (is_auth_loading) return null;

  if (!hasAnyRole(...SLACK_TEST_ROLES)) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-lg font-semibold text-shell-text">You don&apos;t have access to this page</h1>
        <p className="mt-1 text-sm text-shell-text-secondary">Only account administrators can test the Slack integration.</p>
      </div>
    );
  }

  return <SlackTestContent />;
};

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
        <Link href="/administration?section=integrations" className="text-xs font-semibold text-brand-200 hover:underline">
          Back to Integrations
        </Link>
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
