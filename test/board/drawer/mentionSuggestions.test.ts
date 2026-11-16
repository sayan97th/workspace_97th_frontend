import { describe, expect, it } from "vitest";
import type { BoardPersonOption } from "@/components/board/toolbar/types";
import { buildMentionMatches, isMentionSuggestion, suggestMentionPeople } from "@/components/board/drawer/mentionOptions";

const person = (id: string, name: string): BoardPersonOption => ({ id, name, initials: name.slice(0, 2), avatar_seed: 0 });

const people = [
  person("1", "Ernesto Afane"),
  person("2", "Amanda Carter"),
  person("3", "Allen Bailey"),
  person("4", "Kevin Smith"),
];

const names = (options: { name: string }[]) => options.map((option) => option.name);

describe("suggestMentionPeople", () => {
  it("finds a misspelled first or last name", () => {
    expect(names(suggestMentionPeople(people, "ernsto"))).toEqual(["Ernesto Afane"]);
    expect(names(suggestMentionPeople(people, "cartr"))).toEqual(["Amanda Carter"]);
    expect(names(suggestMentionPeople(people, "jhon"))).toEqual([]);
  });

  it("matches a full name with a typo in either word, still being typed", () => {
    expect(names(suggestMentionPeople(people, "amanda carterr"))).toEqual(["Amanda Carter"]);
    expect(names(suggestMentionPeople(people, "amamda car"))).toEqual(["Amanda Carter"]);
  });

  it("does not suggest someone when the second word is ordinary text", () => {
    expect(suggestMentionPeople(people, "kevin how")).toEqual([]);
    expect(suggestMentionPeople(people, "allen please")).toEqual([]);
  });
});

describe("buildMentionMatches", () => {
  it("lists exact matches first and typo matches after, marked as suggestions", () => {
    const matches = buildMentionMatches(people, "alen");
    expect(names(matches)).toEqual(["Allen Bailey"]);
    expect(isMentionSuggestion(matches[0])).toBe(true);

    const exact = buildMentionMatches(people, "amanda");
    expect(names(exact)).toEqual(["Amanda Carter"]);
    expect(isMentionSuggestion(exact[0])).toBe(false);
  });

  it("keeps matching a full name typed with a space", () => {
    expect(names(buildMentionMatches(people, "amanda car"))).toEqual(["Amanda Carter"]);
    expect(names(buildMentionMatches(people, "amanda "))).toEqual(["Amanda Carter"]);
  });
});
