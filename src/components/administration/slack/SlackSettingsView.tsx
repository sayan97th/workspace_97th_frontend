"use client";
import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import AdminPageActions from "@/components/administration/AdminPageActions";
import SlackMessageBanner from "@/components/slack/SlackMessageBanner";
import SlackSetupSteps from "@/components/administration/slack/SlackSetupSteps";
import SlackAppCredentialsCard from "@/components/administration/slack/SlackAppCredentialsCard";
import SlackWorkspacesCard from "@/components/administration/slack/SlackWorkspacesCard";
import SlackMembersCard from "@/components/administration/slack/SlackMembersCard";
import { SECONDARY_BUTTON, SECTION_CARD, SECTION_HINT, SECTION_TITLE } from "@/components/administration/slack/slackAdminStyles";
import { useSlackIntegration } from "@/hooks/useSlackIntegration";
import { useSlackAdministration } from "@/hooks/useSlackAdministration";
import { SLACK_SETUP_REASON_PARAM, slackNeedsSetup } from "@/lib/slackSetup";

/**
 * Administration > Connections > Slack settings (`/administration?section=slack`).
 *
 * The one place the Slack integration is set up, kept apart from "Connect my Slack" on purpose:
 * the 97th Floor app comes from the API .env file, an administrator can add other Slack app
 * credentials and choose the one in use, and connects a workspace here,
 * after which every member only links their own account from My Profile. "Connect my Slack"
 * sends administrators here while the setup is unfinished (`&reason=connect`), and the Slack
 * OAuth callback returns here with `&slack=connected` when the flow could not use a new tab.
 *
 * Rendered inside the Administration view, which owns the page title and subtitle and only
 * opens this section for `super_admin` and `admin`, the same `role:` gate the API puts on every
 * endpoint it calls. The setup status and "Open Slack" sit in the page header next to the title.
 */
const SlackSettingsView: React.FC = () => {
  const search_params = useSearchParams();
  const slack = useSlackIntegration();
  const status = slack.status;
  const admin = useSlackAdministration(slack, status?.can_manage ?? false, status?.can_configure_app ?? false);

  const workspace = status?.workspace ?? null;
  const needs_setup = slackNeedsSetup(status);
  const came_from_connect = search_params.get(SLACK_SETUP_REASON_PARAM) === "connect";

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <AdminPageActions>
        {!slack.is_loading ? (
          needs_setup ? (
            <span className="admin-pill admin-pill-warning">Setup required</span>
          ) : (
            <span className="admin-pill admin-pill-success">Connected</span>
          )
        ) : null}
        {workspace?.team_url ? (
          <a href={workspace.team_url} target="_blank" rel="noopener noreferrer" className={`${SECONDARY_BUTTON} gap-1.5`}>
            Open Slack
            <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />
          </a>
        ) : null}
      </AdminPageActions>

      {came_from_connect && needs_setup && !slack.is_loading ? (
        <div className="admin-notice admin-notice-info">
          <span className="font-semibold">Finish the Slack setup first.</span> &quot;Connect my Slack&quot; works once a Slack app is set up and a
          workspace is connected. Complete the steps below, then connect your own account from My Profile.
        </div>
      ) : null}

      <SlackMessageBanner error={slack.error} notice={slack.notice} onDismiss={slack.dismissMessages} />

      {slack.is_loading ? (
        <div className="text-[14px] text-shell-text-faint">Loading Slack settings…</div>
      ) : (
        // Every card below the steps brings its own top margin (`SECTION_CARD`).
        <div>
          <SlackSetupSteps status={status} />

          {status?.can_configure_app ? <SlackAppCredentialsCard admin={admin} /> : null}

          <SlackWorkspacesCard slack={slack} admin={admin} />

          {workspace ? <SlackMembersCard workspace={workspace} admin={admin} /> : null}

          {!needs_setup ? (
            <section className={`${SECTION_CARD} flex flex-wrap items-center justify-between gap-3`}>
              <div className="min-w-0">
                <h3 className={SECTION_TITLE}>Slack is ready</h3>
                <p className={SECTION_HINT}>
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
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SlackSettingsView;
