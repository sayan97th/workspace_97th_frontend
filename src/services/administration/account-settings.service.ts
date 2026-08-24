import { apiClient } from "@/lib/api-client";
import type {
  AccountSettingsDto,
  UpdateAccountPreferencesPayload,
  UpdateAdvancedSettingsPayload,
  UpdateAuthenticationSettingsPayload,
  UpdateProfileSettingsPayload,
} from "@/types/administration/account-settings";

/**
 * Talks to the Laravel `/api/admin/account-settings` singleton resource. Every call goes
 * through the shared {@link apiClient}, so it inherits the bearer-token auth + 401 refresh
 * handling.
 */
export const accountSettingsService = {
  /** GET /api/admin/account-settings */
  async getAccountSettings(): Promise<AccountSettingsDto> {
    return apiClient.get<AccountSettingsDto>("/api/admin/account-settings");
  },

  /** PATCH /api/admin/account-settings/profile */
  async updateProfile(payload: UpdateProfileSettingsPayload): Promise<AccountSettingsDto> {
    const response = await apiClient.patch<{ account_settings: AccountSettingsDto }>(
      "/api/admin/account-settings/profile",
      payload
    );
    return response.account_settings;
  },

  /** PATCH /api/admin/account-settings/preferences */
  async updatePreferences(payload: UpdateAccountPreferencesPayload): Promise<AccountSettingsDto> {
    const response = await apiClient.patch<{ account_settings: AccountSettingsDto }>(
      "/api/admin/account-settings/preferences",
      payload
    );
    return response.account_settings;
  },

  /** POST /api/admin/account-settings/logo */
  async uploadLogo(file: File): Promise<AccountSettingsDto> {
    const form_data = new FormData();
    form_data.append("file", file);
    const response = await apiClient.postFormData<{ account_settings: AccountSettingsDto }>(
      "/api/admin/account-settings/logo",
      form_data
    );
    return response.account_settings;
  },

  /** DELETE /api/admin/account-settings/logo */
  async removeLogo(): Promise<AccountSettingsDto> {
    const response = await apiClient.delete<{ account_settings: AccountSettingsDto }>(
      "/api/admin/account-settings/logo"
    );
    return response.account_settings;
  },

  /** POST /api/admin/account-settings/email-header */
  async uploadEmailHeader(file: File): Promise<AccountSettingsDto> {
    const form_data = new FormData();
    form_data.append("file", file);
    const response = await apiClient.postFormData<{ account_settings: AccountSettingsDto }>(
      "/api/admin/account-settings/email-header",
      form_data
    );
    return response.account_settings;
  },

  /** DELETE /api/admin/account-settings/email-header */
  async removeEmailHeader(): Promise<AccountSettingsDto> {
    const response = await apiClient.delete<{ account_settings: AccountSettingsDto }>(
      "/api/admin/account-settings/email-header"
    );
    return response.account_settings;
  },

  /** PATCH /api/admin/account-settings/authentication */
  async updateAuthenticationSettings(payload: UpdateAuthenticationSettingsPayload): Promise<AccountSettingsDto> {
    const response = await apiClient.patch<{ account_settings: AccountSettingsDto }>(
      "/api/admin/account-settings/authentication",
      payload
    );
    return response.account_settings;
  },

  /** POST /api/admin/account-settings/scim-token/rotate */
  async rotateScimToken(): Promise<AccountSettingsDto> {
    const response = await apiClient.post<{ account_settings: AccountSettingsDto }>(
      "/api/admin/account-settings/scim-token/rotate",
      {}
    );
    return response.account_settings;
  },

  /** PATCH /api/admin/account-settings/advanced */
  async updateAdvancedSettings(payload: UpdateAdvancedSettingsPayload): Promise<AccountSettingsDto> {
    const response = await apiClient.patch<{ account_settings: AccountSettingsDto }>(
      "/api/admin/account-settings/advanced",
      payload
    );
    return response.account_settings;
  },

  /** POST /api/admin/account-settings/panic-mode */
  async activatePanicMode(current_password: string): Promise<AccountSettingsDto> {
    const response = await apiClient.post<{ account_settings: AccountSettingsDto }>(
      "/api/admin/account-settings/panic-mode",
      { current_password, confirmation_phrase: "PANIC" }
    );
    return response.account_settings;
  },

  /** DELETE /api/admin/account-settings/panic-mode */
  async deactivatePanicMode(): Promise<AccountSettingsDto> {
    const response = await apiClient.delete<{ account_settings: AccountSettingsDto }>(
      "/api/admin/account-settings/panic-mode"
    );
    return response.account_settings;
  },
};
