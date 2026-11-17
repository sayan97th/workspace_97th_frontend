/**
 * An outside app a member connects their own account to, mirrors the enabled cases of the API's
 * `ExternalService` enum. Outlook is switched off in the API until the client asks for it.
 */
export type ExternalService = "gmail" | "google_calendar";

/** Who the member signs in with. Microsoft only shows up on accounts connected before Outlook was switched off. */
export type ExternalProvider = "google" | "microsoft";

/**
 * One of the signed in user's own Google or Microsoft accounts, from `GET /api/integrations/accounts`.
 * `services` lists what it was granted, a Google account connected for Gmail only shows `gmail`.
 */
export type ExternalAccountDto = {
  id: number;
  provider: ExternalProvider;
  email: string | null;
  name: string | null;
  services: ExternalService[];
  /** Set when the provider stopped accepting the account, it has to be connected again. */
  last_error: string | null;
  connected_at: string | null;
  automations_count: number;
};

export type ExternalAccountsResponse = {
  data: ExternalAccountDto[];
  /** Whether the provider's app is ready, saved by an administrator or the "Sign in with Google" app. */
  is_configured: boolean;
  can_connect: boolean;
};

/** A Google calendar the account may add events to. */
export type GoogleCalendarDto = { id: string; name: string; is_primary: boolean };

export type ExternalAuthorizationDisplay = "tab" | "page";

/** What `/integrations/accounts/complete` broadcasts to the tab that started the connection. */
export type ExternalAuthorizationMessage = {
  type: "external_account_authorization_complete";
  result: "connected" | "error";
  service: ExternalService | null;
  reason: string | null;
  account_id: number | null;
  email: string | null;
};

/** The Google or Microsoft OAuth app, from `GET /api/integrations/apps` (administrators). */
export type IntegrationAppDto = {
  provider: ExternalProvider;
  label: string;
  services: { id: ExternalService; label: string }[];
  is_configured: boolean;
  /** `saved` by an administrator, `sign_in` when the "Sign in with Google" app is used, null when there is none. */
  source: "saved" | "sign_in" | null;
  /** Whether removing the saved app falls back to the "Sign in with Google" app. */
  can_use_sign_in_app: boolean;
  client_id: string | null;
  client_secret_hint: string | null;
  tenant_id: string | null;
  redirect_uri: string;
  redirect_uri_override: string | null;
  default_redirect_uri: string;
  scopes: string[];
  console_url: string;
  updated_at: string | null;
  updated_by: string | null;
};

export type IntegrationAppPayload = {
  client_id: string;
  client_secret?: string | null;
  tenant_id?: string | null;
  redirect_uri?: string | null;
};
