import React from "react";
import type { IntegrationAppKey, IntegrationAppOverviewDto } from "@/types/integration-overview";
import IntegrationAppLogo from "./IntegrationAppLogo";
import { INTEGRATION_STATUS_LABELS, integrationAppMeta } from "./centerNav";
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

/** "All integrations", the back link of every app page. */
export function BackToIntegrations({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" onClick={onBack} className="mb-4 flex items-center gap-1.5 text-[13.5px] text-boardtree-text-secondary hover:text-boardtree-text">
      <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M7.5 2.5 L4 6 L7.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      All integrations
    </button>
  );
}
