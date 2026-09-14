import { apiClient, getToken, removeToken, setToken } from "@/lib/api-client";
import type { ImpersonationStartResponse } from "@/types/auth";

const ADMIN_TOKEN_KEY = "impersonation_admin_token";
const ADMIN_EXPIRES_KEY = "impersonation_admin_expires_at";
const META_KEY = "impersonation_meta";

export type ImpersonationMeta = {
  admin_id: number;
  admin_full_name: string;
  admin_email: string;
  target_id: number;
  target_full_name: string;
  started_at: string;
  /** Epoch milliseconds, matching the "token_expires_at" convention used elsewhere. */
  expires_at: number;
};

const readMeta = (): ImpersonationMeta | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(META_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ImpersonationMeta;
  } catch {
    return null;
  }
};

/**
 * Talks to the Laravel `/api/admin/users/{id}/impersonate` and `/api/impersonation/stop`
 * endpoints, and owns the localStorage bookkeeping that lets a browser tab hold two identities
 * at once: the signed-in admin's own token (stashed here while impersonating) and the target's
 * token (the one `apiClient` actively sends). Never persists anything server-side beyond the
 * audit trail Laravel already writes, so a lost/cleared tab simply strands the target's token
 * until it expires on its own — see `ImpersonationController::IMPERSONATION_TTL_MINUTES`.
 */
export const impersonationService = {
  isImpersonating(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(ADMIN_TOKEN_KEY);
  },

  getMeta(): ImpersonationMeta | null {
    return readMeta();
  },

  /** Starts impersonating the given user, stashing the current (admin) token so it can be restored later. */
  async start(user_id: number): Promise<ImpersonationStartResponse> {
    const admin_token = getToken();
    if (!admin_token) {
      throw new Error("You must be signed in to impersonate a user.");
    }

    const data = await apiClient.post<ImpersonationStartResponse>(`/api/admin/users/${user_id}/impersonate`);

    const admin_expires_at = localStorage.getItem("token_expires_at") ?? "";
    localStorage.setItem(ADMIN_TOKEN_KEY, admin_token);
    localStorage.setItem(ADMIN_EXPIRES_KEY, admin_expires_at);

    const expires_at = Date.now() + data.expires_in * 1000;
    const meta: ImpersonationMeta = {
      admin_id: data.impersonation.admin.id,
      admin_full_name: data.impersonation.admin.full_name,
      admin_email: data.impersonation.admin.email,
      target_id: data.user.id,
      target_full_name: data.user.full_name,
      started_at: data.impersonation.started_at,
      expires_at,
    };
    localStorage.setItem(META_KEY, JSON.stringify(meta));

    setToken(data.access_token);
    localStorage.setItem("token_expires_at", expires_at.toString());

    return data;
  },

  /**
   * Ends the impersonation session and restores the admin's own token. Always restores the
   * admin session even if the server call fails (expired token, network error, the account
   * requiring 2FA the target never set up) — the session is time-boxed server-side regardless,
   * so a failed cleanup call must never strand the admin behind the target's identity.
   */
  async stop(): Promise<void> {
    try {
      await apiClient.post("/api/impersonation/stop");
    } catch {
      // Restore the admin session below regardless of the outcome.
    }

    const admin_token = localStorage.getItem(ADMIN_TOKEN_KEY);
    const admin_expires_at = localStorage.getItem(ADMIN_EXPIRES_KEY);

    if (admin_token) {
      setToken(admin_token);
      if (admin_expires_at) {
        localStorage.setItem("token_expires_at", admin_expires_at);
      }
    } else {
      removeToken();
    }

    this.clear();
  },

  /** Drops any impersonation bookkeeping without touching the active token — used on a real sign-out. */
  clear(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_EXPIRES_KEY);
    localStorage.removeItem(META_KEY);
  },
};
