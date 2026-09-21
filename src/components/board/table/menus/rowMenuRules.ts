/** Why a root item's "Convert to subitem" row is unavailable, or undefined when it can be used. */
export function getConvertDisabledReason(params: { is_sub: boolean; blocked_reason?: string; target_count: number }): string | undefined {
  // A subitem always converts straight to an item.
  if (params.is_sub) return undefined;
  if (params.blocked_reason) return params.blocked_reason;
  return params.target_count === 0 ? "There is no other item to convert this into" : undefined;
}

/** Why an item can't become a subitem: the board only nests two levels, so an item that already has subitems has to be emptied first. */
export function getConvertBlockedReason(subitem_count: number): string | undefined {
  return subitem_count > 0 ? "Move or delete its subitems first" : undefined;
}
