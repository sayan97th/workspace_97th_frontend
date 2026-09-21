import { afterEach, describe, expect, test, vi } from "vitest";
import { getApiErrorMessage } from "@/lib/api-error";
import { boardContentService } from "@/services/board-content.service";

// `fetch` is replaced by a stub that records the request, so these pin down the URL, verb
// and body every row menu action sends without needing the API.

type RecordedCall = { url: string; method: string; body: unknown };

let calls: RecordedCall[] = [];

const stubFetch = (status: number, payload: unknown) => {
  calls = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), method: String(init?.method), body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
  });
};

const rejectionOf = (promise: Promise<unknown>) => promise.then(() => null, (rejection) => rejection);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("row menu requests", () => {
  test("Convert to subitem sends the new parent to the parent endpoint and returns the item", async () => {
    stubFetch(200, { item: { id: 7, parent_id: 3, group_id: 1, position: 2, values: {} } });
    const item = await boardContentService.updateItemParent(5, 7, { parent_id: 3 });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ method: "PATCH", body: { parent_id: 3 } });
    expect(calls[0].url).toMatch(/\/api\/boards\/5\/items\/7\/parent$/);
    expect(item.parent_id).toBe(3);
  });

  test("Convert to item sends a null parent together with the table it lands in", async () => {
    stubFetch(200, { item: { id: 7, parent_id: null, group_id: 9, position: 0, values: {} } });
    await boardContentService.updateItemParent(5, 7, { parent_id: null, group_id: 9 });
    expect(calls[0].body).toEqual({ parent_id: null, group_id: 9 });
  });

  test("Create new item below sends after_item_id and no table", async () => {
    stubFetch(201, { item: { id: 8 } });
    const created = await boardContentService.createItem(5, { name: "New item", after_item_id: 7 });
    expect(calls[0]).toMatchObject({ method: "POST", body: { name: "New item", after_item_id: 7 } });
    expect(calls[0].url).toMatch(/\/api\/boards\/5\/items$/);
    expect(calls[0].body).not.toHaveProperty("group_id");
    expect(created.id).toBe(8);
  });

  test("Move to group sends the item ids and the target table", async () => {
    stubFetch(200, { items: [{ id: 7, group_id: 2, position: 4 }] });
    const moved = await boardContentService.moveItems(5, [7], 2);
    expect(calls[0]).toMatchObject({ method: "PATCH", body: { item_ids: [7], group_id: 2 } });
    expect(calls[0].url).toMatch(/\/api\/boards\/5\/items\/move$/);
    expect(moved[0].position).toBe(4);
  });

  test("Archive sends the ids to the archive endpoint, not the delete one", async () => {
    stubFetch(200, { message: "Items archived successfully." });
    await boardContentService.archiveItems(5, [7]);
    expect(calls[0]).toMatchObject({ method: "PATCH", body: { item_ids: [7] } });
    expect(calls[0].url).toMatch(/\/api\/boards\/5\/items\/archive$/);
  });

  test("Delete sends a DELETE for that one item", async () => {
    stubFetch(200, { message: "Item deleted successfully." });
    await boardContentService.deleteItem(5, 7);
    expect(calls[0].method).toBe("DELETE");
    expect(calls[0].url).toMatch(/\/api\/boards\/5\/items\/7$/);
  });

  test("Duplicate sends with_subitems so the item can be copied on its own", async () => {
    stubFetch(201, { items: [{ id: 9 }] });
    await boardContentService.duplicateItems(5, [7], false);
    expect(calls[0]).toMatchObject({ method: "POST", body: { item_ids: [7], with_subitems: false } });
    expect(calls[0].url).toMatch(/\/api\/boards\/5\/items\/duplicate$/);
  });

  test("Mark as priority patches is_priority on the item", async () => {
    stubFetch(200, { item: { id: 7, is_priority: true } });
    const item = await boardContentService.updateItem(5, 7, { is_priority: true });
    expect(calls[0]).toMatchObject({ method: "PATCH", body: { is_priority: true } });
    expect(calls[0].url).toMatch(/\/api\/boards\/5\/items\/7$/);
    expect(item.is_priority).toBe(true);
  });

  test("Set recurring and Stop recurring use the recurrence endpoint", async () => {
    stubFetch(200, { recurrence: { frequency: "weekly", interval_count: 2 } });
    const saved = await boardContentService.setItemRecurrence(5, 7, { frequency: "weekly", interval_count: 2 });
    expect(calls[0]).toMatchObject({ method: "PATCH", body: { frequency: "weekly", interval_count: 2 } });
    expect(calls[0].url).toMatch(/\/api\/boards\/5\/items\/7\/recurrence$/);
    expect(saved).toEqual({ frequency: "weekly", interval_count: 2 });

    stubFetch(200, { message: "Item is no longer recurring." });
    await boardContentService.clearItemRecurrence(5, 7);
    expect(calls[0].method).toBe("DELETE");
    expect(calls[0].url).toMatch(/\/api\/boards\/5\/items\/7\/recurrence$/);
  });

  test("requests carry the stored access token", async () => {
    localStorage.setItem("access_token", "token-123");
    const seen_headers: Record<string, string>[] = [];
    vi.stubGlobal("fetch", async (_input: RequestInfo | URL, init?: RequestInit) => {
      seen_headers.push(init?.headers as Record<string, string>);
      return new Response("{}", { status: 200 });
    });
    await boardContentService.archiveItems(5, [7]);
    expect(seen_headers[0].Authorization).toBe("Bearer token-123");
  });
});

describe("failed requests", () => {
  test("a 422 from the parent endpoint rejects with the validation message the toast shows", async () => {
    stubFetch(422, {
      message: "An item with its own subitems cannot be converted into a subitem.",
      errors: { parent_id: ["An item with its own subitems cannot be converted into a subitem."] },
    });
    const error = await rejectionOf(boardContentService.updateItemParent(5, 7, { parent_id: 3 }));
    expect(error.status_code).toBe(422);
    expect(getApiErrorMessage(error, "Couldn't convert the row. Please try again.")).toBe("An item with its own subitems cannot be converted into a subitem.");
  });

  test("a 403 rejects so the caller can report it", async () => {
    stubFetch(403, { message: "This action is unauthorized." });
    const error = await rejectionOf(boardContentService.archiveItems(5, [7]));
    expect(error.status_code).toBe(403);
    expect(getApiErrorMessage(error, "fallback")).toBe("This action is unauthorized.");
  });

  test("a response with no JSON body still rejects with the generic message", async () => {
    vi.stubGlobal("fetch", async () => new Response("<html>Server error</html>", { status: 500 }));
    const error = await rejectionOf(boardContentService.deleteItem(5, 7));
    expect(error.status_code).toBe(500);
    expect(getApiErrorMessage(error, "Couldn't delete the row. Please try again.")).toBe("An unexpected error occurred");
  });
});
