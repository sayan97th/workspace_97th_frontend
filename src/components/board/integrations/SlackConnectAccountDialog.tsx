"use client";
import React, { useEffect, useId, useRef } from "react";
import Link from "next/link";
import SlackLogo from "@/components/slack/SlackLogo";
import type { SlackIntegrationApi } from "@/hooks/useSlackIntegration";
import { CheckIcon, CloseIcon } from "@/icons/workspace-icons";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "./integrationUi";

export type SlackConnectAccountDialogProps = {
  slack: SlackIntegrationApi;
  onClose: () => void;
  /** Where Slack sends the browser back to when the browser blocked the new tab. */
  return_path: string;
};

/** What the member does in the Slack tab, in order. The approval step depends on which Slack page opens. */
const signInSteps = (workspace_name: string, workspace_domain: string | null, is_authorize: boolean): string[] => [
  `Sign in to ${workspace_name}${workspace_domain ? ` (${workspace_domain})` : ""} in the new tab Slack opens.`,
  is_authorize ? "Review the permissions and click Allow." : "Confirm that this is your Slack account.",
  "Come back here, this window updates on its own.",
];

function Spinner() {
  return <span className="h-4 w-4 flex-none animate-spin rounded-full border-2 border-boardtree-accent/30 border-t-boardtree-accent" aria-hidden="true" />;
}

/**
 * Integrate dialog > Connections > "Connect my Slack". Explains what happens before Slack opens in
 * a new tab, waits for the tab to report back (see `useSlackIntegration`), then confirms which
 * Slack account was connected. Errors from Slack are shown here, where the member is looking.
 */
export default function SlackConnectAccountDialog({ slack, onClose, return_path }: SlackConnectAccountDialogProps) {
  const title_id = useId();
  const primary_button_ref = useRef<HTMLButtonElement>(null);

  const status = slack.status;
  const workspace = status?.workspace ?? null;
  const link = status?.current_user_link ?? null;
  const is_awaiting = slack.awaiting_purpose === "link";
  const workspace_name = workspace?.team_name ?? "your Slack workspace";
  const workspace_domain = workspace?.team_url?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? null;
  const steps = signInSteps(workspace_name, workspace_domain, status?.link_method === "authorize");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus follows the screen, so Enter always runs the action the member is looking at.
  useEffect(() => {
    primary_button_ref.current?.focus();
  }, [is_awaiting, link]);

  let body: React.ReactNode;

  if (link) {
    body = (
      <>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#00c875]/[0.14] text-[#0a9a5c] dark:text-[#3ddc97]">
          <CheckIcon size={22} />
        </div>
        <h2 id={title_id} className="mt-4 text-center text-[18px] font-semibold text-boardtree-text">Your Slack account is connected</h2>
        <p className="mt-1.5 text-center text-[13px] leading-relaxed text-boardtree-text-muted">
          Connected as <span className="font-semibold text-boardtree-text">{link.slack_display_name ?? "your Slack account"}</span> in {workspace_name}. Mentions,
          assignments and automation messages now reach you as Slack direct messages.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" disabled={slack.is_working} onClick={() => void slack.sendTestMessage()} className={SECONDARY_BUTTON}>
            {slack.is_working ? "Sending..." : "Send a test message"}
          </button>
          <button ref={primary_button_ref} type="button" onClick={onClose} className={PRIMARY_BUTTON}>Done</button>
        </div>
        <div className="mt-3 text-center">
          <Link href="/profile?section=notifications" className="text-[12px] font-medium text-boardtree-accent hover:underline">Choose what reaches you in Slack</Link>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[12px] border border-boardtree-border-soft bg-boardtree-panel-alt">
          <SlackLogo size={26} />
        </div>
        <h2 id={title_id} className="mt-4 text-center text-[18px] font-semibold text-boardtree-text">Connect your Slack account</h2>
        <p className="mt-1.5 text-center text-[13px] leading-relaxed text-boardtree-text-muted">
          Link your own account in {workspace_name} to get a Slack direct message when someone tags you, assigns you or an automation notifies you.
        </p>

        <ol className="mt-5 flex flex-col gap-2.5 rounded-[10px] border border-boardtree-border-soft bg-boardtree-panel-alt p-4">
          {steps.map((step, index) => (
            <li key={step} className="flex items-start gap-3 text-[12.5px] leading-relaxed text-boardtree-text-secondary">
              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-boardtree-accent-surface text-[11px] font-semibold text-boardtree-accent">{index + 1}</span>
              <span className="pt-px">{step}</span>
            </li>
          ))}
        </ol>

        {slack.error && (
          <div role="alert" className="mt-4 rounded-[8px] border border-boardtree-danger/30 bg-boardtree-danger-hover px-3 py-2 text-[12.5px] leading-relaxed text-boardtree-danger">
            {slack.error}
          </div>
        )}

        {is_awaiting ? (
          <div className="mt-5 flex flex-col items-center gap-3">
            <div role="status" className="flex items-center gap-2 text-[13px] font-medium text-boardtree-text">
              <Spinner />
              Waiting for Slack. Finish in the new tab.
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button ref={primary_button_ref} type="button" disabled={slack.is_working} onClick={() => void slack.connectMyAccount(return_path)} className={SECONDARY_BUTTON}>
                Open Slack again
              </button>
              <button type="button" onClick={slack.cancelAwaitingSlack} className={SECONDARY_BUTTON}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>Not now</button>
            <button
              ref={primary_button_ref}
              type="button"
              disabled={slack.is_working}
              onClick={() => void slack.connectMyAccount(return_path)}
              className={`${PRIMARY_BUTTON} inline-flex items-center gap-2`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-[4px] bg-white"><SlackLogo size={13} /></span>
              {slack.is_working ? "Opening Slack..." : "Sign in with Slack"}
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center bg-[rgba(30,34,55,0.35)] p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title_id}
        onClick={(event) => event.stopPropagation()}
        className="relative w-[460px] max-w-full rounded-[14px] bg-boardtree-surface px-7 pb-6 pt-8 shadow-[0_24px_60px_rgba(30,34,55,0.30)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-[6px] text-boardtree-text-muted hover:bg-boardtree-hover"
        >
          <CloseIcon size={14} />
        </button>
        {body}
      </div>
    </div>
  );
}
