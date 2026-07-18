"use client";
import React, { useEffect, useRef, useState } from "react";

export type InlineTitleEditorProps = {
  /** The current value shown when the editor mounts. */
  value: string;
  /** Called with the trimmed, changed, non-empty value on Enter or blur. */
  onCommit: (value: string) => void;
  /** Called when editing is dismissed without a valid change (Escape, or blur while empty/unchanged). */
  onCancel: () => void;
  /** Extra classes merged onto the input (colour, font weight, etc. per call-site). */
  className?: string;
  /** Inline styles merged onto the input (e.g. group accent colour, max width). */
  style?: React.CSSProperties;
  /** Placeholder shown while the field is empty. */
  placeholder?: string;
  /** Accessible label for screen readers (the field has no visible label). */
  aria_label?: string;
  /** Selects the whole value on focus so typing replaces it. Defaults to true. */
  select_on_focus?: boolean;
};

/**
 * A single-line, focus-on-mount text input for renaming something in place —
 * board group titles, column headers, and any other "click the label to edit
 * it" surface. It owns only its draft text; the parent owns the underlying
 * value and decides what a commit means.
 *
 * Commit contract (shared with the rest of the board kit's inline inputs):
 * Enter or blur commits the trimmed value, but only when it's non-empty AND
 * different from the original — otherwise it cancels without calling
 * `onCommit`. Escape always cancels.
 */
const InlineTitleEditor: React.FC<InlineTitleEditorProps> = ({
  value,
  onCommit,
  onCancel,
  className = "",
  style,
  placeholder,
  aria_label,
  select_on_focus = true,
}) => {
  const [draft, setDraft] = useState(value);
  const input_ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input_ref.current?.focus();
    if (select_on_focus) input_ref.current?.select();
  }, [select_on_focus]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
    else onCancel();
  };

  return (
    <input
      ref={input_ref}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        } else if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      onBlur={commit}
      placeholder={placeholder}
      aria-label={aria_label}
      className={`rounded-[6px] border border-brand-500 bg-shell-bg px-2 py-1 outline-none ${className}`}
      style={style}
    />
  );
};

export default InlineTitleEditor;
