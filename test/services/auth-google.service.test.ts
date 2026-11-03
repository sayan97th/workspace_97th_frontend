import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { authService } from "@/services/auth.service";
import { getValidRedirectUrl } from "@/utils/redirect";

const API_BASE_URL = "https://api.workspace97th.97dev.com";

let calls: { url: string; method: string; body: unknown }[] = [];

const stubFetch = (response_body: unknown, status = 200) => {
  calls = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), method: String(init?.method), body: init?.body ? JSON.parse(String(init.body)) : null });
    return new Response(JSON.stringify(response_body), { status, headers: { "Content-Type": "application/json" } });
  });
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", API_BASE_URL);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("google redirect url", () => {
  test("points at the API redirect endpoint without options", () => {
    expect(authService.getGoogleRedirectUrl()).toBe(`${API_BASE_URL}/api/auth/google/redirect`);
  });

  test("carries keep me logged in and the page to return to", () => {
    const url = new URL(authService.getGoogleRedirectUrl({ remember: true, callback_url: "/boards/42?view=table" }));

    expect(url.searchParams.get("remember")).toBe("1");
    expect(url.searchParams.get("callback_url")).toBe("/boards/42?view=table");
  });

  test("never forwards a callback url that leaves the app", () => {
    const url = new URL(authService.getGoogleRedirectUrl({ callback_url: "https://evil.example.com" }));

    expect(url.searchParams.get("callback_url")).toBe("/workspace-home");
  });
});

describe("google login code exchange", () => {
  test("stores the session when no two factor challenge is required", async () => {
    stubFetch({
      access_token: "access-token",
      token_type: "bearer",
      expires_in: 3600,
      session_expires_at: "2030-01-01T00:00:00+00:00",
      user: { id: 1 },
      callback_url: "/boards/42",
    });

    const response = await authService.exchangeGoogleLoginCode("login-code");

    expect(calls[0]).toMatchObject({ method: "POST", body: { login_code: "login-code" } });
    expect(calls[0].url).toMatch(/\/api\/auth\/google\/exchange$/);
    expect(response.callback_url).toBe("/boards/42");
    expect(localStorage.getItem("token_expires_at")).not.toBeNull();
  });

  test("does not store a session while the two factor challenge is pending", async () => {
    stubFetch({ requires_two_factor: true, two_factor_token: "pending-token", callback_url: null });

    const response = await authService.exchangeGoogleLoginCode("login-code");

    expect(response).toMatchObject({ requires_two_factor: true, two_factor_token: "pending-token" });
    expect(localStorage.getItem("token_expires_at")).toBeNull();
  });
});

describe("redirect validation", () => {
  test("rejects backslash protocol relative urls", () => {
    expect(getValidRedirectUrl("/\\evil.example.com")).toBe("/workspace-home");
  });
});
