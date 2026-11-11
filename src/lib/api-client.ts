import { publishAutomationEffectsFromResponse } from "@/lib/automation-effects";
import { IMPERSONATION_EXIT_PATH, clearImpersonationStorage, readStashedAdminSession } from "@/lib/impersonation-storage";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  responseType?: "json" | "blob";
  /** Skip the refresh and sign in redirect on a 401 and just throw, the caller handles it. */
  skip_auth_refresh?: boolean;
};

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

/** Epoch milliseconds when the whole sign in ends (1 day, or 30 days with "Keep me logged in"). */
const SESSION_EXPIRES_AT_KEY = "session_expires_at";

function getSessionExpiresAt(): number | null {
  if (typeof window === "undefined") return null;
  const value = parseInt(localStorage.getItem(SESSION_EXPIRES_AT_KEY) ?? "", 10);
  return Number.isFinite(value) ? value : null;
}

/** True once the session can no longer be refreshed and the user has to sign in again. */
function isSessionOver(): boolean {
  const session_expires_at = getSessionExpiresAt();
  return session_expires_at !== null && session_expires_at <= Date.now();
}

/**
 * Stores the access token. The cookie lives as long as the session itself
 * (falling back to one hour when the session end is unknown), so it matches
 * what the "Keep me logged in" choice promised.
 */
function setToken(token: string): void {
  localStorage.setItem("access_token", token);
  const session_expires_at = getSessionExpiresAt();
  const max_age = session_expires_at ? Math.max(Math.floor((session_expires_at - Date.now()) / 1000), 0) : 60 * 60;
  document.cookie = `access_token=${token}; path=/; max-age=${max_age}; SameSite=Lax`;
}

function removeToken(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("token_expires_at");
  localStorage.removeItem(SESSION_EXPIRES_AT_KEY);
  document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
}

type SessionTokenData = {
  access_token: string;
  /** Seconds until the access token itself expires and needs a refresh. */
  expires_in: number;
  /** ISO 8601 date when the whole session ends, see `AuthResponse`. */
  session_expires_at?: string | null;
};

/** Saves a fresh login, 2FA, invitation or refresh response as the active session. */
function persistSession(data: SessionTokenData): void {
  if (data.session_expires_at) {
    const session_expires_at = Date.parse(data.session_expires_at);
    if (Number.isFinite(session_expires_at)) {
      localStorage.setItem(SESSION_EXPIRES_AT_KEY, session_expires_at.toString());
    }
  }
  setToken(data.access_token);
  const token_expires_at = Date.now() + data.expires_in * 1000;
  localStorage.setItem("token_expires_at", token_expires_at.toString());
}

/**
 * Public pages (a shared form or view) are open to anyone, so an expired
 * session left in this browser must not bounce the visitor to sign in.
 */
const PUBLIC_PATH_PREFIXES = ["/forms/", "/share/"];

function isPublicPage(): boolean {
  return typeof window !== "undefined" && PUBLIC_PATH_PREFIXES.some((prefix) => window.location.pathname.startsWith(prefix));
}

/**
 * An impersonation token expired or was revoked. It can never be refreshed (the API rejects
 * it), so instead of signing out, put the admin's own stashed session back and return them to
 * where the impersonation started. Returns false when no impersonation is in progress.
 */
function restoreAdminSessionAfterImpersonation(): boolean {
  const stashed_session = readStashedAdminSession();
  if (!stashed_session) return false;

  setToken(stashed_session.admin_token);
  if (stashed_session.admin_expires_at) {
    localStorage.setItem("token_expires_at", stashed_session.admin_expires_at);
  }
  clearImpersonationStorage();

  if (typeof window !== "undefined") {
    window.location.href = IMPERSONATION_EXIT_PATH;
  }
  return true;
}

/**
 * Shared 401 handling for every request: retries once with a refreshed token, otherwise ends
 * the session. Returns the new token to retry with, or throws.
 */
async function handleUnauthorized(): Promise<string> {
  if (restoreAdminSessionAfterImpersonation()) {
    throw new Error("Impersonation session ended");
  }

  const new_token = await tryRefreshToken();
  if (new_token) return new_token;

  removeToken();
  if (typeof window !== "undefined" && !isPublicPage()) {
    window.location.href = "/signin";
  }
  throw new Error("Session expired");
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const token = getToken();
      if (!token || isSessionOver()) return null;

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return null;

      const data = (await response.json()) as SessionTokenData;
      persistSession(data);
      return data.access_token;
    } catch {
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { body, responseType, skip_auth_refresh, headers: customHeaders, ...restOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(customHeaders as Record<string, string>),
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...restOptions,
    headers,
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // If 401, try refresh and retry once
  if (response.status === 401 && token && !skip_auth_refresh) {
    const new_token = await handleUnauthorized();
    headers["Authorization"] = `Bearer ${new_token}`;
    config.headers = headers;
    response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  }

  if (!response.ok) {
    const error_data = await response.json().catch(() => ({
      message: "An unexpected error occurred",
    }));
    throw { ...error_data, status_code: response.status };
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  if (responseType === "blob") {
    return response.blob() as Promise<T>;
  }

  return readJsonBody<T>(response);
}

/**
 * Parses a JSON body and hands its `automation_effects` (what the automations this request set
 * off changed) to whichever board is open, see `lib/automation-effects.ts`.
 */
async function readJsonBody<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T;
  publishAutomationEffectsFromResponse(body);
  return body;
}

async function requestFormData<T>(
  endpoint: string,
  form_data: FormData,
  method: string = "POST"
): Promise<T> {
  // NOTE: do not set Content-Type, the browser adds the multipart boundary.
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
    body: form_data,
  };

  let response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (response.status === 401 && token) {
    const new_token = await handleUnauthorized();
    headers["Authorization"] = `Bearer ${new_token}`;
    config.headers = headers;
    response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  }

  if (!response.ok) {
    const error_data = await response.json().catch(() => ({
      message: "An unexpected error occurred",
    }));
    throw { ...error_data, status_code: response.status };
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return readJsonBody<T>(response);
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "POST", body }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "PUT", body }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "PATCH", body }),

  delete: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE", body }),

  postFormData: <T>(endpoint: string, form_data: FormData) =>
    requestFormData<T>(endpoint, form_data, "POST"),
};

/** Turns an API path (e.g. a signed download link the API returned) into an absolute URL the browser can open. */
export const toApiUrl = (path: string): string => (/^https?:\/\//i.test(path) ? path : `${API_BASE_URL.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`);

export { setToken, removeToken, getToken, getSessionExpiresAt, persistSession };
