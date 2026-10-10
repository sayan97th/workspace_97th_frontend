/**
 * API types for Administration > Organization (`/admin/organization`), mirroring the Laravel
 * `OrganizationResource` payload. The company display name is the account name and the main
 * logo is the same file the older Branding section managed.
 */

export type OrganizationAssetKey = "logo" | "logo_dark" | "favicon";

export type SocialNetwork = "linkedin" | "x" | "facebook" | "instagram" | "youtube";

export type SocialLinks = Record<SocialNetwork, string | null>;

export type AnnouncementTone = "info" | "success" | "warning" | "critical";

export type CompanySize = "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1001+";

export type OrganizationDto = {
  company_name: string;
  account_url: string;
  company_legal_name: string | null;
  company_tagline: string | null;
  company_description: string | null;
  company_industry: string | null;
  company_size: CompanySize | null;
  company_founded_year: number | null;
  company_website: string | null;
  support_email: string | null;
  support_url: string | null;
  contact_phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  address_city: string | null;
  address_state: string | null;
  address_postal_code: string | null;
  /** ISO 3166-1 alpha-2 code, e.g. "US". */
  address_country: string | null;
  social_links: SocialLinks;
  logo_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  /** Hex like "#e53e2e", null keeps the default 97th Floor red. */
  brand_color: string | null;
  show_name_in_top_bar: boolean;
  login_headline: string | null;
  login_message: string | null;
  announcement_enabled: boolean;
  announcement_message: string | null;
  announcement_tone: AnnouncementTone;
  announcement_link_label: string | null;
  announcement_link_url: string | null;
  announcement_dismissible: boolean;
  announcement_published_at: string | null;
  /** Whether the caller may change these settings (admins), staff only read them. */
  can_edit: boolean;
  updated_at: string;
};

export type UpdateOrganizationPayload = Partial<
  Omit<
    OrganizationDto,
    | "account_url"
    | "logo_url"
    | "logo_dark_url"
    | "favicon_url"
    | "announcement_published_at"
    | "can_edit"
    | "updated_at"
  >
>;

export type OrganizationResponse = {
  message: string;
  organization: OrganizationDto;
};
