import React from "react";
import type { IntegrationAppKey, IntegrationAppOverviewDto } from "@/types/integration-overview";
import IntegrationAppLogo from "./IntegrationAppLogo";
import { INTEGRATION_STATUS_LABELS, integrationAppMeta, integrationEventLabel, type IntegrationEventKey } from "./centerNav";
import "./automation-center.scss";

export type IntegrationAppBannerProps = {
  app: IntegrationAppKey;
  tagline: string;
  hint: string;
  /** The signed in user's status with the app, hidden while it loads. */
  overview?: IntegrationAppOverviewDto | null;
};

/** The colored banner on top of an integration app page, monday.com's integration page header. */
export default function IntegrationAppBanner({ app, tagline, hint, overview = null }: IntegrationAppBannerProps) {
  const meta = integrationAppMeta(app);
  const accounts = overview?.accounts ?? [];

  return (
    <section aria-label={`About the ${meta.label} integration`} className="integration-app-banner" style={{ "--integration-brand": meta.brand_color } as React.CSSProperties}>
      <div className="integration-app-banner__logo">
        <IntegrationAppLogo app={app} size={54} />
      </div>
      <div className="min-w-0">
        <h2 className="integration-app-banner__name">{meta.label}</h2>
        <p className="integration-app-banner__tagline">{tagline}</p>
        <p className="integration-app-banner__hint">{hint}</p>
        {overview && (
          <span className="integration-app-banner__status">
            {INTEGRATION_STATUS_LABELS[overview.status]}
            {accounts.length > 0 && `, ${accounts.length === 1 ? accounts[0].label : `${accounts.length} accounts`}`}
          </span>
        )}
      </div>
    </section>
  );
}

/** Says an app page only lists one event's templates, picked in the sidebar, with a way back to all of them. */
export function IntegrationEventFilter({ event, count, onClear }: { event: IntegrationEventKey | null; count: number; onClear: () => void }) {
  if (!event) return null;
  return (
    <div role="status" className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-boardtree-text-secondary">
      <span>
        Showing {count} {count === 1 ? "template" : "templates"} for <strong className="font-semibold text-boardtree-text">{integrationEventLabel(event)}</strong>
      </span>
      <button type="button" onClick={onClear} className="font-medium text-boardtree-accent hover:underline">
        Show all
      </button>
    </div>
  );
}

/** "All integrations", the back link of every app page. */
export function BackToIntegrations({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} className="mb-4 flex items-center gap-1.5 text-[13.5px] text-boardtree-text-secondary hover:text-boardtree-text">
      <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M7.5 2.5 L4 6 L7.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      All integrations
    </button>
  );
}
