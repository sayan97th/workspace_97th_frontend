/**
 * localStorage keys that let one browser tab hold two identities while an admin impersonates
 * someone: the admin's own token (stashed) and the target's token (the active `access_token`).
 * Kept in `lib` with no imports so both `api-client` and `impersonation.service` can use it
 * without a circular dependency.
 */
export const IMPERSONATION_ADMIN_TOKEN_KEY = "impersonation_admin_token";
export const IMPERSONATION_ADMIN_EXPIRES_KEY = "impersonation_admin_expires_at";
export const IMPERSONATION_META_KEY = "impersonation_meta";

/** Where the admin lands after an impersonation session ends, the page it was started from. */
export const IMPERSONATION_EXIT_PATH = "/users";

export type StashedAdminSession = {
  admin_token: string;
  admin_expires_at: string | null;
};

export function readStashedAdminSession(): StashedAdminSession | null {
  if (typeof window === "undefined") return null;
  const admin_token = localStorage.getItem(IMPERSONATION_ADMIN_TOKEN_KEY);
  if (!admin_token) return null;
  return { admin_token, admin_expires_at: localStorage.getItem(IMPERSONATION_ADMIN_EXPIRES_KEY) };
}

export function clearImpersonationStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(IMPERSONATION_ADMIN_TOKEN_KEY);
  localStorage.removeItem(IMPERSONATION_ADMIN_EXPIRES_KEY);
  localStorage.removeItem(IMPERSONATION_META_KEY);
}
