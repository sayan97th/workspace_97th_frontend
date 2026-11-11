import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const service = vi.hoisted(() => ({
  listAllDrafts: vi.fn(),
  listBoardDrafts: vi.fn(),
  saveDraft: vi.fn(),
  discardDraft: vi.fn(),
  discardDraftById: vi.fn(),
}));

vi.mock("@/services/comment-drafts.service", () => ({ commentDraftsService: service }));

import { commentDraftStore } from "@/lib/comment-drafts";

const item_address = { board_id: 10, item_id: 20, parent_id: null };
const reply_address = { board_id: 10, item_id: 20, parent_id: 30 };

let owner_seq = 100;

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  Object.values(service).forEach((mock) => mock.mockReset());
  service.saveDraft.mockResolvedValue(null);
  service.discardDraft.mockResolvedValue(undefined);
  service.listBoardDrafts.mockResolvedValue([]);
  // A fresh owner per test starts the shared store from an empty slate.
  owner_seq += 1;
  commentDraftStore.setOwner(owner_seq);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("commentDraftStore", () => {
  test("keeps typed text in this browser at once and saves it to the API after a pause", async () => {
    commentDraftStore.updateDraft(item_address, { body: "Hel" });
    commentDraftStore.updateDraft(item_address, { body: "Hello team" });

    expect(commentDraftStore.getDraft(item_address)?.body).toBe("Hello team");
    expect(window.localStorage.getItem(`comment-drafts:v1:${owner_seq}`)).toContain("Hello team");
    expect(service.saveDraft).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);

    expect(service.saveDraft).toHaveBeenCalledTimes(1);
    expect(service.saveDraft).toHaveBeenCalledWith(
      10,
      { item_id: 20, parent_id: null, body: "Hello team", mentioned_user_ids: [], notified_user_ids: [] },
      false
    );
    expect(commentDraftStore.getDraft(item_address)?.status).toBe("saved");
  });

  test("keeps reply drafts apart from the update box and flags the item", () => {
    commentDraftStore.updateDraft(reply_address, { body: "A reply" });

    expect(commentDraftStore.getDraft(item_address)).toBeNull();
    expect(commentDraftStore.getDraft(reply_address)?.body).toBe("A reply");
    expect(commentDraftStore.hasItemDraft(20)).toBe(true);
    expect(commentDraftStore.getScopeDrafts(10, 20)).toHaveLength(1);
  });

  test("picking people alone does not create a draft, but they travel with one", () => {
    commentDraftStore.updateDraft(item_address, { mentioned_user_ids: [7] });
    expect(commentDraftStore.getDraft(item_address)).toBeNull();

    commentDraftStore.updateDraft(item_address, { body: "@Ana look", mentioned_user_ids: ["7", "7"] as unknown as number[] });
    commentDraftStore.updateDraft(item_address, { notified_user_ids: [9] });

    const draft = commentDraftStore.getDraft(item_address);
    expect(draft?.mentioned_user_ids).toEqual([7]);
    expect(draft?.notified_user_ids).toEqual([9]);
  });

  test("clearing a sent draft removes it right away, locally and on the API", async () => {
    commentDraftStore.updateDraft(item_address, { body: "Sending this" });
    commentDraftStore.clearDraft(item_address);

    expect(commentDraftStore.getDraft(item_address)).toBeNull();
    expect(commentDraftStore.hasItemDraft(20)).toBe(false);

    await vi.advanceTimersByTimeAsync(0);

    expect(service.discardDraft).toHaveBeenCalledWith(10, 20, null);
    expect(service.saveDraft).not.toHaveBeenCalled();
  });

  test("merging a board's drafts keeps a newer local change and drops ones removed elsewhere", async () => {
    service.saveDraft.mockReturnValue(new Promise(() => {}));
    commentDraftStore.updateDraft(item_address, { body: "Typed here, not synced" });
    commentDraftStore.updateDraft(reply_address, { body: "Old reply" });
    // Pretend the reply was synced earlier, then sent from another device.
    service.listBoardDrafts.mockResolvedValue([
      {
        id: 1,
        board_id: 10,
        item_id: 20,
        parent_id: null,
        body: "Older server copy",
        mentioned_user_ids: [],
        notified_user_ids: [],
        updated_at: "2026-11-01T10:00:00Z",
      },
      {
        id: 2,
        board_id: 10,
        item_id: 99,
        parent_id: null,
        body: "From another device",
        mentioned_user_ids: [3],
        notified_user_ids: [],
        updated_at: "2026-11-01T10:00:00Z",
      },
    ]);

    await commentDraftStore.ensureBoardLoaded(10);

    expect(commentDraftStore.getDraft(item_address)?.body).toBe("Typed here, not synced");
    expect(commentDraftStore.getDraft({ board_id: 10, item_id: 99, parent_id: null })?.mentioned_user_ids).toEqual([3]);
    // The reply is still dirty locally, so it stays until it syncs.
    expect(commentDraftStore.getDraft(reply_address)?.body).toBe("Old reply");
    expect(commentDraftStore.isBoardLoaded(10)).toBe(true);
  });

  test("a failed save keeps the draft on this device and retries", async () => {
    service.saveDraft.mockRejectedValueOnce({ status_code: 500 }).mockResolvedValue(null);
    commentDraftStore.updateDraft(item_address, { body: "Offline words" });

    await vi.advanceTimersByTimeAsync(1000);
    expect(commentDraftStore.getDraft(item_address)?.status).toBe("offline");

    await vi.advanceTimersByTimeAsync(16000);
    expect(service.saveDraft).toHaveBeenCalledTimes(2);
    expect(commentDraftStore.getDraft(item_address)?.status).toBe("saved");
  });

  test("drafts restore from this browser for the same user only", () => {
    commentDraftStore.updateDraft(item_address, { body: "Mine" });
    const owner_id = owner_seq;

    commentDraftStore.setOwner(owner_id + 1000);
    expect(commentDraftStore.getDraft(item_address)).toBeNull();

    commentDraftStore.setOwner(owner_id);
    expect(commentDraftStore.getDraft(item_address)?.body).toBe("Mine");
  });
});
