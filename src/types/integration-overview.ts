import type { ExternalService } from "./external-account";

/** Every app of the board's Integrations dialog, mirrors `IntegrationOverview` in the API. */
export type IntegrationAppKey = "email" | "slack" | ExternalService;

export type IntegrationAppCategory = "communication" | "email" | "calendar";

/**
 * `ready`: nothing to connect. `connected`: the signed in user has an account. `available`: the app
 * is set up and they can connect one. `needs_setup`: an administrator must set the app up first.
 */
export type IntegrationAppStatus = "ready" | "connected" | "available" | "needs_setup";

export type IntegrationAppOverviewDto = {
  key: IntegrationAppKey;
  label: string;
  category: IntegrationAppCategory;
  status: IntegrationAppStatus;
  is_configured: boolean;
  can_connect: boolean;
  accounts_count: number;
  accounts: { id: number; label: string }[];
};

export type IntegrationOverviewResponse = {
  /** Administrators and the account owner may set the apps up in Administration. */
  can_manage: boolean;
  data: IntegrationAppOverviewDto[];
};
