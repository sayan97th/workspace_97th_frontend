const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  responseType?: "json" | "blob";
};

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function setToken(token: string): void {
  localStorage.setItem("access_token", token);
  document.cookie = `access_token=${token}; path=/; max-age=${60 * 60}; SameSite=Lax`;
}

function removeToken(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("token_expires_at");
  document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
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
      if (!token) return null;

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return null;

      const data = await response.json();
      setToken(data.access_token);
      const expires_at = Date.now() + data.expires_in * 1000;
      localStorage.setItem("token_expires_at", expires_at.toString());
      return data.access_token as string;
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
  const { body, responseType, headers: customHeaders, ...restOptions } = options;

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
  if (response.status === 401 && token) {
    const new_token = await tryRefreshToken();
    if (new_token) {
      headers["Authorization"] = `Bearer ${new_token}`;
      config.headers = headers;
      response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    } else {
      removeToken();
      if (typeof window !== "undefined") {
        window.location.href = "/signin";
      }
      throw new Error("Session expired");
    }
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

  return response.json();
}

async function requestFormData<T>(
  endpoint: string,
  form_data: FormData,
  method: string = "POST"
): Promise<T> {
  // NOTE: do not set Content-Type — the browser adds the multipart boundary.
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
    const new_token = await tryRefreshToken();
    if (new_token) {
      headers["Authorization"] = `Bearer ${new_token}`;
      config.headers = headers;
      response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    } else {
      removeToken();
      if (typeof window !== "undefined") {
        window.location.href = "/signin";
      }
      throw new Error("Session expired");
    }
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

  return response.json();
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

export { setToken, removeToken, getToken };
