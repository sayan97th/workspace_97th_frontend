const DEFAULT_REDIRECT = "/";
const AUTH_ROUTES = ["/signin", "/signup"];

/**
 * Validates and returns a safe redirect URL from a callback parameter.
 * Returns the default redirect path if the URL is invalid or unsafe.
 */
export function getValidRedirectUrl(callback_url: string | null): string {
  if (!callback_url) return DEFAULT_REDIRECT;

  const decoded_url = decodeURIComponent(callback_url).trim();

  // Only allow relative paths starting with /
  if (!decoded_url.startsWith("/")) return DEFAULT_REDIRECT;

  // Prevent protocol-relative URLs (e.g. //evil.com)
  if (decoded_url.startsWith("//")) return DEFAULT_REDIRECT;

  // Avoid redirecting back to auth routes
  const pathname = decoded_url.split("?")[0];
  if (AUTH_ROUTES.includes(pathname)) return DEFAULT_REDIRECT;

  return decoded_url;
}
