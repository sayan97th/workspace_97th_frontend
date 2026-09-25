import { afterEach, describe, expect, test, vi } from "vitest";
import { boardShareService } from "@/services/board-share.service";
import { boardFormService } from "@/services/board-form.service";

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown };
let calls: Call[] = [];

const stubFetch = (status = 200, body: unknown = {}) => {
  calls = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: String(init?.method),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("public requests", () => {
  test("opening a shared view posts the password and never sends a session token", async () => {
    // A signed in visitor: the regular client would attach this token.
    vi.stubGlobal("localStorage", { getItem: () => "secret-session", setItem: () => {}, removeItem: () => {} });
    stubFetch();
    await boardShareService.openSharedView("abc", "open sesame");
    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).toMatch(/\/api\/public\/views\/abc$/);
    expect(calls[0].body).toEqual({ password: "open sesame" });
    expect(calls[0].headers.Authorization).toBeUndefined();
  });

  test("a password protected view rejects with the 401 details instead of redirecting", async () => {
    stubFetch(401, { message: "This view is password protected.", requires_password: true });
    await expect(boardShareService.openSharedView("abc")).rejects.toMatchObject({ status_code: 401, requires_password: true });
  });

  test("a form submission sends the name and the answers", async () => {
    stubFetch(201, { message: "Thanks" });
    await boardFormService.submitPublicForm("tok", "Ada", { "12": "ada@example.com" });
    expect(calls[0].url).toMatch(/\/api\/public\/forms\/tok\/submissions$/);
    expect(calls[0].body).toEqual({ name: "Ada", answers: { "12": "ada@example.com" } });
  });

  test("validation errors come back per question", async () => {
    stubFetch(422, { message: "Invalid", errors: { "answers.12": ["Email must be a valid email address."] } });
    await expect(boardFormService.submitPublicForm("tok", "Ada", {})).rejects.toMatchObject({
      status_code: 422,
      errors: { "answers.12": ["Email must be a valid email address."] },
    });
  });
});

describe("share link management", () => {
  test("removing the password sends an explicit null", async () => {
    stubFetch(200, { link: { token: "t" } });
    await boardShareService.updateLink(5, 7, { password: null });
    expect(calls[0].method).toBe("PATCH");
    expect(calls[0].url).toMatch(/\/api\/boards\/5\/views\/7\/share-link$/);
    expect(calls[0].body).toEqual({ password: null });
  });
});
