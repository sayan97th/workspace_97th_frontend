import type { BoardPersonOption } from "../toolbar/types";
import { formatReactorNames } from "./reactionFormatting";
import type { DrawerReply } from "./types";

/** The likes and reactions of one comment or reply, everything the Reactions card needs. */
export type ReactionSource = Pick<DrawerReply, "liked_by_me" | "like_count" | "likers" | "reactions">;

/** `"all"`, `"like"` or an emoji. */
export type ReactionTabKey = string;

export const ALL_TAB: ReactionTabKey = "all";
export const LIKE_TAB: ReactionTabKey = "like";

export type ReactionTab = {
  key: ReactionTabKey;
  kind: "all" | "like" | "emoji";
  count: number;
};

/** One emoji a person reacted with. */
export type PersonReaction = { emoji: string; reacted_at?: string };

/** One person and everything they did on the comment, the Like and every emoji. */
export type ReactionPersonRow = {
  person: BoardPersonOption;
  is_you: boolean;
  has_liked: boolean;
  liked_at?: string;
  reactions: PersonReaction[];
  /** Their most recent like or reaction, ISO, used to sort the newest first. */
  latest_at?: string;
};

const YOU_LABEL = "You";

const laterOf = (first?: string, second?: string): string | undefined => {
  if (!first) return second;
  if (!second) return first;
  return new Date(first).getTime() >= new Date(second).getTime() ? first : second;
};

const nameOnlyPerson = (name: string, index: number): BoardPersonOption => ({
  id: `name-${name}-${index}`,
  name,
  initials: name.slice(0, 1).toUpperCase(),
  avatar_seed: index + 1,
});

/**
 * Merges the likers and every emoji's reactors into one row per person, so
 * the Reactions card can show who did what at a glance. A reaction the
 * server has not confirmed yet only carries names, the current user's own
 * one ("You") is matched back to `current_user` so it still gets an avatar.
 */
export const buildReactionPeople = (source: ReactionSource, current_user: BoardPersonOption): ReactionPersonRow[] => {
  const rows = new Map<string, ReactionPersonRow>();

  const rowFor = (person: BoardPersonOption): ReactionPersonRow => {
    const existing = rows.get(person.id);
    if (existing) return existing;
    const row: ReactionPersonRow = { person, is_you: person.id === current_user.id, has_liked: false, reactions: [] };
    rows.set(person.id, row);
    return row;
  };

  const likers = source.likers ?? [];
  likers.forEach((liker) => {
    const row = rowFor(liker);
    row.has_liked = true;
    row.liked_at = liker.liked_at;
    row.latest_at = laterOf(row.latest_at, liker.liked_at);
  });
  // A like the list does not know about yet (an older payload), still show the current user.
  if (source.liked_by_me && !likers.some((liker) => liker.id === current_user.id)) rowFor(current_user).has_liked = true;

  source.reactions.forEach((reaction) => {
    const people =
      reaction.reactors && reaction.reactors.length > 0
        ? reaction.reactors.map((reactor) => ({ person: reactor as BoardPersonOption, reacted_at: reactor.reacted_at }))
        : reaction.reactor_names.map((name, index) => ({
            person: name === YOU_LABEL ? current_user : nameOnlyPerson(name, index),
            reacted_at: undefined,
          }));

    people.forEach(({ person, reacted_at }) => {
      const row = rowFor(person);
      if (row.reactions.some((existing) => existing.emoji === reaction.emoji)) return;
      row.reactions.push({ emoji: reaction.emoji, reacted_at });
      row.latest_at = laterOf(row.latest_at, reacted_at);
    });
  });

  // Newest activity first, people without a known time (fresh, optimistic) go on top since they just acted.
  return [...rows.values()].sort((first, second) => {
    if (!first.latest_at) return -1;
    if (!second.latest_at) return 1;
    return new Date(second.latest_at).getTime() - new Date(first.latest_at).getTime();
  });
};

/** "All", then "Like" when anyone liked it, then one tab per emoji in the order the pills show. */
export const buildReactionTabs = (source: ReactionSource, rows: ReactionPersonRow[]): ReactionTab[] => {
  const tabs: ReactionTab[] = [{ key: ALL_TAB, kind: "all", count: rows.length }];
  const like_count = rows.filter((row) => row.has_liked).length;
  if (like_count > 0) tabs.push({ key: LIKE_TAB, kind: "like", count: like_count });
  source.reactions.forEach((reaction) => {
    const count = rows.filter((row) => row.reactions.some((item) => item.emoji === reaction.emoji)).length;
    if (count > 0) tabs.push({ key: reaction.emoji, kind: "emoji", count });
  });
  return tabs;
};

export const filterRowsByTab = (rows: ReactionPersonRow[], tab: ReactionTabKey): ReactionPersonRow[] => {
  if (tab === ALL_TAB) return rows;
  if (tab === LIKE_TAB) return rows.filter((row) => row.has_liked);
  return rows.filter((row) => row.reactions.some((reaction) => reaction.emoji === tab));
};

/** "You, Haley Riemenschneider and 2 others", the current user always first. */
export const formatReactionPeopleNames = (rows: ReactionPersonRow[]): string => {
  const ordered = [...rows.filter((row) => row.is_you), ...rows.filter((row) => !row.is_you)];
  return formatReactorNames(ordered.map((row) => (row.is_you ? YOU_LABEL : row.person.name)));
};
