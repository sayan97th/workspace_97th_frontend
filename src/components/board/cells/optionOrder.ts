/**
 * Puts `options` in the order `ordered_ids` lists, the order Edit Labels saves
 * after a drag. Options missing from `ordered_ids` (a fixed blank label, or one
 * added by another tab mid drag) keep their relative order and stay in front,
 * so a stale drag never drops a label.
 */
export function reorderByIds<T extends { id: string }>(options: T[], ordered_ids: string[]): T[] {
  const options_by_id = new Map(options.map((option) => [option.id, option]));
  const ordered = ordered_ids.map((id) => options_by_id.get(id)).filter((option): option is T => option !== undefined);
  const ordered_id_set = new Set(ordered_ids);
  const unlisted = options.filter((option) => !ordered_id_set.has(option.id));
  return [...unlisted, ...ordered];
}
