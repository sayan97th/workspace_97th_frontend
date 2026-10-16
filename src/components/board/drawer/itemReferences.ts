/** How many items the `#` picker lists at most. */
const MAX_REFERENCE_ITEMS = 9;

/** The items a `#query` matches: every word of the query must appear in the name. */
export function filterReferenceItems<TItem extends { name: string }>(items: TItem[], query: string): TItem[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => terms.every((term) => item.name.toLowerCase().includes(term))).slice(0, MAX_REFERENCE_ITEMS);
}
