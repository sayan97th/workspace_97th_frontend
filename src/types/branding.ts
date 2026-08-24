/** API type for `GET /api/branding`, readable by any authenticated user. */
export type PublicBrandingDto = {
  logo_url: string | null;
  email_header_url: string | null;
};
