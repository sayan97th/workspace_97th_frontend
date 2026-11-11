import { describe, expect, test } from "vitest";
import { flipLike } from "@/components/board/drawer/likeToggle";
import { mapFeedReactionsDto, mapFeedUpdateDto, type FeedUpdateDto } from "@/types/feed";

const base_dto: FeedUpdateDto = {
  id: "ic-7",
  actor: { id: 2, name: "Haley Riemenschneider", avatar_url: null },
  body: "Received a notification",
  created_at: new Date().toISOString(),
  board: { id: 4, name: "Client Services Team", parent_name: null },
  item: { id: 9, name: "New item" },
  link: "/boards/4/pulses/9?comment=7",
  view_count: 1,
  is_reply: false,
  is_unread: false,
  is_mentioned: true,
  is_bookmarked: false,
  mentioned_user_ids: [3],
  mentions: [],
  pinned: false,
  is_following_item: true,
  is_following_board: false,
  activity: [],
  activity_total: 0,
  like_count: 1,
  liked_by_me: false,
  likers: [{ id: 2, full_name: "Haley Riemenschneider", profile_photo_url: null, liked_at: "2026-11-10T10:00:00Z" }],
  reactions: [
    {
      emoji: "🎉",
      count: 1,
      reacted_by_me: false,
      reactor_names: ["Haley Riemenschneider"],
      reactors: [{ id: 2, full_name: "Haley Riemenschneider", profile_photo_url: null, reacted_at: "2026-11-10T10:01:00Z" }],
    },
  ],
};

describe("feed likes and reactions mapping", () => {
  test("maps likers and reactors into the people the drawer cards read", () => {
    const update = mapFeedUpdateDto(base_dto);

    expect(update.like_count).toBe(1);
    expect(update.liked_by_me).toBe(false);
    expect(update.likers?.[0]).toMatchObject({ id: "2", name: "Haley Riemenschneider", liked_at: "2026-11-10T10:00:00Z" });
    expect(update.reactions[0].reactors?.[0]).toMatchObject({ id: "2", reacted_at: "2026-11-10T10:01:00Z" });
  });

  test("an older payload without like fields reads as nobody reacted", () => {
    const legacy = { ...base_dto } as Partial<FeedUpdateDto>;
    delete legacy.like_count;
    delete legacy.liked_by_me;
    delete legacy.likers;
    delete legacy.reactions;

    expect(mapFeedReactionsDto(legacy as FeedUpdateDto)).toEqual({ like_count: 0, liked_by_me: false, likers: [], reactions: [] });
  });

  test("an optimistic like on a feed card adds the viewer and can be reverted", () => {
    const viewer = { id: "3", name: "Sam Brown", initials: "SB", avatar_seed: 3 };
    const update = mapFeedUpdateDto(base_dto);

    const liked = flipLike(update, viewer);
    expect(liked).toMatchObject({ like_count: 2, liked_by_me: true });
    expect(liked.likers?.map((person) => person.id)).toEqual(["2", "3"]);

    expect(flipLike(liked, viewer)).toMatchObject({ like_count: 1, liked_by_me: false });
  });
});
