/** Who a Home banner belongs to: the signed in person, or everyone in the organization. */
export type HomeBannerScope = "personal" | "organization";

/** Greeting color over the image. `auto` picks one from the image brightness. */
export type HomeBannerTextTone = "auto" | "light" | "dark";

/** How the image sits inside the banner, saved apart from the file so it can change any time. */
export type HomeBannerFraming = {
  /** Focal point, 0 (left/top) to 100 (right/bottom). */
  focal_x: number;
  focal_y: number;
  /** 1 fills the banner, up to 3 zooms in around the focal point. */
  zoom: number;
  text_tone: HomeBannerTextTone;
  /** Shade over the image behind the greeting, 0 to 80 percent. */
  overlay_opacity: number;
};

/** `HomeBannerResource` from the Laravel API. */
export type HomeBannerDto = HomeBannerFraming & {
  id: number;
  scope: HomeBannerScope;
  image_url: string;
  image_small_url: string;
  width: number;
  height: number;
  stored_size: number;
  original_name: string | null;
  original_size: number;
  /** Tiny blurred WebP data URI painted while the image downloads. */
  placeholder: string | null;
  dominant_color: string | null;
  /** Average brightness (0 to 1) of the area behind the greeting. */
  luminance: number;
  updated_by?: { id: number; full_name: string } | null;
  updated_at: string | null;
};

/** `GET /api/home-banner` and every write's response. */
export type HomeBannerState = {
  personal: HomeBannerDto | null;
  organization: HomeBannerDto | null;
  can_manage_organization: boolean;
};

export type HomeBannerResponse = HomeBannerState & { message?: string };
