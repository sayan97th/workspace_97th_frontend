import type { BoardPersonOption } from "../toolbar/types";
import { wordDistance } from "./fuzzyNames";

/** A picker row that mentions several people at once: "Everyone", or one of the account teams. */
export type MentionGroupOption = {
  id: string;
  /** Text inserted after the `@`, so it must read as a capitalized name for the mention highlighter to color it. */
  name: string;
  is_group: true;
  kind: "everyone" | "team";
  /** Ids of everyone the group expands to, resolved when it is picked. */
  member_ids: string[];
};

/** An account team the picker can offer as a group, with the ids of its members inside the board's workspace. */
export type MentionTeam = {
  id: string;
  name: string;
  member_ids: string[];
};

/** Anything the `@mention` picker can offer: one person, or a group of them. */
export type MentionOption = BoardPersonOption | MentionGroupOption;

/** A person offered only because their name is close to what was typed (a typo), shown under "Did you mean". */
export type MentionSuggestion = BoardPersonOption & { is_suggestion: true };

/** How many "Did you mean" rows the picker offers at most. */
const MAX_MENTION_SUGGESTIONS = 5;

export const isMentionSuggestion = (option: MentionOption): option is MentionSuggestion =>
  "is_suggestion" in option && option.is_suggestion === true;

/**
 * People whose name is close to `needle` without containing it, best first:
 * a misspelled first or last name (`ernsto`, `cartr`), or a full name with a
 * typo in either word (`amanda carterr`). With two words, both must be close,
 * the first to the first name and the second to another word of the name, so
 * `@Kevin can` does not suggest Kevin Smith.
 */
export const suggestMentionPeople = (people: BoardPersonOption[], needle: string): MentionSuggestion[] => {
  const tokens = needle.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 2) return [];
  const scored: { person: BoardPersonOption; score: number }[] = [];
  for (const person of people) {
    const words = person.name.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    let score: number | null = null;
    if (tokens.length === 1) {
      words.forEach((word, index) => {
        const distance = wordDistance(tokens[0], word);
        // A first name match ranks above the same distance on a last name.
        if (distance !== null) score = Math.min(score ?? Infinity, distance + (index > 0 ? 0.1 : 0));
      });
    } else {
      const first = wordDistance(tokens[0], words[0]);
      const rest = words.slice(1).map((word) => wordDistance(tokens[1], word)).filter((distance): distance is number => distance !== null);
      if (first !== null && rest.length > 0) score = first + Math.min(...rest);
    }
    if (score !== null) scored.push({ person, score });
  }
  return scored
    .sort((first, second) => first.score - second.score || first.person.name.localeCompare(second.person.name))
    .slice(0, MAX_MENTION_SUGGESTIONS)
    .map(({ person }) => ({ ...person, is_suggestion: true as const }));
};

export const EVERYONE_MENTION_NAME = "Everyone";

/** Matches an in-progress `@partial` token at the very end of a composer's Markdown body. */
export const MENTION_TRIGGER = /@([\w]*)$/;

/** "Name (Job title)" for a person row, the People column picker's label, or just the name when no role is set. */
export const mentionOptionLabel = (option: MentionOption): string =>
  !isMentionGroup(option) && option.job_title ? `${option.name} (${option.job_title})` : option.name;

export const isMentionGroup = (option: MentionOption): option is MentionGroupOption => "is_group" in option;

/** Ids a picked option contributes to the draft's `mentioned_user_ids`. */
export const mentionOptionUserIds = (option: MentionOption): string[] =>
  isMentionGroup(option) ? option.member_ids : [option.id];

/**
 * The options offered for an in-progress `@query`: the "Everyone" group first
 * (when the query is a prefix of its name and there is someone besides the
 * viewer to reach), then every team whose name contains the query, then every
 * person whose name contains the query, then those found only by their job
 * title. A team reaches only its members who are in `people` (so nobody
 * outside the board), never the viewer, and is left out when that leaves nobody. The backend caps a comment at 200 mentions, so
 * a group is left out of very large rosters rather than producing a request
 * that would be rejected.
 */
export function buildMentionMatches(
  people: BoardPersonOption[],
  query: string,
  current_user_id?: string,
  max_group_size = 200,
  teams: MentionTeam[] = []
): MentionOption[] {
  const needle = query.toLowerCase();
  // Name matches first, then people found only by their role, so "@seo" still reaches the SEO Specialist.
  const name_matches = people.filter((person) => person.name.toLowerCase().includes(needle));
  const role_matches = needle
    ? people.filter((person) => !name_matches.includes(person) && person.job_title?.toLowerCase().includes(needle))
    : [];
  // Then names a typo away from what was typed, Slack style, so `@Ernsto` still finds Ernesto.
  const suggestions = needle.trim()
    ? suggestMentionPeople(
        people.filter((person) => !name_matches.includes(person) && !role_matches.includes(person)),
        needle
      )
    : [];
  const matching_people: MentionOption[] = [...name_matches, ...role_matches, ...suggestions];

  const roster_ids = new Set(people.map((person) => person.id));
  const matching_teams: MentionGroupOption[] = teams
    .filter((team) => team.name.toLowerCase().includes(needle))
    .map((team) => ({
      id: `group:team:${team.id}`,
      name: team.name,
      is_group: true as const,
      kind: "team" as const,
      member_ids: team.member_ids.filter((id) => id !== current_user_id && roster_ids.has(id)),
    }))
    .filter((group) => group.member_ids.length > 0 && group.member_ids.length <= max_group_size);

  const audience = people.filter((person) => person.id !== current_user_id);
  const offers_everyone =
    audience.length > 1 &&
    audience.length <= max_group_size &&
    EVERYONE_MENTION_NAME.toLowerCase().startsWith(needle);

  if (!offers_everyone) return [...matching_teams, ...matching_people];

  const everyone: MentionGroupOption = {
    id: "group:everyone",
    name: EVERYONE_MENTION_NAME,
    is_group: true,
    kind: "everyone",
    member_ids: audience.map((person) => person.id),
  };
  return [everyone, ...matching_teams, ...matching_people];
}

/** Every name an `@mention` may use on a board: its people, its teams and "Everyone", for coloring exact mentions only. */
export const buildMentionNames = (people: readonly { name: string }[] = [], teams: readonly { name: string }[] = []): string[] => [
  EVERYONE_MENTION_NAME,
  ...teams.map((team) => team.name),
  ...people.map((person) => person.name),
];
