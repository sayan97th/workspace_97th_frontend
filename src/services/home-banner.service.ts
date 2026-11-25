import { apiClient, type UploadProgress } from "@/lib/api-client";
import type { HomeBannerFraming, HomeBannerResponse, HomeBannerScope, HomeBannerState } from "@/types/home-banner";

/** Personal banners live under the profile, the organization banner under Administration. */
const scopeEndpoint = (scope: HomeBannerScope): string =>
  scope === "organization" ? "/api/admin/organization/home-banner" : "/api/profile/home-banner";

/** Talks to the Laravel Home banner endpoints, see `HomeBannerController`. */
export const homeBannerService = {
  /** GET /api/home-banner, both banners and whether the caller may change the organization one. */
  async getBanners(): Promise<HomeBannerState> {
    return apiClient.get<HomeBannerState>("/api/home-banner");
  },

  /** POST a new image with its first framing, reporting upload progress. */
  async uploadBanner(
    scope: HomeBannerScope,
    file: File,
    framing: HomeBannerFraming,
    source: { name: string; size: number },
    onProgress?: (progress: UploadProgress) => void
  ): Promise<HomeBannerResponse> {
    const form_data = new FormData();
    form_data.append("file", file);
    // The file as picked, before the browser optimized it, for "5.2 MB optimized to 400 KB".
    form_data.append("source_name", source.name);
    form_data.append("source_size", String(source.size));
    form_data.append("focal_x", String(framing.focal_x));
    form_data.append("focal_y", String(framing.focal_y));
    form_data.append("zoom", String(framing.zoom));
    form_data.append("text_tone", framing.text_tone);
    form_data.append("overlay_opacity", String(framing.overlay_opacity));
    return apiClient.postFormDataWithProgress<HomeBannerResponse>(scopeEndpoint(scope), form_data, onProgress);
  },

  /** PATCH the framing of the image already uploaded. */
  async updateFraming(scope: HomeBannerScope, framing: Partial<HomeBannerFraming>): Promise<HomeBannerResponse> {
    return apiClient.patch<HomeBannerResponse>(scopeEndpoint(scope), framing);
  },

  /** DELETE the banner, Home falls back to the next one in line. */
  async removeBanner(scope: HomeBannerScope): Promise<HomeBannerResponse> {
    return apiClient.delete<HomeBannerResponse>(scopeEndpoint(scope));
  },
};
