/** Small fixed palette an id is deterministically hashed into — real users don't carry an avatar color from the API, so this keeps every {@link CreatorAvatar} visually distinct without inventing backend schema for it. */
const AVATAR_GRADIENTS: ReadonlyArray<readonly [string, string]> = [
  ["#e5623e", "#8a2018"],
  ["#5b7c99", "#2e4257"],
  ["#9c6ba0", "#5a347a"],
  ["#6b9c8a", "#347a5a"],
  ["#c6913b", "#7a5a34"],
  ["#4cc3e0", "#1f6b7a"],
  ["#e8a317", "#8a5a0a"],
];

/** Up to two uppercase initials from a person's full name (e.g. "Josh Moody" -> "JM"). */
export const initialsFromName = (full_name: string): string =>
  full_name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Deterministic avatar gradient for a user id, stable across renders/reloads. */
export const gradientForId = (id: number): readonly [string, string] =>
  AVATAR_GRADIENTS[Math.abs(id) % AVATAR_GRADIENTS.length];

/** "Nov 18, 2019"-style date, matching the rest of the app's board-content formatting. */
export const formatShortDate = (iso: string | null): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
