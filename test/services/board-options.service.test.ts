import { afterEach, describe, expect, test, vi } from "vitest";
import { boardOptionsService } from "@/services/board-options.service";

let calls: { url: string; method: string }[] = [];

const stubFetch = () => {
  calls = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), method: String(init?.method) });
    return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("archived group requests", () => {
  test("Restore patches the group restore endpoint", async () => {
    stubFetch();
    await boardOptionsService.restoreTrashGroup(5, "4");
    expect(calls).toEqual([expect.objectContaining({ method: "PATCH" })]);
    expect(calls[0].url).toMatch(/\/api\/boards\/5\/trash\/groups\/4\/restore$/);
  });

  test("Delete forever deletes through the group trash endpoint", async () => {
    stubFetch();
    await boardOptionsService.deleteTrashGroupForever(5, "4");
    expect(calls[0].method).toBe("DELETE");
    expect(calls[0].url).toMatch(/\/api\/boards\/5\/trash\/groups\/4$/);
  });
});
