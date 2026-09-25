const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

/**
 * Error thrown by {@link publicApiRequest}: the API's JSON error body plus the
 * HTTP status, the same shape `apiClient` throws.
 */
export type PublicApiError = {
  message?: string;
  errors?: Record<string, string[]>;
  status_code: number;
  [key: string]: unknown;
};

/**
 * Calls a public endpoint (a shared form or view) without any access token.
 * Unlike `apiClient`, a 401 here is an expected answer (a password protected
 * link), so it never tries to refresh a session or redirect to sign in.
 */
export async function publicApiRequest<T>(endpoint: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw { message: "An unexpected error occurred", ...data, status_code: response.status } as PublicApiError;
  }

  return data as T;
}
