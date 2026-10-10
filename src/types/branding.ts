import type { AnnouncementTone, SocialLinks } from "./organization";

/** The announcement banner every signed in user sees, null while it is turned off. */
export type BrandingAnnouncement = {
  message: string;
  tone: AnnouncementTone;
  link_label: string | null;
  link_url: string | null;
  is_dismissible: boolean;
  /** Changes whenever an admin edits the banner, so a dismissed banner shows again once it changes. */
  published_at: string | null;
};

/** Fields both branding endpoints share. */
type BrandingIdentityDto = {
  company_name: string;
  company_tagline: string | null;
  company_website: string | null;
  logo_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  brand_color: string | null;
};

/** API type for `GET /api/branding`, readable by any authenticated user. */
export type PublicBrandingDto = BrandingIdentityDto & {
  email_header_url: string | null;
  show_name_in_top_bar: boolean;
  support_email: string | null;
  support_url: string | null;
  social_links: SocialLinks;
  announcement: BrandingAnnouncement | null;
};

/** API type for the unauthenticated `GET /api/public/branding`, shown on the sign in page. */
export type SignInBrandingDto = BrandingIdentityDto & {
  login_headline: string | null;
  login_message: string | null;
};
