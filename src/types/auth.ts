export interface Role {
  id: number;
  name: string;
  display_name: string;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  timezone: string | null;
  profile_photo_url: string | null;
  email_verified_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  roles: Role[] | string[];

  // ─── My Profile preferences ──────────────────────────────────────────────
  working_status: string | null;
  working_status_dates: string | null;
  disable_notifications_while_away: boolean;
  hide_online_status: boolean;
  notification_preferences: Record<string, boolean>;
  desktop_notifications_enabled: boolean;
  language: string;
  time_format: "12" | "24";
  date_format: "long" | "euro";
  first_day_of_week: "sunday" | "monday";
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

/** Returned by POST /api/auth/login when the user has 2FA enabled. */
export interface LoginChallengeResponse {
  requires_two_factor: true;
  two_factor_token: string;
}

/**
 * Union of possible login responses:
 * - Full AuthResponse when 2FA is not enabled.
 * - LoginChallengeResponse when 2FA is enabled and an OTP is still required.
 */
export type LoginResponse = AuthResponse | LoginChallengeResponse;

/** Payload sent to POST /api/auth/two-factor-challenge. */
export interface TwoFactorChallengeData {
  two_factor_token: string;
  code?: string;
  recovery_code?: string;
}

export interface MeResponse {
  user: User;
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordData {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
  status_code?: number;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

/** Editable profile fields sent to PUT /api/profile. */
export interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  timezone: string | null;
}

/** Shape returned by GET /api/profile (unwrapped from the `data` envelope). */
export interface ProfileResponse extends ProfileData {
  id: number;
  full_name: string;
  profile_photo_url: string | null;
  email_verified_at: string | null;
  created_at: string;

  working_status: string | null;
  working_status_dates: string | null;
  disable_notifications_while_away: boolean;
  hide_online_status: boolean;
  notification_preferences: Record<string, boolean>;
  desktop_notifications_enabled: boolean;
  language: string;
  time_format: "12" | "24";
  date_format: "long" | "euro";
  first_day_of_week: "sunday" | "monday";
}

/** Partial update payload for PATCH /api/profile. */
export type PartialProfileData = Partial<ProfileData>;

/** Response for PUT/PATCH /api/profile. */
export interface UpdateProfileResponse {
  message: string;
  user: ProfileResponse;
}

/** Response for POST/DELETE /api/profile/photo. */
export interface ProfilePhotoResponse {
  message: string;
  profile_photo_url: string | null;
}

export interface ChangePasswordData {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface ChangePasswordResponse {
  message: string;
}

// ─── Two-factor authentication ──────────────────────────────────────────────

/** GET /api/auth/two-factor */
export interface TwoFactorStatusResponse {
  enabled: boolean;
  confirmed_at: string | null;
}

/** POST /api/auth/two-factor — starts enrollment, returns the QR payload. */
export interface TwoFactorSetupResponse {
  secret: string;
  /** Inline SVG markup for the QR code (rendered directly). */
  svg: string;
  url: string;
}

export interface TwoFactorConfirmData {
  code: string;
}

/** POST /api/auth/two-factor/confirm */
export interface TwoFactorConfirmResponse {
  message: string;
  recovery_codes: string[];
}

/** DELETE /api/auth/two-factor — requires the account password. */
export interface TwoFactorDisableData {
  password: string;
}

export interface TwoFactorMessageResponse {
  message: string;
}

export interface TwoFactorRecoveryCodesResponse {
  recovery_codes: string[];
}
