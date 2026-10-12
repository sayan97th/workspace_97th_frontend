"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import { AdminPageActionsContext } from "@/components/administration/AdminPageActions";
import SlackLogo from "@/components/slack/SlackLogo";
import { useAuth } from "@/context/AuthContext";
import { SLACK_SETUP_PATH } from "@/lib/slackSetup";
import { SLACK_TEST_PAGES, SLACK_TEST_ROLES, findSlackTestPage } from "./slackTestNav";
import "@/components/administration/administration.css";

/**
 * Frame of the Slack testing area (`/admin/test/slack/*`), the same look as Administration: a top
 * bar with the way back to Slack settings, a rail with the testing pages, and the page inside a
 * white card with its title, subtitle and header actions. Pages put their buttons in the header
 * through `AdminPageActions`.
 *
 * Only `super_admin` and `admin` get in, the same `role:` gate the API puts on every endpoint
 * these pages call, so nobody else ever sees a page that would only answer 403.
 */
const SlackTestShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { isLoading: is_auth_loading, hasAnyRole } = useAuth();
  const [page_actions_el, setPageActionsEl] = useState<HTMLDivElement | null>(null);
  const active_page = findSlackTestPage(pathname);

  if (is_auth_loading) return <BoardLoadingSpinner />;

  if (!hasAnyRole(...SLACK_TEST_ROLES)) {
    return <CenteredMessage title="You don't have access to this page" detail="Only account owners and administrators can test the Slack integration." />;
  }

  return (
    <div className="admin-shell administration-theme">
      <header className="admin-topbar">
        <Link href={SLACK_SETUP_PATH} className="admin-back-button">
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          Back to Slack settings
        </Link>
        <h1 className="admin-topbar-title flex items-center gap-2">
          <SlackLogo size={18} />
          <span>
            <strong>Slack</strong> testing
          </span>
        </h1>
      </header>

      <div className="admin-body">
        <nav aria-label="Slack testing" className="admin-rail scrollnice">
          {SLACK_TEST_PAGES.map((page) => {
            const Icon = page.icon;
            return (
              <Link key={page.path} href={page.path} aria-current={page.path === active_page.path ? "page" : undefined} className="admin-rail-row">
                <span className="admin-rail-icon">
                  <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="admin-rail-label">{page.label}</span>
              </Link>
            );
          })}
        </nav>

        <section className="admin-card" aria-labelledby="slack-test-page-title">
          <div className="admin-page-header">
            <div className="min-w-0">
              <h2 id="slack-test-page-title" className="admin-page-title">
                {active_page.title}
              </h2>
              <p className="admin-page-subtitle">{active_page.description}</p>
            </div>
            <div ref={setPageActionsEl} className="admin-page-actions" />
          </div>
          <AdminPageActionsContext.Provider value={page_actions_el}>
            <div key={active_page.path} className="admin-page-content shell-scrollbar">
              {children}
            </div>
          </AdminPageActionsContext.Provider>
        </section>
      </div>
    </div>
  );
};

export default SlackTestShell;
