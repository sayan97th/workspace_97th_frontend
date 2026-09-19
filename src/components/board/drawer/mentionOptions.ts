import type { BoardPersonOption } from "../toolbar/types";

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

export const EVERYONE_MENTION_NAME = "Everyone";

/** Matches an in-progress `@partial` token at the very end of a composer's Markdown body. */
export const MENTION_TRIGGER = /@([\w]*)$/;

export const isMentionGroup = (option: MentionOption): option is MentionGroupOption => "is_group" in option;

/** Ids a picked option contributes to the draft's `mentioned_user_ids`. */
export const mentionOptionUserIds = (option: MentionOption): string[] =>
  isMentionGroup(option) ? option.member_ids : [option.id];

/**
 * The options offered for an in-progress `@query`: the "Everyone" group first
 * (when the query is a prefix of its name and there is someone besides the
 * viewer to reach), then every team whose name contains the query, then every
 * person whose name contains the query. A team reaches only its members who
 * are in `people` (so nobody outside the board), never the viewer, and is left
 * out when that leaves nobody. The backend caps a comment at 200 mentions, so
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
  const matching_people = people.filter((person) => person.name.toLowerCase().includes(needle));

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
