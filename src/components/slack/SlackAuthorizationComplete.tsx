"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SlackLogo from "@/components/slack/SlackLogo";
import { slackCallbackErrorMessage } from "@/hooks/useSlackIntegration";
import { announceSlackAuthorization } from "@/lib/slackAuthorizationTab";
import type { SlackAuthorizationMessage, SlackAuthorizationPurpose } from "@/types/slack";
import { SLACK_SETUP_PATH } from "@/lib/slackSetup";

/** Short pause so the person sees the result before the tab closes. */
const CLOSE_DELAY_MS = 1200;

const readPurpose = (value: string | null): SlackAuthorizationPurpose | null => (value === "install" || value === "link" || value === "connect" ? value : null);

const readNumber = (value: string | null): number | null => (value !== null && /^\d+$/.test(value) ? Number(value) : null);

/**
 * The last step of a Slack authorization opened in a new tab: tells the tab that started it how
 * it went, then closes itself. When the browser does not allow closing it (the tab was opened by
 * hand, or the flow ran in the original tab because a new tab was blocked) it stays open with
 * the result and a way back into the app.
 */
const SlackAuthorizationComplete: React.FC = () => {
  const search_params = useSearchParams();
  const [could_not_close, setCouldNotClose] = useState(false);

  const message = useMemo<SlackAuthorizationMessage>(() => {
    const matched = search_params.get("matched");

    return {
      type: "slack_authorization_complete",
      result: search_params.get("slack") === "connected" ? "connected" : "error",
      purpose: readPurpose(search_params.get("purpose")),
      reason: search_params.get("reason"),
      workspace: search_params.get("workspace"),
      matched: readNumber(matched),
      connection_id: readNumber(search_params.get("connection_id")),
    };
  }, [search_params]);

  useEffect(() => {
    announceSlackAuthorization(message);

    const timer = window.setTimeout(() => {
      window.close();
      // `window.close()` silently does nothing for a tab the script did not open.
      window.setTimeout(() => setCouldNotClose(true), 300);
    }, CLOSE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [message]);

  const is_connected = message.result === "connected";
  const back_href = message.purpose === "link" ? "/profile?section=notifications" : message.purpose === "connect" ? "/automations" : SLACK_SETUP_PATH;

  let title: string;
  let detail: string;

  if (!is_connected) {
    title = "Slack was not connected";
    detail = slackCallbackErrorMessage(message.reason);
  } else if (message.purpose === "connect") {
    title = message.workspace ? `Your ${message.workspace} Slack account is connected` : "Your Slack account is connected";
    detail = "Go back to the workspace tab to finish your Slack automation.";
  } else if (message.purpose === "link") {
    title = "Your Slack account is connected";
    detail = "You will receive your notifications as Slack direct messages.";
  } else {
    title = message.workspace ? `${message.workspace} is connected` : "Slack is connected";
    detail =
      message.matched === null
        ? "It is now the active Slack workspace."
        : `It is now the active Slack workspace. ${message.matched === 1 ? "1 member was" : `${message.matched} members were`} matched to their Slack account by email.`;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[420px] rounded-xl border border-shell-border bg-shell-panel-alt p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[12px] border border-shell-border bg-shell-panel">
          <SlackLogo size={26} />
        </div>
        <h1 className={`mt-4 text-[17px] font-bold ${is_connected ? "text-shell-text" : "text-brand-200"}`}>{title}</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-shell-text-muted">{detail}</p>

        {could_not_close ? (
          <div className="mt-5 flex flex-col items-center gap-2">
            <Link
              href={back_href}
              className="rounded-[9px] bg-brand-500 px-4 py-[10px] text-[13px] font-bold text-white transition-colors hover:bg-brand-600"
            >
              Back to the workspace
            </Link>
            <span className="text-[12px] text-shell-text-faint">If the workspace is open in another tab, it was already updated. You can close this tab.</span>
          </div>
        ) : (
          <p className="mt-5 text-[12px] text-shell-text-faint">This tab closes on its own.</p>
        )}
      </div>
    </main>
  );
};

export default SlackAuthorizationComplete;
