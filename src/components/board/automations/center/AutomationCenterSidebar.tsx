"use client";
import React, { useState } from "react";
import { LayoutGrid, PlugZap, X } from "lucide-react";
import { SearchIcon } from "@/icons/workspace-icons";
import type { IntegrationOverviewApi } from "@/hooks/useIntegrationOverview";
import type { BoardAutomationSource } from "@/types/board-automation";
import type { GalleryCategory } from "../builder/automationTemplates";
import IntegrationAppLogo from "./IntegrationAppLogo";
import type { IntegrationAppCategory } from "@/types/integration-overview";
import {
  AUTOMATION_CATEGORIES,
  INTEGRATION_APPS,
  INTEGRATION_CATEGORY_LABELS,
  INTEGRATION_STATUS_LABELS,
  INTEGRATION_TEMPLATE_COUNT,
  type CenterPage,
  type IntegrationAppMeta,
  type IntegrationEventKey,
  type IntegrationEventMeta,
  type IntegrationPage,
} from "./centerNav";

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

type NavRowProps = { icon?: React.ReactNode; label: string; trailing?: React.ReactNode; is_current: boolean; onClick: () => void; class_name?: string };

function NavRow({ icon, label, trailing, is_current, onClick, class_name = "" }: NavRowProps) {
  return (
    <button type="button" onClick={onClick} aria-current={is_current ? "page" : undefined} className={`automation-center__nav-row ${class_name}`}>
      {icon && <span className="automation-center__nav-icon" aria-hidden="true">{icon}</span>}
      <span className="automation-center__nav-label">{label}</span>
      {trailing}
    </button>
  );
}

type AppNavProps = {
  app: IntegrationAppMeta;
  overview: IntegrationOverviewApi;
  is_current: boolean;
  onOpen: () => void;
};

/** One app of the Integrations sidebar with its template count and the signed in user's connection status. */
function AppNav({ app, overview, is_current, onOpen }: AppNavProps) {
  const status = overview.appFor(app.key)?.status ?? null;
  return (
    <NavRow
      icon={<IntegrationAppLogo app={app.key} size={16} />}
      label={app.label}
      trailing={
        <>
          <span className="automation-center__nav-count">{app.template_count}</span>
          {status && <span className={`integration-status-dot integration-status-dot--${status}`} role="img" aria-label={INTEGRATION_STATUS_LABELS[status]} />}
        </>
      }
      is_current={is_current}
      onClick={onOpen}
    />
  );
}

type EventMatch = { app: IntegrationAppMeta; event: IntegrationEventMeta };

/** Every app event whose label, app name or template titles contain the search text. */
const matchingEvents = (search: string): EventMatch[] =>
  INTEGRATION_APPS.flatMap((app) => app.events.filter((event) => `${app.label.toLowerCase()} ${event.search_text}`.includes(search)).map((event) => ({ app, event })));

/**
 * The left side of the Create tab. The Automations dialog lists the template categories of events
 * that happen inside the app. The Integrations dialog lists every outside app grouped by integration
 * type (Communication, Email, Calendar), each with its template count and a dot for the signed in
 * user's connection status, plus the overview and the connection setup. Its search box finds the
 * events and functions of every app (Status changes in Slack, a weekly email...) and opens the app
 * on the templates of that event.
 */
export default function AutomationCenterSidebar({ variant, page, onNavigate, overview, has_automations, saved_count, account_count }: AutomationCenterSidebarProps) {
  const isCategory = (id: GalleryCategory) => page.section === "automations" && page.category === id;
  const isIntegration = (id: IntegrationPage) => page.section === "integrations" && page.page === id;
  const goToIntegration = (id: IntegrationPage, event: IntegrationEventKey | null = null) => onNavigate({ section: "integrations", page: id, event });
  const [event_search, setEventSearch] = useState("");
  const search_text = event_search.trim().toLowerCase();
  const matches = search_text ? matchingEvents(search_text) : [];
  const current_event = page.section === "integrations" ? page.event ?? null : null;

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

          {has_automations && (
            <label className="automation-center__sidebar-search">
              <span className="automation-center__sidebar-search-icon" aria-hidden="true"><SearchIcon size={13} /></span>
              <input
                type="search"
                value={event_search}
                onChange={(event) => setEventSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && event_search) {
                    event.stopPropagation();
                    setEventSearch("");
                  }
                }}
                placeholder="Search events or functions"
                aria-label="Search integration events or functions"
              />
              {event_search && (
                <button type="button" onClick={() => setEventSearch("")} aria-label="Clear search" className="automation-center__sidebar-search-clear">
                  <X size={13} aria-hidden="true" />
                </button>
              )}
            </label>
          )}

          {has_automations && search_text && (
            <div role="group" aria-labelledby="automation-center-results-heading" className="automation-center__group">
              <div id="automation-center-results-heading" className="automation-center__group-heading">
                {matches.length} {matches.length === 1 ? "result" : "results"}
              </div>
              {matches.map(({ app, event }) => (
                <NavRow
                  key={`${app.key}:${event.key}`}
                  icon={<IntegrationAppLogo app={app.key} size={16} />}
                  label={event.label}
                  trailing={
                    <>
                      <span className="automation-center__nav-app">{app.label}</span>
                      <span className="automation-center__nav-count">{event.count}</span>
                    </>
                  }
                  is_current={isIntegration(app.key) && current_event === event.key}
                  onClick={() => goToIntegration(app.key, event.key)}
                />
              ))}
              {matches.length === 0 && <p className="automation-center__sidebar-empty">No events or functions match your search.</p>}
            </div>
          )}

          {has_automations &&
            !search_text &&
            INTEGRATION_CATEGORY_ORDER.map((category) => (
              <div key={category} role="group" aria-labelledby={`automation-center-${category}-heading`} className="automation-center__group">
                <div id={`automation-center-${category}-heading`} className="automation-center__group-heading">{INTEGRATION_CATEGORY_LABELS[category]}</div>
                {INTEGRATION_APPS.filter((app) => app.category === category).map((app) => (
                  <AppNav key={app.key} app={app} overview={overview} is_current={isIntegration(app.key)} onOpen={() => goToIntegration(app.key)} />
                ))}
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
