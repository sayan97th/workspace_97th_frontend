"use client";
import React from "react";
import { LayoutGrid, PlugZap } from "lucide-react";
import type { IntegrationOverviewApi } from "@/hooks/useIntegrationOverview";
import type { BoardAutomationSource } from "@/types/board-automation";
import type { GalleryCategory } from "../builder/automationTemplates";
import IntegrationAppLogo from "./IntegrationAppLogo";
import type { IntegrationAppCategory } from "@/types/integration-overview";
import { AUTOMATION_CATEGORIES, INTEGRATION_APPS, INTEGRATION_CATEGORY_LABELS, INTEGRATION_STATUS_LABELS, INTEGRATION_TEMPLATE_COUNT, type CenterPage, type IntegrationPage } from "./centerNav";

export type AutomationCenterSidebarProps = {
  /** The Automations dialog (`board`) lists template categories, the Integrations dialog (`integrations`) the apps. */
  variant: BoardAutomationSource;
  page: CenterPage;
  onNavigate: (page: CenterPage) => void;
  overview: IntegrationOverviewApi;
  /** Integration automations need a Table view, without one only the integrations overview and connections are listed. */
  has_automations: boolean;
  saved_count: number;
  account_count: number;
};

/** The integration types the Integrations sidebar groups its apps by, in order. */
const INTEGRATION_CATEGORY_ORDER: IntegrationAppCategory[] = ["communication", "email", "calendar"];

type NavRowProps = { icon: React.ReactNode; label: string; trailing?: React.ReactNode; is_current: boolean; onClick: () => void };

function NavRow({ icon, label, trailing, is_current, onClick }: NavRowProps) {
  return (
    <button type="button" onClick={onClick} aria-current={is_current ? "page" : undefined} className="automation-center__nav-row">
      <span className="automation-center__nav-icon" aria-hidden="true">{icon}</span>
      <span className="automation-center__nav-label">{label}</span>
      {trailing}
    </button>
  );
}

/**
 * The left side of the Create tab. The Automations dialog lists the template categories of events
 * that happen inside the app. The Integrations dialog lists every outside app grouped by integration
 * type (Communication, Email, Calendar), each with its template count and a dot for the signed in
 * user's connection status, plus the overview and the connection setup.
 */
export default function AutomationCenterSidebar({ variant, page, onNavigate, overview, has_automations, saved_count, account_count }: AutomationCenterSidebarProps) {
  const isCategory = (id: GalleryCategory) => page.section === "automations" && page.category === id;
  const isIntegration = (id: IntegrationPage) => page.section === "integrations" && page.page === id;
  const goToIntegration = (id: IntegrationPage) => onNavigate({ section: "integrations", page: id });

  const countFor = (id: GalleryCategory): number | null => (id === "saved" ? saved_count : id === "account" ? account_count : null);

  return (
    <nav aria-label={variant === "board" ? "Automation categories" : "Integration apps"} className="automation-center__sidebar">
      {variant === "board" && (
        <div role="group" aria-labelledby="automation-center-board-heading" className="automation-center__group">
          <div id="automation-center-board-heading" className="automation-center__group-heading">Categories</div>
          {AUTOMATION_CATEGORIES.map((entry) => {
            const count = countFor(entry.id);
            return (
              <NavRow
                key={entry.id}
                icon={entry.icon}
                label={entry.label}
                trailing={count ? <span className="automation-center__nav-count">{count}</span> : null}
                is_current={isCategory(entry.id)}
                onClick={() => onNavigate({ section: "automations", category: entry.id })}
              />
            );
          })}
        </div>
      )}

      {variant === "integrations" && (
        <>
          <div role="group" aria-labelledby="automation-center-integrations-heading" className="automation-center__group">
            <div id="automation-center-integrations-heading" className="automation-center__group-heading">Integrations</div>
            <NavRow
              icon={<LayoutGrid size={15} />}
              label="All integrations"
              trailing={has_automations ? <span className="automation-center__nav-count">{INTEGRATION_TEMPLATE_COUNT}</span> : null}
              is_current={isIntegration("overview")}
              onClick={() => goToIntegration("overview")}
            />
          </div>

          {has_automations &&
            INTEGRATION_CATEGORY_ORDER.map((category) => (
              <div key={category} role="group" aria-labelledby={`automation-center-${category}-heading`} className="automation-center__group">
                <div id={`automation-center-${category}-heading`} className="automation-center__group-heading">{INTEGRATION_CATEGORY_LABELS[category]}</div>
                {INTEGRATION_APPS.filter((app) => app.category === category).map((app) => {
                  const status = overview.appFor(app.key)?.status ?? null;
                  return (
                    <NavRow
                      key={app.key}
                      icon={<IntegrationAppLogo app={app.key} size={16} />}
                      label={app.label}
                      trailing={
                        <>
                          <span className="automation-center__nav-count">{app.template_count}</span>
                          {status && <span className={`integration-status-dot integration-status-dot--${status}`} role="img" aria-label={INTEGRATION_STATUS_LABELS[status]} />}
                        </>
                      }
                      is_current={isIntegration(app.key)}
                      onClick={() => goToIntegration(app.key)}
                    />
                  );
                })}
              </div>
            ))}

          <div role="group" aria-labelledby="automation-center-setup-heading" className="automation-center__group">
            <div id="automation-center-setup-heading" className="automation-center__group-heading">Setup</div>
            <NavRow icon={<PlugZap size={15} />} label="Connections" is_current={isIntegration("connections")} onClick={() => goToIntegration("connections")} />
          </div>
        </>
      )}
    </nav>
  );
}
