import type { User } from "@/types/auth";

/**
 * Human-friendly display name for a user, preferring the API-provided
 * `full_name` and falling back to the name parts or the email handle.
 */
export const getUserDisplayName = (user: User | null | undefined): string => {
  if (!user) return "Guest";

  const full_name = user.full_name?.trim();
  if (full_name) return full_name;

  const parts = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  if (parts) return parts;

  return user.email?.split("@")[0] ?? "Guest";
};

/**
 * Up to two uppercase initials derived from the user's name (or email as a
 * last resort). Used by the avatar fallback when there is no profile photo.
 */
export const getUserInitials = (user: User | null | undefined): string => {
  if (!user) return "?";

  const source = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim() || user.full_name?.trim() || user.email?.split("@")[0] || "";

  const words = source.split(/[\s._-]+/).filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};
