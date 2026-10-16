import { useEffect, useState } from "react";
import type { MentionOption } from "./mentionOptions";

export type MentionPickerNavigation = {
  /** The matches are offered and the user has not pressed Escape on them. */
  is_open: boolean;
  /** The row the keyboard cursor sits on. */
  active_index: number;
  setActiveIndex: (index: number) => void;
  /** Hand it to the composer's `onSuggestionKeyDown`: returns true when the key was used by the picker. */
  handleKeyDown: (event: KeyboardEvent) => boolean;
};

/**
 * Keyboard cursor for the `@mention` picker: the arrows move it (wrapping),
 * Enter or Tab pick the highlighted row, Escape hides the picker until the
 * typed query changes. The editor keeps focus the whole time, so the keys
 * are claimed through the composer's key hook rather than on the list.
 */
export function useMentionPickerNavigation<TOption extends MentionOption>(
  matches: TOption[],
  onPick: (option: TOption) => void
): MentionPickerNavigation {
  const [active_index, setActiveIndex] = useState(0);
  const [is_dismissed, setIsDismissed] = useState(false);

  // A new query rebuilds the matches, so the cursor goes back to the first row and Escape stops applying.
  useEffect(() => {
    setActiveIndex(0);
    setIsDismissed(false);
  }, [matches]);

  const is_open = matches.length > 0 && !is_dismissed;

  const handleKeyDown = (event: KeyboardEvent): boolean => {
    if (!is_open) return false;
    const count = matches.length;

    if (event.key === "ArrowDown") setActiveIndex((index) => (index + 1) % count);
    else if (event.key === "ArrowUp") setActiveIndex((index) => (index - 1 + count) % count);
    else if ((event.key === "Enter" && !event.shiftKey && !event.altKey) || event.key === "Tab") onPick(matches[Math.min(active_index, count - 1)]);
    else if (event.key === "Escape") setIsDismissed(true);
    else return false;

    return true;
  };

  return { is_open, active_index, setActiveIndex, handleKeyDown };
}
