import { describe, expect, test } from "vitest";
import type { BoardPersonOption } from "@/components/board/toolbar/types";
import {
  ALL_TAB,
  LIKE_TAB,
  buildReactionPeople,
  buildReactionTabs,
  filterRowsByTab,
  formatReactionPeopleNames,
  type ReactionSource,
} from "@/components/board/drawer/reactionPeople";

const person = (id: string, name: string): BoardPersonOption => ({ id, name, initials: name.slice(0, 2), avatar_seed: Number(id) });

const me = person("1", "Haley Riemenschneider");
const sam = person("2", "Sam Brown");
const ana = person("3", "Ana Lopez");

const source: ReactionSource = {
  liked_by_me: true,
  like_count: 2,
  likers: [
    { ...sam, liked_at: "2026-11-10T10:00:00Z" },
    { ...me, liked_at: "2026-11-10T11:00:00Z" },
  ],
  reactions: [
    { emoji: "🎉", count: 2, reacted_by_me: false, reactor_names: ["Sam Brown", "Ana Lopez"], reactors: [
      { ...sam, reacted_at: "2026-11-10T12:00:00Z" },
      { ...ana, reacted_at: "2026-11-10T09:00:00Z" },
    ] },
  ],
};

describe("buildReactionPeople", () => {
  test("merges likes and reactions into one row per person, newest first", () => {
    const rows = buildReactionPeople(source, me);
    expect(rows.map((row) => row.person.name)).toEqual(["Sam Brown", "Haley Riemenschneider", "Ana Lopez"]);
    expect(rows[0]).toMatchObject({ has_liked: true, reactions: [{ emoji: "🎉" }] });
    expect(rows[1].is_you).toBe(true);
  });

  test("a fresh reaction with names only matches You back to the current user", () => {
    const rows = buildReactionPeople({ liked_by_me: false, like_count: 0, reactions: [{ emoji: "👀", count: 1, reacted_by_me: true, reactor_names: ["You"] }] }, me);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ is_you: true, person: { id: "1" } });
  });
});

describe("tabs and filters", () => {
  test("offers All, Like and each emoji with people counts", () => {
    const rows = buildReactionPeople(source, me);
    expect(buildReactionTabs(source, rows).map((tab) => [tab.key, tab.count])).toEqual([
      [ALL_TAB, 3],
      [LIKE_TAB, 2],
      ["🎉", 2],
    ]);
    expect(filterRowsByTab(rows, LIKE_TAB).map((row) => row.person.id)).toEqual(["2", "1"]);
    expect(filterRowsByTab(rows, "🎉").map((row) => row.person.id)).toEqual(["2", "3"]);
  });

  test("names the current user first as You", () => {
    expect(formatReactionPeopleNames(buildReactionPeople(source, me))).toBe("You, Sam Brown, and Ana Lopez");
  });
});
