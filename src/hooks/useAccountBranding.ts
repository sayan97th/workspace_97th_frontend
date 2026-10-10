"use client";
import { useBranding } from "@/context/BrandingContext";

export type AccountBranding = {
  logo_url: string | null;
  email_header_url: string | null;
};

/**
 * Read only account logo and email header for any authenticated user, kept for the automation
 * cards that show the account logo. Reads the shared {@link useBranding} copy, so it no longer
 * fires its own request per card. The full Organization surface lives at `/admin/organization`.
 */
export function useAccountBranding(): AccountBranding {
  const { branding } = useBranding();
  return { logo_url: branding.logo_url, email_header_url: branding.email_header_url };
}
