import { apiClient } from "@/lib/api-client";
import type {
  TwoFactorStatusResponse,
  TwoFactorSetupResponse,
  TwoFactorConfirmData,
  TwoFactorConfirmResponse,
  TwoFactorDisableData,
  TwoFactorMessageResponse,
  TwoFactorRecoveryCodesResponse,
} from "@/types/auth";

export const twoFactorService = {
  /** GET /api/auth/two-factor — current 2FA status for the user. */
  async getStatus(): Promise<TwoFactorStatusResponse> {
    return apiClient.get<TwoFactorStatusResponse>("/api/auth/two-factor");
  },

  /** POST /api/auth/two-factor — begin enrollment, returns QR + secret. */
  async initSetup(): Promise<TwoFactorSetupResponse> {
    return apiClient.post<TwoFactorSetupResponse>("/api/auth/two-factor", {});
  },

  /** POST /api/auth/two-factor/confirm — confirm the OTP and get recovery codes. */
  async confirm(data: TwoFactorConfirmData): Promise<TwoFactorConfirmResponse> {
    return apiClient.post<TwoFactorConfirmResponse>("/api/auth/two-factor/confirm", data);
  },

  /** DELETE /api/auth/two-factor — disable 2FA (requires the account password). */
  async disable(data: TwoFactorDisableData): Promise<TwoFactorMessageResponse> {
    return apiClient.delete<TwoFactorMessageResponse>("/api/auth/two-factor", data);
  },

  /** GET /api/auth/two-factor/recovery-codes — list current recovery codes. */
  async getRecoveryCodes(): Promise<TwoFactorRecoveryCodesResponse> {
    return apiClient.get<TwoFactorRecoveryCodesResponse>("/api/auth/two-factor/recovery-codes");
  },

  /** POST /api/auth/two-factor/recovery-codes — regenerate recovery codes. */
  async regenerateRecoveryCodes(
    data: TwoFactorDisableData
  ): Promise<TwoFactorRecoveryCodesResponse> {
    return apiClient.post<TwoFactorRecoveryCodesResponse>(
      "/api/auth/two-factor/recovery-codes",
      data
    );
  },
};
