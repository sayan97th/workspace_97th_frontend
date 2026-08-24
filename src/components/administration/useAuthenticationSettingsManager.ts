"use client";
import { useEffect, useRef, useState } from "react";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { accountSettingsService } from "@/services/administration/account-settings.service";
import type { AccountSettingsDto } from "@/types/administration/account-settings";

const TEXT_DEBOUNCE_MS = 600;

export const DEFAULT_PRODUCT_OPTIONS = ["Work Management", "CRM", "Dev", "Service"];

const splitList = (value: string): string[] =>
  value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

export type AuthenticationSettingsManagerApi = {
  is_loading: boolean;
  error: string | null;

  two_factor_enforced: boolean;
  toggleTwoFactor: () => void;
  google_sso_enabled: boolean;
  toggleGoogleSso: () => void;
  saml_sso_enabled: boolean;
  toggleSamlSso: () => void;

  scim_enabled: boolean;
  toggleScim: () => void;
  scim_token: string | null;
  is_rotating_scim_token: boolean;
  rotateScimToken: () => Promise<void>;

  guest_approval_enabled: boolean;
  toggleGuestApproval: () => void;
  approved_domains: string;
  setApprovedDomains: (value: string) => void;

  ip_restriction_enabled: boolean;
  toggleIpRestriction: () => void;
  ip_ranges: string;
  setIpRanges: (value: string) => void;

  default_product: string;
  setDefaultProduct: (value: string) => void;
};

/**
 * Owns the Authentication section's account-wide policy toggles, all persisted against the
 * `AccountSetting` singleton. Toggles save immediately (optimistic-then-persist, same as
 * {@link useProfileManager}'s toggles); the domains/IP-ranges text fields debounce. SAML and
 * SCIM are configuration storage only, there is no live SAML assertion consumer or SCIM
 * server behind them, per the approved scope for this feature.
 */
export function useAuthenticationSettingsManager(): AuthenticationSettingsManagerApi {
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [two_factor_enforced, setTwoFactorEnforcedValue] = useState(false);
  const [google_sso_enabled, setGoogleSsoEnabledValue] = useState(false);
  const [saml_sso_enabled, setSamlSsoEnabledValue] = useState(false);
  const [scim_enabled, setScimEnabledValue] = useState(false);
  const [scim_token, setScimToken] = useState<string | null>(null);
  const [is_rotating_scim_token, setIsRotatingScimToken] = useState(false);
  const [guest_approval_enabled, setGuestApprovalEnabledValue] = useState(false);
  const [approved_domains, setApprovedDomainsValue] = useState("");
  const [ip_restriction_enabled, setIpRestrictionEnabledValue] = useState(false);
  const [ip_ranges, setIpRangesValue] = useState("");
  const [default_product, setDefaultProductValue] = useState(DEFAULT_PRODUCT_OPTIONS[0]);

  const domains_timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ip_ranges_timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hydrate = (dto: AccountSettingsDto) => {
    setTwoFactorEnforcedValue(dto.two_factor_enforced);
    setGoogleSsoEnabledValue(dto.google_sso_enabled);
    setSamlSsoEnabledValue(dto.saml_sso_enabled);
    setScimEnabledValue(dto.scim_enabled);
    setScimToken(dto.scim_token);
    setGuestApprovalEnabledValue(dto.guest_approval_enabled);
    setApprovedDomainsValue(dto.approved_domains.join(", "));
    setIpRestrictionEnabledValue(dto.ip_restriction_enabled);
    setIpRangesValue(dto.ip_ranges.join("\n"));
    setDefaultProductValue(dto.default_product ?? DEFAULT_PRODUCT_OPTIONS[0]);
  };

  useEffect(() => {
    let cancelled = false;
    accountSettingsService
      .getAccountSettings()
      .then((dto) => {
        if (!cancelled) hydrate(dto);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, "Failed to load authentication settings."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (domains_timeout_ref.current) clearTimeout(domains_timeout_ref.current);
      if (ip_ranges_timeout_ref.current) clearTimeout(ip_ranges_timeout_ref.current);
    };
  }, []);

  const save = async (payload: Parameters<typeof accountSettingsService.updateAuthenticationSettings>[0]) => {
    try {
      const dto = await accountSettingsService.updateAuthenticationSettings(payload);
      hydrate(dto);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to save authentication settings."));
    }
  };

  const toggleTwoFactor = () => {
    const next = !two_factor_enforced;
    setTwoFactorEnforcedValue(next);
    void save({ two_factor_enforced: next });
  };

  const toggleGoogleSso = () => {
    const next = !google_sso_enabled;
    setGoogleSsoEnabledValue(next);
    void save({ google_sso_enabled: next });
  };

  const toggleSamlSso = () => {
    const next = !saml_sso_enabled;
    setSamlSsoEnabledValue(next);
    void save({ saml_sso_enabled: next });
  };

  const toggleScim = () => {
    const next = !scim_enabled;
    setScimEnabledValue(next);
    void save({ scim_enabled: next });
  };

  const rotateScimToken = async () => {
    setIsRotatingScimToken(true);
    try {
      const dto = await accountSettingsService.rotateScimToken();
      hydrate(dto);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to rotate the SCIM token."));
    } finally {
      setIsRotatingScimToken(false);
    }
  };

  const toggleGuestApproval = () => {
    const next = !guest_approval_enabled;
    setGuestApprovalEnabledValue(next);
    void save({ guest_approval_enabled: next });
  };

  const setApprovedDomains = (value: string) => {
    setApprovedDomainsValue(value);
    if (domains_timeout_ref.current) clearTimeout(domains_timeout_ref.current);
    domains_timeout_ref.current = setTimeout(() => {
      void save({ approved_domains: splitList(value) });
    }, TEXT_DEBOUNCE_MS);
  };

  const toggleIpRestriction = () => {
    const next = !ip_restriction_enabled;
    setIpRestrictionEnabledValue(next);
    void save({ ip_restriction_enabled: next });
  };

  const setIpRanges = (value: string) => {
    setIpRangesValue(value);
    if (ip_ranges_timeout_ref.current) clearTimeout(ip_ranges_timeout_ref.current);
    ip_ranges_timeout_ref.current = setTimeout(() => {
      void save({ ip_ranges: splitList(value) });
    }, TEXT_DEBOUNCE_MS);
  };

  const setDefaultProduct = (value: string) => {
    setDefaultProductValue(value);
    void save({ default_product: value });
  };

  return {
    is_loading,
    error,

    two_factor_enforced,
    toggleTwoFactor,
    google_sso_enabled,
    toggleGoogleSso,
    saml_sso_enabled,
    toggleSamlSso,

    scim_enabled,
    toggleScim,
    scim_token,
    is_rotating_scim_token,
    rotateScimToken,

    guest_approval_enabled,
    toggleGuestApproval,
    approved_domains,
    setApprovedDomains,

    ip_restriction_enabled,
    toggleIpRestriction,
    ip_ranges,
    setIpRanges,

    default_product,
    setDefaultProduct,
  };
}
