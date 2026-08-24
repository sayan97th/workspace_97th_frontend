"use client";
import { useEffect, useState } from "react";
import { brandingService } from "@/services/branding.service";

export type AccountBranding = {
  logo_url: string | null;
  email_header_url: string | null;
};

/**
 * Read-only account branding (logo, email header) for any authenticated user, backing
 * {@link AppTopBar}'s logo badge. The full read/write surface (upload, remove) lives in
 * `src/components/administration/useBrandingManager.ts`, gated to the Administration page.
 */
export function useAccountBranding(): AccountBranding {
  const [logo_url, setLogoUrl] = useState<string | null>(null);
  const [email_header_url, setEmailHeaderUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    brandingService
      .getBranding()
      .then((dto) => {
        if (cancelled) return;
        setLogoUrl(dto.logo_url);
        setEmailHeaderUrl(dto.email_header_url);
      })
      .catch(() => {
        // Branding is purely cosmetic — fall back to the default "97" mark on failure.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { logo_url, email_header_url };
}
