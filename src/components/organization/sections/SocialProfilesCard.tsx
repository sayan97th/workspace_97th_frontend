"use client";
import React from "react";
import { Share2 } from "lucide-react";
import type { SocialNetwork } from "@/types/organization";
import type { OrganizationSettingsApi } from "../useOrganizationSettings";
import { Field, OrganizationCard, input_class } from "../organization-fields";
import { SOCIAL_NETWORKS } from "../organization-form";
import type { OrganizationSectionProps } from "./section-props";

/** Simple monochrome marks, lucide no longer ships brand logos. */
const SOCIAL_GLYPHS: Record<SocialNetwork, React.ReactNode> = {
  linkedin: (
    <path d="M4.5 6.5v6M4.5 3.6v.1M7.5 12.5V9.3c0-1.6 1-2.6 2.3-2.6s2.2 1 2.2 2.6v3.2M7.5 6.5v6" strokeLinecap="round" />
  ),
  x: <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />,
  facebook: <path d="M9.5 14V8.5h2l.3-2.2H9.5V5c0-.6.2-1.1 1.1-1.1h1.3V2a14 14 0 0 0-1.8-.1C8.3 1.9 7.3 3 7.3 4.8v1.5H5.5v2.2h1.8V14" strokeLinejoin="round" />,
  instagram: (
    <>
      <rect x="2.5" y="2.5" width="11" height="11" rx="3.2" />
      <circle cx="8" cy="8" r="2.6" />
      <path d="M11.4 4.6v.1" strokeLinecap="round" />
    </>
  ),
  youtube: (
    <>
      <rect x="1.8" y="3.6" width="12.4" height="8.8" rx="2.4" />
      <path d="M6.8 6.2v3.6L9.9 8z" fill="currentColor" stroke="none" />
    </>
  ),
};

export const SocialGlyph: React.FC<{ network: SocialNetwork; className?: string }> = ({ network, className }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} className={className} aria-hidden="true">
    {SOCIAL_GLYPHS[network]}
  </svg>
);

type SocialProfilesCardProps = OrganizationSectionProps & {
  setSocialLink: OrganizationSettingsApi["setSocialLink"];
};

/** The company's public social profiles. */
const SocialProfilesCard: React.FC<SocialProfilesCardProps> = ({ draft, field_errors, setSocialLink }) => (
  <OrganizationCard
    id="social"
    icon={Share2}
    title="Social profiles"
    description="Links to your company's public profiles, kept with the rest of the company details."
  >
    <div className="grid gap-5 sm:grid-cols-2">
      {SOCIAL_NETWORKS.map((network) => (
        <Field key={network.id} label={network.label} is_optional error={field_errors[`social_links.${network.id}`]}>
          {(input_props) => (
            <div className="relative">
              <SocialGlyph
                network={network.id}
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-shell-text-faint"
              />
              <input
                {...input_props}
                type="url"
                value={draft.social_links[network.id]}
                onChange={(event) => setSocialLink(network.id, event.target.value)}
                className={`${input_class} pl-9`}
                placeholder={network.placeholder}
              />
            </div>
          )}
        </Field>
      ))}
    </div>
  </OrganizationCard>
);

export default SocialProfilesCard;
