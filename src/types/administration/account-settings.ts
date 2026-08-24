/**
 * API types for the Administration singleton `AccountSetting` row, mirroring the Laravel
 * `AccountSettingResource` payload. Powers the Profile, Account, Branding (metadata only,
 * see `administration/branding.ts` for the upload payloads), Authentication, and Advanced
 * sections.
 */

export type AccountSettingsDto = {
  account_name: string;
  account_url: string;
  weekend_start: "fri_sat" | "sat_sun";
  show_weekends: boolean;
  home_page: "default" | "dashboard";
  logo_url: string | null;
  email_header_url: string | null;
  two_factor_enforced: boolean;
  google_sso_enabled: boolean;
  saml_sso_enabled: boolean;
  scim_enabled: boolean;
  /** Only populated for the requesting user's own role tier (admin/super_admin); null otherwise. */
  scim_token: string | null;
  scim_token_configured: boolean;
  guest_approval_enabled: boolean;
  approved_domains: string[];
  ip_restriction_enabled: boolean;
  ip_ranges: string[];
  default_product: string | null;
  session_inactivity_minutes: number | null;
  session_max_duration_minutes: number | null;
  panic_mode_active: boolean;
  panic_mode_activated_at: string | null;
  updated_at: string;
};

export type UpdateProfileSettingsPayload = Partial<Pick<AccountSettingsDto, "account_name" | "account_url">>;

export type UpdateAccountPreferencesPayload = Partial<
  Pick<AccountSettingsDto, "weekend_start" | "show_weekends" | "home_page">
>;

export type UpdateAuthenticationSettingsPayload = Partial<
  Pick<
    AccountSettingsDto,
    | "two_factor_enforced"
    | "google_sso_enabled"
    | "saml_sso_enabled"
    | "scim_enabled"
    | "guest_approval_enabled"
    | "approved_domains"
    | "ip_restriction_enabled"
    | "ip_ranges"
    | "default_product"
  >
>;

export type UpdateAdvancedSettingsPayload = Partial<
  Pick<AccountSettingsDto, "session_inactivity_minutes" | "session_max_duration_minutes">
>;
