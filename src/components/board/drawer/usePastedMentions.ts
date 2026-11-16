"use client";
import { useEffect, useRef, useState } from "react";
import type { BoardPersonOption } from "../toolbar/types";
import { hasMentionText } from "./pastedMentions";

/**
 * The people pasted text tagged in one composer, for `PastedMentionsNotice`.
 * A tag only lasts while its `@Name` is still in `markdown`: deleting the
 * text (or sending the draft, which clears it) drops it and hands it to
 * `onDropped`, so the composer stops mentioning that person too.
 */
export function usePastedMentions(markdown: string, onDropped?: (people: BoardPersonOption[]) => void) {
  const [pasted_people, setPastedPeople] = useState<BoardPersonOption[]>([]);
  const [is_dismissed, setIsDismissed] = useState(false);
  const dropped_ref = useRef(onDropped);

  useEffect(() => {
    dropped_ref.current = onDropped;
  });

  useEffect(() => {
    if (pasted_people.length === 0) return;
    const dropped = pasted_people.filter((person) => !hasMentionText(markdown, person.name));
    if (dropped.length === 0) return;
    setPastedPeople((current) => current.filter((person) => !dropped.includes(person)));
    dropped_ref.current?.(dropped);
  }, [markdown, pasted_people]);

  /** Adds the people a paste tagged and shows the notice again, even if an earlier one was dismissed. */
  const addPastedPeople = (people: BoardPersonOption[]) => {
    if (people.length === 0) return;
    setPastedPeople((current) => [...current, ...people.filter((person) => !current.some((existing) => existing.id === person.id))]);
    setIsDismissed(false);
  };

  return {
    pasted_people,
    /** Who the notice lists, empty once dismissed. */
    notice_people: is_dismissed ? [] : pasted_people,
    addPastedPeople,
    dismissNotice: () => setIsDismissed(true),
  };
}
