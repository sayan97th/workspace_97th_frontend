/**
 * Whether someone may be newly picked in a People, mention or Notify picker on a board: an active
 * account that was added to the board. People who fail it still render on the cells they are
 * already assigned to, they are only left out of the lists.
 */
export const isAssignablePerson = (person: { is_deactivated?: boolean; is_outside_board?: boolean }): boolean =>
  !person.is_deactivated && !person.is_outside_board;
