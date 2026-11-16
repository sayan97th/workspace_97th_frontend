/**
 * Whether someone may be newly picked in a People, mention or Notify picker on a board: an active
 * account that was added to the board. People who fail it still render on the cells they are
 * already assigned to, they are only left out of the lists.
 */
export const isAssignablePerson = (person: { is_deactivated?: boolean; is_outside_board?: boolean }): boolean =>
  !person.is_deactivated && !person.is_outside_board;

/**
 * Whether someone shown on a private board cannot open it: assigned in a People or Reporter column
 * before the board went private, or the creator of an item moved in from another board. They keep
 * showing, but are never notified. Deactivated accounts already have their own look.
 */
export const hasNoBoardAccess = (
  person: { is_deactivated?: boolean; is_outside_board?: boolean } | undefined,
  is_private_board: boolean
): boolean => Boolean(is_private_board && person && person.is_outside_board && !person.is_deactivated);

/** The hover text of a person without access to a private board. */
export const getNoAccessTitle = (name: string): string => `${name} has no access to this private board and is not notified`;
