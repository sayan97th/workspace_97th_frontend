import { useState } from "react";

/**
 * Full screen state of a board drawer: expanded turns the edge drawer into a
 * large centered dialog for long updates (see `SlideOverPanel.is_expanded`).
 * Every fresh open starts as the regular drawer again. Resetting during render,
 * rather than in an effect, avoids painting one expanded frame first.
 */
export function useDrawerExpanded(is_open: boolean) {
  const [is_expanded, setIsExpanded] = useState(false);
  const [was_open, setWasOpen] = useState(is_open);
  if (was_open !== is_open) {
    setWasOpen(is_open);
    if (is_open) setIsExpanded(false);
  }
  const toggleExpanded = () => setIsExpanded((value) => !value);

  return { is_expanded, toggleExpanded };
}

export default useDrawerExpanded;
