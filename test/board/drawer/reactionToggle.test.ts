import { describe, expect, test } from "vitest";
import { bumpReaction } from "@/components/board/drawer/reactionToggle";
import type { DrawerReaction } from "@/components/board/drawer/types";

const party: DrawerReaction = { emoji: "🎉", count: 1, reacted_by_me: false, reactor_names: ["Haley"] };

describe("bumpReaction", () => {
  test("adds a new pill for an emoji nobody used yet", () => {
    expect(bumpReaction([], "🔥")).toEqual([{ emoji: "🔥", count: 1, reacted_by_me: true, reactor_names: ["You"] }]);
  });

  test("joins an existing pill and leaves it again", () => {
    const joined = bumpReaction([party], "🎉");
    expect(joined[0]).toMatchObject({ count: 2, reacted_by_me: true, reactor_names: ["Haley", "You"] });

    expect(bumpReaction(joined, "🎉")[0]).toMatchObject({ count: 1, reacted_by_me: false, reactor_names: ["Haley"] });
  });

  test("drops the pill once its last reaction is removed", () => {
    const mine: DrawerReaction = { emoji: "👀", count: 1, reacted_by_me: true, reactor_names: ["You"] };
    expect(bumpReaction([party, mine], "👀")).toEqual([party]);
  });
});
