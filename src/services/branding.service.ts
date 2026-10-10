import { apiClient } from "@/lib/api-client";
import type { PublicBrandingDto, SignInBrandingDto } from "@/types/branding";

/** Talks to the Laravel read only branding endpoints. */
export const brandingService = {
  /** GET /api/branding, any authenticated user. */
  async getBranding(): Promise<PublicBrandingDto> {
    return apiClient.get<PublicBrandingDto>("/api/branding");
  },

  /** GET /api/public/branding, no account needed (the sign in page). */
  async getSignInBranding(): Promise<SignInBrandingDto> {
    return apiClient.get<SignInBrandingDto>("/api/public/branding");
  },
};
