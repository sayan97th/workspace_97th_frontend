const STORAGE_KEY = "board_reaction_frequency_v1";
const QUICK_REACTION_COUNT = 7;

/** Slack's own out-of-the-box quick-reaction set — the starting point before a user has built up any reaction history of their own. */
const DEFAULT_QUICK_REACTIONS = ["👍", "🎉", "😄", "😕", "❤️", "👀"];

const readFrequencyMap = (): Record<string, number> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

/** Bumps an emoji's usage count — call only when the user picks an emoji to react with, not when merely inserting one into a message. */
export const recordReactionUsage = (emoji: string): void => {
  if (typeof window === "undefined") return;
  const counts = readFrequencyMap();
  counts[emoji] = (counts[emoji] ?? 0) + 1;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // Storage can be full or disabled (private browsing) — the quick bar just stays on the defaults.
  }
};

/** Converts a native emoji character to emoji-picker-react's "unified" id format (lowercase hex codepoints, dash-joined) — matches the library's own internal dataset keys. */
export const toUnifiedId = (emoji: string): string =>
  Array.from(emoji)
    .map((char) => char.codePointAt(0)!.toString(16))
    .join("-");

/**
 * The reaction quick bar's emoji, this user's most-used first, topped up
 * with Slack's default set so a first-time user still sees a sensible
 * starting lineup instead of an empty or sparse bar.
 */
export const getQuickReactionUnifiedIds = (): string[] => {
  const counts = readFrequencyMap();
  const by_frequency = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const merged = [...by_frequency, ...DEFAULT_QUICK_REACTIONS];
  const unique = Array.from(new Set(merged)).slice(0, QUICK_REACTION_COUNT);
  return unique.map(toUnifiedId);
};
