"use client";
import React from "react";
import type { IntegrationOverviewApi } from "@/hooks/useIntegrationOverview";
import type { IntegrationAppCategory, IntegrationAppKey } from "@/types/integration-overview";
import IntegrationAppLogo from "./IntegrationAppLogo";
import { INTEGRATION_APPS, INTEGRATION_CATEGORY_LABELS, INTEGRATION_STATUS_LABELS, type IntegrationAppMeta } from "./centerNav";
import "./automation-center.scss";

export type IntegrationsOverviewProps = {
  overview: IntegrationOverviewApi;
  /** Lower case search text from the center's search box. */
  search: string;
  /** Board automations need a Table view. Without one the cards lead to the connection setup instead of the templates. */
  has_automations: boolean;
  onOpenApp: (app: IntegrationAppKey) => void;
  onOpenConnections: () => void;
};

const CATEGORY_ORDER: IntegrationAppCategory[] = ["communication", "email", "calendar"];

function IntegrationCard({ app, overview, has_automations, onOpen }: { app: IntegrationAppMeta; overview: IntegrationOverviewApi; has_automations: boolean; onOpen: () => void }) {
  const entry = overview.appFor(app.key);
  const accounts = entry?.accounts ?? [];

  let call_to_action = has_automations ? `${app.template_count} ${app.template_count === 1 ? "template" : "templates"}` : "Set up";
  if (entry?.status === "needs_setup") call_to_action = overview.can_manage ? "Set up" : "Ask an admin";

  return (
    <button type="button" onClick={onOpen} className="integration-card" aria-label={`${app.label}, ${entry ? INTEGRATION_STATUS_LABELS[entry.status] : "status loading"}`}>
      <div className="integration-card__top">
        <span className="integration-card__logo" style={{ "--integration-brand": app.brand_color } as React.CSSProperties}>
          <IntegrationAppLogo app={app.key} size={24} />
        </span>
        {entry && <span className={`integration-status-pill integration-status-pill--${entry.status}`}>{INTEGRATION_STATUS_LABELS[entry.status]}</span>}
      </div>
      <div>
        <div className="integration-card__name">{app.label}</div>
        <p className="integration-card__description">{app.description}</p>
      </div>
      <div className="integration-card__footer">
        <span className="integration-card__accounts">
          {accounts.length === 0 ? (app.key === "email" ? "Built in" : "No account connected") : accounts.length === 1 ? accounts[0].label : `${accounts.length} accounts connected`}
        </span>
        <span className="integration-card__cta" aria-hidden="true">{call_to_action}</span>
      </div>
    </button>
  );
}

/**
 * Integrations > All integrations, monday.com's integration center: every outside app grouped by
 * what it does, each card with the signed in user's status and how many templates it has. A card
 * opens the app's templates, the callout leads to the connection setup.
 */
export default function IntegrationsOverview({ overview, search, has_automations, onOpenApp, onOpenConnections }: IntegrationsOverviewProps) {
  const apps = INTEGRATION_APPS.filter((app) => `${app.label} ${app.description} ${INTEGRATION_CATEGORY_LABELS[app.category]}`.toLowerCase().includes(search));
  const connected_count = overview.apps.filter((app) => app.status === "connected" || app.status === "ready").length;

  return (
    <div>
      <div className="integration-overview__intro">
        <div>
          <h2 className="font-heading text-page-title text-boardtree-text">Integrations</h2>
          <p className="mt-1 max-w-[560px] text-[13.5px] text-boardtree-text-secondary">
            Connect the tools your team already uses. Integration automations send what happens on this board to email, Slack and your calendar, or turn incoming emails into items.
          </p>
        </div>
        {!overview.is_loading && overview.apps.length > 0 && (
          <div className="integration-overview__summary">
            <div className="integration-overview__stat">
              <strong>{connected_count}/{overview.apps.length}</strong>
              <span>Apps ready</span>
            </div>
            <div className="integration-overview__stat">
              <strong>{overview.apps.reduce((total, app) => total + app.accounts_count, 0)}</strong>
              <span>Your accounts</span>
            </div>
          </div>
        )}
      </div>

      {!has_automations && (
        <div role="status" className="mb-5 rounded-[8px] border border-boardtree-border-soft bg-boardtree-panel-alt px-4 py-3 text-[13px] text-boardtree-text-secondary">
          Integration automations run on Table views. Switch to a Table view to use the templates, you can still connect your accounts here.
        </div>
      )}

      {CATEGORY_ORDER.map((category) => {
        const in_category = apps.filter((app) => app.category === category);
        if (in_category.length === 0) return null;
        return (
          <section key={category} aria-label={INTEGRATION_CATEGORY_LABELS[category]} className="integration-overview__section">
            <h3 className="mb-3 font-outfit text-section-title text-boardtree-text-secondary">{INTEGRATION_CATEGORY_LABELS[category]}</h3>
            <div className="integration-overview__grid">
              {in_category.map((app) => (
                <IntegrationCard key={app.key} app={app} overview={overview} has_automations={has_automations} onOpen={() => (has_automations ? onOpenApp(app.key) : onOpenConnections())} />
              ))}
            </div>
          </section>
        );
      })}

      {apps.length === 0 && <div className="py-10 text-center text-[13.5px] text-boardtree-text-muted">No integrations match your search.</div>}

      <div className="integration-callout">
        <div>
          <strong>Connections</strong>
          Set up the Slack workspace, link your own Slack account and manage the Gmail, Outlook and Google Calendar accounts your automations use.
        </div>
        <button type="button" onClick={onOpenConnections} className="h-8 flex-none rounded-[6px] border border-boardtree-border px-3.5 text-[13px] text-boardtree-text hover:bg-boardtree-hover">
          Open Connections
        </button>
      </div>
    </div>
  );
}
