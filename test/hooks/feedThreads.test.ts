import { describe, expect, test } from "vitest";
import { foldReplies } from "@/components/board/drawer/useFoldedReplies";
import {
  appendReply,
  collectFeedIds,
  countThreadUnread,
  isThreadUnread,
  patchFeedEntry,
  replaceFeedEntry,
} from "@/hooks/feedThreads";
import { mapFeedUpdateDto, type FeedUpdateDto } from "@/types/feed";
import type { FeedUpdate } from "@/data/update-feed-data";

const dto = (id: string, overrides: Partial<FeedUpdateDto> = {}): FeedUpdateDto => ({
  id,
  thread_id: id,
  actor: { id: 2, name: "Anna Patterson", avatar_url: null },
  body: `Body of ${id}`,
  created_at: "2026-11-03T10:00:00Z",
  board: { id: 4, name: "Team Katie", parent_name: null },
  item: { id: 9, name: "Strategy Realignment Deck" },
  link: `/boards/4/pulses/9?comment=${id}`,
  view_count: 4,
  is_reply: false,
  is_unread: false,
  is_mentioned: false,
  is_bookmarked: false,
  mentioned_user_ids: [],
  mentions: [],
  pinned: false,
  is_following_item: false,
  is_following_board: false,
  activity: [],
  activity_total: 0,
  like_count: 0,
  liked_by_me: false,
  likers: [],
  reactions: [],
  ...overrides,
});

const reply = (id: string, thread_id: string, overrides: Partial<FeedUpdateDto> = {}) =>
  dto(id, { thread_id, is_reply: true, ...overrides });

describe("feed threads", () => {
  test("a thread maps with its replies inline, each pointing back at the card", () => {
    const card = mapFeedUpdateDto(dto("ic-1", { replies: [reply("ic-2", "ic-1"), reply("ic-3", "ic-1")] }));

    expect(card.thread_id).toBe("ic-1");
    expect(card.replies.map((entry) => entry.id)).toEqual(["ic-2", "ic-3"]);
    expect(card.replies.every((entry) => entry.thread_id === "ic-1" && entry.replies.length === 0)).toBe(true);
  });

  test("a card reads unread while any reply in it is unread", () => {
    const card = mapFeedUpdateDto(dto("ic-1", { replies: [reply("ic-2", "ic-1", { is_unread: true }), reply("ic-3", "ic-1")] }));

    expect(isThreadUnread(card)).toBe(true);
    expect(countThreadUnread(card)).toBe(1);
    expect(isThreadUnread({ ...card, replies: card.replies.map((entry) => ({ ...entry, is_unread: false })) })).toBe(false);
  });

  test("ids on screen include the replies, so a live reply is never added twice", () => {
    const cards = [mapFeedUpdateDto(dto("ic-1", { replies: [reply("ic-2", "ic-1")] }))];

    expect([...collectFeedIds(cards)]).toEqual(["ic-1", "ic-2"]);
  });

  test("my own reply joins its thread instead of becoming a card", () => {
    const cards = [mapFeedUpdateDto(dto("ic-1")), mapFeedUpdateDto(dto("bc-5"))];
    const mine = mapFeedUpdateDto(reply("ic-8", "ic-1", { body: "Thanks!" }));

    const next = appendReply(cards, mine);

    expect(next).toHaveLength(2);
    expect(next[0].replies.map((entry) => entry.body)).toEqual(["Thanks!"]);
    // A second copy, from the live broadcast, refreshes it instead of duplicating it.
    expect(appendReply(next, { ...mine, like_count: 1 })[0].replies).toHaveLength(1);
  });

  test("a like on a reply patches only that reply", () => {
    const cards = [mapFeedUpdateDto(dto("ic-1", { replies: [reply("ic-2", "ic-1")] }))];

    const next = patchFeedEntry(cards, "ic-2", (entry: FeedUpdate) => ({ ...entry, like_count: 1, liked_by_me: true }));

    expect(next[0].liked_by_me).toBe(false);
    expect(next[0].replies[0].liked_by_me).toBe(true);
  });

  test("the server copy of a card keeps the activity timeline the page load sent", () => {
    const activity = [{ id: 1, actor: null, column_label: "Status", column_type: "status", old_display: null, new_display: "Done", created_at: "2026-11-03T09:00:00Z" }];
    const cards = [mapFeedUpdateDto(dto("ic-1", { activity, activity_total: 1 }))];

    const next = replaceFeedEntry(cards, mapFeedUpdateDto(dto("ic-1", { is_bookmarked: true, replies: [reply("ic-2", "ic-1")] })));

    expect(next[0].is_bookmarked).toBe(true);
    expect(next[0].activity).toHaveLength(1);
    expect(next[0].replies).toHaveLength(1);
  });
});

describe("folding long threads", () => {
  const replies = ["a", "b", "c", "d", "e"].map((id) => ({ id }));

  test("a short thread shows every reply", () => {
    expect(foldReplies(replies.slice(0, 3), false)).toMatchObject({ is_folded: false, visible: replies.slice(0, 3) });
  });

  test("a long thread keeps its newest two replies in view", () => {
    const folded = foldReplies(replies, false);

    expect(folded.is_folded).toBe(true);
    expect(folded.hidden_count).toBe(3);
    expect(folded.visible.map((entry) => entry.id)).toEqual(["d", "e"]);
  });

  test("nothing folds while a hidden reply must be seen", () => {
    expect(foldReplies(replies, false, new Set(["b"])).is_folded).toBe(false);
  });

  test("an opened thread can fold back", () => {
    expect(foldReplies(replies, true)).toMatchObject({ is_folded: false, can_fold: true });
  });
});
