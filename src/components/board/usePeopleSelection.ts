"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Live selection for a people picker (table People cell, Kanban item card, Kanban card
 * members, Kanban drawer People fields). Every pick, removal or clear is committed right
 * away through `onChange`, like monday.com, so there is no "Save" step to confirm.
 *
 * The picker keeps its own copy of the ids (and a ref to it), so several quick clicks
 * build on each other even before the parent re-renders with the stored value.
 */
export function usePeopleSelection(saved_ids: string[], onChange: (person_ids: string[]) => void) {
  const [selected_ids, setSelectedIds] = useState<string[]>(saved_ids);
  const selected_ids_ref = useRef<string[]>(saved_ids);

  const commitSelection = useCallback(
    (next_ids: string[]) => {
      selected_ids_ref.current = next_ids;
      setSelectedIds(next_ids);
      onChange(next_ids);
    },
    [onChange]
  );

  const togglePerson = useCallback(
    (person_id: string) => {
      const current = selected_ids_ref.current;
      commitSelection(current.includes(person_id) ? current.filter((id) => id !== person_id) : [...current, person_id]);
    },
    [commitSelection]
  );

  const clearSelection = useCallback(() => {
    if (selected_ids_ref.current.length > 0) commitSelection([]);
  }, [commitSelection]);

  /** Starts over from the stored value, used when a picker that stays mounted is reopened. */
  const resetSelection = useCallback((next_saved_ids: string[]) => {
    selected_ids_ref.current = next_saved_ids;
    setSelectedIds(next_saved_ids);
  }, []);

  return { selected_ids, togglePerson, clearSelection, resetSelection };
}
