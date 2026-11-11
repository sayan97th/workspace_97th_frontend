import type { DrawerReaction } from "./types";

/**
 * Bumps (or removes) a single emoji's reaction pill, toggling whether the
 * current user reacted with it. A comment can carry any number of these in
 * parallel, one per distinct emoji. Calling it a second time with the same
 * emoji reverts it, which is how a failed request rolls back.
 */
export const bumpReaction = (reactions: DrawerReaction[], emoji: string): DrawerReaction[] => {
  const index = reactions.findIndex((reaction) => reaction.emoji === emoji);
  if (index === -1) return [...reactions, { emoji, count: 1, reacted_by_me: true, reactor_names: ["You"] }];
  const current = reactions[index];
  const next_reacted_by_me = !current.reacted_by_me;
  const next_count = current.count + (next_reacted_by_me ? 1 : -1);
  if (next_count <= 0) return reactions.filter((_, existing_index) => existing_index !== index);
  const next_reactor_names = next_reacted_by_me
    ? [...current.reactor_names, "You"]
    : current.reactor_names.filter((name) => name !== "You");
  return reactions.map((reaction, existing_index) =>
    existing_index === index
      ? { ...reaction, count: next_count, reacted_by_me: next_reacted_by_me, reactor_names: next_reactor_names, reactors: undefined }
      : reaction
  );
};
