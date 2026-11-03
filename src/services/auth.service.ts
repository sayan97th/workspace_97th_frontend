import { apiClient, persistSession, removeToken } from "@/lib/api-client";
import { getValidRedirectUrl } from "@/utils/redirect";
import type {
  AuthResponse,
  LoginResponse,
  TwoFactorChallengeData,
  ForgotPasswordData,
  ForgotPasswordResponse,
  GoogleExchangeResponse,
  GoogleRedirectOptions,
  LoginCredentials,
  MeResponse,
  RegisterData,
  ResetPasswordData,
  ResetPasswordResponse,
} from "@/types/auth";

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const data = await apiClient.post<LoginResponse>("/api/auth/login", credentials);
    // Only persist the session when 2FA is not required.
    if (!("requires_two_factor" in data && data.requires_two_factor)) {
      persistSession(data as AuthResponse);
    }
    return data;
  },

  async loginWithTwoFactor(data: TwoFactorChallengeData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/api/auth/two-factor-challenge", data);
    persistSession(response);
    return response;
  },

  /**
   * Full browser URL that starts the Google sign in. Google only ever talks to the
   * API, which sends the browser back to `/auth/google/callback` with a one time code.
   */
  getGoogleRedirectUrl({ remember = false, callback_url = null }: GoogleRedirectOptions = {}): string {
    const api_url = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
    const query = new URLSearchParams();

    if (remember) query.set("remember", "1");

    // Only a safe relative path is forwarded, the API rejects anything else.
    if (callback_url) query.set("callback_url", getValidRedirectUrl(callback_url));

    const query_string = query.toString();
    return `${api_url}/api/auth/google/redirect${query_string ? `?${query_string}` : ""}`;
  },

  /** Trades the one time Google `login_code` for a session, or a two factor challenge. */
  async exchangeGoogleLoginCode(login_code: string): Promise<GoogleExchangeResponse> {
    const data = await apiClient.post<GoogleExchangeResponse>("/api/auth/google/exchange", { login_code });
    if (!("requires_two_factor" in data && data.requires_two_factor)) {
      persistSession(data as AuthResponse);
    }
    return data;
  },

  async register(registerData: RegisterData): Promise<AuthResponse> {
    const data = await apiClient.post<AuthResponse>("/api/auth/register", registerData);
    persistSession(data);
    return data;
  },

  async getMe(): Promise<MeResponse> {
    return apiClient.get<MeResponse>("/api/auth/me");
  },

  async refresh(): Promise<AuthResponse> {
    const data = await apiClient.post<AuthResponse>("/api/auth/refresh");
    persistSession(data);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/api/auth/logout");
    } finally {
      removeToken();
    }
  },

  async forgotPassword(data: ForgotPasswordData): Promise<ForgotPasswordResponse> {
    return apiClient.post<ForgotPasswordResponse>("/api/auth/forgot-password", data);
  },

  async resetPassword(data: ResetPasswordData): Promise<ResetPasswordResponse> {
    return apiClient.post<ResetPasswordResponse>("/api/auth/reset-password", data);
  },
};
