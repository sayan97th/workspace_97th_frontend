import { apiClient } from "@/lib/api-client";
import type { PublicBrandingDto } from "@/types/branding";

/** Talks to the Laravel `/api/branding` read-only endpoint (any authenticated user). */
export const brandingService = {
  /** GET /api/branding */
  async getBranding(): Promise<PublicBrandingDto> {
    return apiClient.get<PublicBrandingDto>("/api/branding");
  },
};
