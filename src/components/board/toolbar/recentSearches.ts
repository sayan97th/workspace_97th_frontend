/**
 * The viewer's recent board searches, kept in this browser only. A per viewer
 * convenience: storage can be empty or blocked, which just means no history.
 */

const MAX_RECENT_SEARCHES = 6;
/** Shorter queries are usually mid-typing, not worth remembering. */
const MIN_QUERY_LENGTH = 2;

export function readRecentSearches(storage_key: string): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storage_key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

/** Moves `query` to the top of the list (deduplicated, case insensitive) and returns the new list. */
export function rememberSearch(storage_key: string, query: string): string[] {
  const trimmed_query = query.trim();
  const current = readRecentSearches(storage_key);
  if (trimmed_query.length < MIN_QUERY_LENGTH) return current;
  const next = [trimmed_query, ...current.filter((entry) => entry.toLowerCase() !== trimmed_query.toLowerCase())].slice(
    0,
    MAX_RECENT_SEARCHES
  );
  try {
    window.localStorage.setItem(storage_key, JSON.stringify(next));
  } catch {
    // Blocked storage: the list lasts for this page only.
  }
  return next;
}

export function clearRecentSearches(storage_key: string): void {
  try {
    window.localStorage.removeItem(storage_key);
  } catch {
    // Nothing to clear when storage is blocked.
  }
}
