import { apiClient, setToken, removeToken } from "@/lib/api-client";
import type {
  AuthResponse,
  LoginResponse,
  TwoFactorChallengeData,
  ForgotPasswordData,
  ForgotPasswordResponse,
  LoginCredentials,
  MeResponse,
  RegisterData,
  ResetPasswordData,
  ResetPasswordResponse,
} from "@/types/auth";

function persistSession(data: AuthResponse): void {
  setToken(data.access_token);
  const expires_at = Date.now() + data.expires_in * 1000;
  localStorage.setItem("token_expires_at", expires_at.toString());
}

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
