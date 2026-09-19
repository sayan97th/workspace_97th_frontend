import type { BoardPersonOption } from "../toolbar/types";

/** A picker row that mentions several people at once, currently only "Everyone". */
export type MentionGroupOption = {
  id: string;
  /** Text inserted after the `@`, so it must read as a capitalized name for the mention highlighter to color it. */
  name: string;
  is_group: true;
  /** Ids of everyone the group expands to, resolved when it is picked. */
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
 * viewer to reach), then every person whose name contains the query. The
 * backend caps a comment at 200 mentions, so the group is left out of very
 * large rosters rather than producing a request that would be rejected.
 */
export function buildMentionMatches(
  people: BoardPersonOption[],
  query: string,
  current_user_id?: string,
  max_group_size = 200
): MentionOption[] {
  const needle = query.toLowerCase();
  const matching_people = people.filter((person) => person.name.toLowerCase().includes(needle));

  const audience = people.filter((person) => person.id !== current_user_id);
  const offers_everyone =
    audience.length > 1 &&
    audience.length <= max_group_size &&
    EVERYONE_MENTION_NAME.toLowerCase().startsWith(needle);

  if (!offers_everyone) return matching_people;

  const everyone: MentionGroupOption = {
    id: "group:everyone",
    name: EVERYONE_MENTION_NAME,
    is_group: true,
    member_ids: audience.map((person) => person.id),
  };
  return [everyone, ...matching_people];
}
