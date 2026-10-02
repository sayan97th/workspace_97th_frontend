"use client";

import { useCallback, useState } from "react";

/** True when both lists hold the same ids, regardless of order. */
function hasSamePeople(left_ids: string[], right_ids: string[]): boolean {
  if (left_ids.length !== right_ids.length) return false;
  const right_set = new Set(right_ids);
  return left_ids.every((id) => right_set.has(id));
}

/**
 * Local, unsaved selection for a people picker (table People cell, Kanban card members,
 * Kanban drawer People fields). Ticking people only changes this draft, nothing reaches
 * the API until the picker's "Save" button commits `draft_ids` in a single request, so
 * the person assigning gets an explicit confirmation step and assignees are notified once.
 */
export function usePeopleSelectionDraft(saved_ids: string[]) {
  const [draft_ids, setDraftIds] = useState<string[]>(saved_ids);

  const togglePerson = useCallback((person_id: string) => {
    setDraftIds((current) => (current.includes(person_id) ? current.filter((id) => id !== person_id) : [...current, person_id]));
  }, []);

  const clearDraft = useCallback(() => setDraftIds([]), []);

  /** Starts the draft over from the stored value, used when a picker that stays mounted is reopened. */
  const resetDraft = useCallback((next_saved_ids: string[]) => setDraftIds(next_saved_ids), []);

  const has_changes = !hasSamePeople(draft_ids, saved_ids);

  return { draft_ids, has_changes, togglePerson, clearDraft, resetDraft };
}
