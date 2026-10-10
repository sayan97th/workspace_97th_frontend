"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { brandingService } from "@/services/branding.service";
import { applyBrandColor, applyFavicon } from "@/lib/brand-theme";
import type { PublicBrandingDto } from "@/types/branding";

/** What the app shell shows before the branding request answers, or when it fails. */
export const DEFAULT_BRANDING: PublicBrandingDto = {
  company_name: "97th Floor",
  company_tagline: null,
  company_website: null,
  logo_url: null,
  logo_dark_url: null,
  favicon_url: null,
  brand_color: null,
  email_header_url: null,
  show_name_in_top_bar: false,
  support_email: null,
  support_url: null,
  social_links: { linkedin: null, x: null, facebook: null, instagram: null, youtube: null },
  announcement: null,
};

type BrandingContextValue = {
  branding: PublicBrandingDto;
  is_loaded: boolean;
  /** Re-reads `/api/branding`, e.g. right after an admin saves the Organization page. */
  refreshBranding: () => Promise<void>;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

/**
 * Loads the organization branding once for the signed in app shell and applies the parts that
 * live outside React: the brand color scale on `<html>` and the favicon link. Mounted in
 * `(admin)/layout.tsx`, so the top bar, the announcement banner and the Help menu all read the
 * same copy and repaint together when Administration > Organization saves.
 */
export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<PublicBrandingDto>(DEFAULT_BRANDING);
  const [is_loaded, setIsLoaded] = useState(false);

  const refreshBranding = useCallback(async () => {
    try {
      setBranding(await brandingService.getBranding());
    } catch {
      // Branding is cosmetic, keep whatever is showing (the default 97th mark on first load).
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refreshBranding();
  }, [refreshBranding]);

  useEffect(() => {
    if (!is_loaded) return;
    applyBrandColor(branding.brand_color);
  }, [branding.brand_color, is_loaded]);

  useEffect(() => {
    if (!is_loaded) return;
    applyFavicon(branding.favicon_url);
  }, [branding.favicon_url, is_loaded]);

  const value = useMemo(() => ({ branding, is_loaded, refreshBranding }), [branding, is_loaded, refreshBranding]);

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};

const noopRefresh = async () => {};

/** The organization branding, or the defaults outside a {@link BrandingProvider}. */
export const useBranding = (): BrandingContextValue =>
  useContext(BrandingContext) ?? { branding: DEFAULT_BRANDING, is_loaded: false, refreshBranding: noopRefresh };
