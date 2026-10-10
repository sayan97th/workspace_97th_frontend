"use client";
import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import { useAuth } from "@/context/AuthContext";
import { ChevronRightIcon } from "@/icons/workspace-icons";
import SlackLogo from "@/components/slack/SlackLogo";
import SlackMessageBanner from "@/components/slack/SlackMessageBanner";
import SlackSetupSteps from "@/components/administration/slack/SlackSetupSteps";
import SlackAppCredentialsCard from "@/components/administration/slack/SlackAppCredentialsCard";
import SlackWorkspacesCard from "@/components/administration/slack/SlackWorkspacesCard";
import SlackMembersCard from "@/components/administration/slack/SlackMembersCard";
import { SECONDARY_BUTTON } from "@/components/administration/slack/slackAdminStyles";
import { useSlackIntegration } from "@/hooks/useSlackIntegration";
import { useSlackAdministration } from "@/hooks/useSlackAdministration";
import { SLACK_SETUP_REASON_PARAM, SLACK_SETUP_ROLES, slackNeedsSetup } from "@/lib/slackSetup";

const INTEGRATIONS_HREF = "/administration?section=integrations";

/**
 * Administration > Integrations > Slack, mounted at `/administration/integrations/slack`.
 *
 * The one place the Slack integration is set up, kept apart from "Connect my Slack" on purpose:
 * an administrator or the account owner saves the Slack app once and connects a workspace here,
 * after which every member only links their own account from My Profile. "Connect my Slack"
 * sends administrators here while the setup is unfinished (`?reason=connect`).
 *
 * Gated to `super_admin` and `admin`, the same `role:` gate the API puts on every endpoint this page calls.
 */
const SlackSettingsView: React.FC = () => {
  const { isLoading: is_auth_loading, hasAnyRole } = useAuth();
  const search_params = useSearchParams();
  const can_open = hasAnyRole(...SLACK_SETUP_ROLES);

  const slack = useSlackIntegration();
  const status = slack.status;
  const admin = useSlackAdministration(slack, can_open && (status?.can_manage ?? false), can_open && (status?.can_configure_app ?? false));

  if (is_auth_loading) {
    return <BoardLoadingSpinner />;
  }

  if (!can_open) {
    return (
      <CenteredMessage
        title="You don't have access to this page"
        detail="Only account administrators and the account owner can change the Slack settings. You can still connect your own Slack account from My Profile."
      />
    );
  }

  const workspace = status?.workspace ?? null;
  const needs_setup = slackNeedsSetup(status);
  const came_from_connect = search_params.get(SLACK_SETUP_REASON_PARAM) === "connect";

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden bg-shell-bg text-shell-text">
      <div className="flex flex-none items-center gap-3 border-b border-shell-border px-6 py-3.5">
        <Link href={INTEGRATIONS_HREF} className="flex items-center gap-1.5 text-[13px] font-semibold text-shell-text-muted transition-colors hover:text-shell-text">
          <ChevronRightIcon className="rotate-180" size={11} />
          Back
        </Link>
        <span className="h-4 w-px bg-shell-border" aria-hidden="true" />
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-[13px] font-medium text-shell-text-muted">
            <li>
              <Link href="/administration" className="hover:text-shell-text">
                Administration
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={INTEGRATIONS_HREF} className="hover:text-shell-text">
                Integrations
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-shell-text">
              Slack
            </li>
          </ol>
        </nav>
      </div>

      <div className="shell-scrollbar min-w-0 flex-1 overflow-y-auto px-11 pb-11 pt-9">
        <div className="mx-auto w-full max-w-[860px]">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-12 w-12 flex-none items-center justify-center rounded-[12px] border border-shell-border bg-shell-panel">
              <SlackLogo size={26} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-page-title">Slack</h1>
                {!slack.is_loading ? (
                  needs_setup ? (
                    <span className="rounded-md bg-[#fdab3d]/[0.14] px-2 py-0.5 text-[11.5px] font-bold text-[#fdab3d]">Setup required</span>
                  ) : (
                    <span className="rounded-md bg-[#00c875]/[0.14] px-2 py-0.5 text-[11.5px] font-bold text-[#3ddc97]">Connected</span>
                  )
                ) : null}
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-shell-text-muted">
                Set up Slack once for the whole account. After that, members only use &quot;Connect my Slack&quot; in My Profile to get their
                notifications as Slack messages.
              </p>
            </div>
            {workspace?.team_url ? (
              <a href={workspace.team_url} target="_blank" rel="noopener noreferrer" className={`${SECONDARY_BUTTON} flex-none`}>
                Open Slack
              </a>
            ) : null}
          </div>

          {came_from_connect && needs_setup && !slack.is_loading ? (
            <div className="mt-5 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.08] px-3.5 py-3 text-[12.5px] leading-relaxed text-shell-text-secondary">
              <span className="font-bold">Finish the Slack setup first.</span> &quot;Connect my Slack&quot; works once the Slack app is saved and a workspace is
              connected. Complete the steps below, then connect your own account from My Profile.
            </div>
          ) : null}

          <div className="mt-5">
            <SlackMessageBanner error={slack.error} notice={slack.notice} onDismiss={slack.dismissMessages} />
          </div>

          {slack.is_loading ? (
            <div className="mt-6 text-[13px] text-shell-text-faint">Loading Slack settings…</div>
          ) : (
            <>
              <div className="mt-6">
                <SlackSetupSteps status={status} />
              </div>

              {status?.can_configure_app ? <SlackAppCredentialsCard admin={admin} /> : null}

              <SlackWorkspacesCard slack={slack} admin={admin} />

              {workspace ? <SlackMembersCard workspace={workspace} admin={admin} /> : null}

              {!needs_setup ? (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-shell-border bg-shell-panel-alt p-5">
                  <div className="min-w-0">
                    <div className="text-[14px] font-bold text-shell-text">Slack is ready</div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-shell-text-muted">
                      Members can now use &quot;Connect my Slack&quot; in My Profile. Run the diagnostics to confirm messages are delivered.
                    </p>
                  </div>
                  <div className="flex flex-none flex-wrap gap-2">
                    <Link href="/profile?section=notifications" className={SECONDARY_BUTTON}>
                      Connect my Slack
                    </Link>
                    <Link href="/admin/test/slack" className={SECONDARY_BUTTON}>
                      Test the Slack connection
                    </Link>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SlackSettingsView;
