import { apiClient } from "@/lib/api-client";
import type {
  ExternalAccountsResponse,
  ExternalAuthorizationDisplay,
  ExternalProvider,
  ExternalService,
  GoogleCalendarDto,
  IntegrationAppDto,
  IntegrationAppPayload,
} from "@/types/external-account";

/**
 * Talks to the API's Gmail, Outlook and Google Calendar endpoints. Connecting works like Slack:
 * ask the API for the consent URL, open it in a new tab, and the API's public callback finishes
 * on `/integrations/accounts/complete`, which reports back to this tab.
 */
export const externalAccountService = {
  /** GET /api/integrations/accounts. Only the accounts that can be used for `service`. */
  async getAccounts(service: ExternalService): Promise<ExternalAccountsResponse> {
    return apiClient.get<ExternalAccountsResponse>(`/api/integrations/accounts?service=${service}`);
  },

  /** POST /api/integrations/accounts/url. The provider's consent page for the service. */
  async requestConnectUrl(service: ExternalService, return_path?: string, display: ExternalAuthorizationDisplay = "tab"): Promise<string> {
    const response = await apiClient.post<{ url: string }>("/api/integrations/accounts/url", { service, return_path, display });
    return response.url;
  },

  /** GET /api/integrations/accounts/{id}/calendars. `refresh` skips the API's short lived cache. */
  async getCalendars(account_id: number, refresh = false): Promise<GoogleCalendarDto[]> {
    const response = await apiClient.get<{ data: GoogleCalendarDto[] }>(`/api/integrations/accounts/${account_id}/calendars${refresh ? "?refresh=1" : ""}`);
    return response.data;
  },

  /** DELETE /api/integrations/accounts/{id} */
  async deleteAccount(account_id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/integrations/accounts/${account_id}`);
  },

  /** GET /api/integrations/apps, administrators only. */
  async getApps(): Promise<IntegrationAppDto[]> {
    const response = await apiClient.get<{ data: IntegrationAppDto[] }>("/api/integrations/apps");
    return response.data;
  },

  /** PUT /api/integrations/apps/{provider}. A blank secret keeps the saved one. */
  async saveApp(provider: ExternalProvider, payload: IntegrationAppPayload): Promise<IntegrationAppDto & { message: string }> {
    return apiClient.put<IntegrationAppDto & { message: string }>(`/api/integrations/apps/${provider}`, payload);
  },

  /** DELETE /api/integrations/apps/{provider} */
  async removeApp(provider: ExternalProvider): Promise<IntegrationAppDto & { message: string }> {
    return apiClient.delete<IntegrationAppDto & { message: string }>(`/api/integrations/apps/${provider}`);
  },
};
