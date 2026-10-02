"use client";

import { forwardRef, useRef, useState } from "react";

/** Matches `config.options.*.label`'s `max:255` rule in the API's column requests. */
export const OPTION_LABEL_MAX_LENGTH = 255;

interface OptionLabelInputProps {
  value: string;
  /** Called once per edit, on blur or Enter, with the trimmed label. Never called for an empty or unchanged label. */
  onCommit: (label: string) => void;
  className?: string;
  aria_label?: string;
}

/**
 * Text input for renaming a status/label/dropdown option.
 *
 * The label is typed into a local draft and only committed on blur or Enter,
 * never per keystroke. Committing on every change used to send one column
 * PATCH per letter: responses landing out of order replaced the column with
 * an older label (letters vanished mid typing), and the API's `TrimStrings`
 * middleware echoed back "Need " as "Need", so a trailing space could never
 * be typed. Escape restores the saved label.
 */
const OptionLabelInput = forwardRef<HTMLInputElement, OptionLabelInputProps>(function OptionLabelInput(
  { value, onCommit, className, aria_label },
  ref
) {
  const [draft, setDraft] = useState(value);
  const [is_focused, setIsFocused] = useState(false);
  const [synced_value, setSyncedValue] = useState(value);
  const is_cancelling_ref = useRef(false);

  // Picks up a rename that lands from elsewhere (server echo, another tab)
  // while the user is not typing here, without clobbering an in-progress draft.
  if (!is_focused && value !== synced_value) {
    setSyncedValue(value);
    setDraft(value);
  }

  const commitDraft = () => {
    const label = draft.trim();
    if (!label) {
      setDraft(synced_value);
      return;
    }
    if (label !== draft) setDraft(label);
    // Compared against the label this edit started from, so blurring an
    // untouched input never reverts a rename that landed meanwhile.
    if (label !== synced_value) onCommit(label);
  };

  return (
    <input
      ref={ref}
      value={draft}
      maxLength={OPTION_LABEL_MAX_LENGTH}
      aria-label={aria_label}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
        if (is_cancelling_ref.current) {
          is_cancelling_ref.current = false;
          return;
        }
        commitDraft();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          // Keeps the surrounding popover/modal open, Escape only cancels this edit.
          e.stopPropagation();
          is_cancelling_ref.current = true;
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
      className={className}
    />
  );
});

export default OptionLabelInput;
