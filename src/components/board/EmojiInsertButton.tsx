"use client";
import React, { useRef, useState } from "react";
import { ReactSmileyIcon } from "@/icons/drawer-icons";
import { spliceTextAtCursor } from "@/utils/insertTextAtCursor";
import EmojiPalette from "./drawer/EmojiPalette";

export type EmojiInsertButtonProps = {
  /** The controlled text input this button inserts an emoji into. */
  input_ref: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (next_value: string) => void;
  /**
   * Fires whenever the picker popover opens/closes. A caller whose input
   * commits or cancels on blur (`InlineTitleEditor`, `EditableName`) must
   * use this to suppress that while `true`: clicking an emoji tile is a
   * click on a portaled element outside the input, which blurs it before
   * `onChange` below has a chance to apply the insertion, so an unguarded
   * blur-commit would collapse the edit and discard the emoji.
   */
  onOpenChange?: (is_open: boolean) => void;
  size?: number;
  className?: string;
};

/**
 * A small "insert emoji" trigger + themed picker popover, for splicing an
 * emoji into an arbitrary controlled text input at the caret position
 * rather than only appending it to the end. Lets a view tab, sidebar item,
 * or task name carry an emoji anywhere inside its text, e.g. "Main table 🌟"
 * or "🌟 VIP client", not just as a fixed prefix icon.
 *
 * Modeled on the inline emoji-insert pattern already used for comment
 * drafts in `CommentComposer.tsx`, generalized to any single-line input.
 *
 * Cursor position is captured on the trigger's `onMouseDown` (not `onClick`)
 * with `preventDefault()`, because `mousedown` fires before the browser
 * would otherwise blur the input, so `selectionStart` is still valid at
 * read time and the trigger button itself never blurs the input. Picking an
 * emoji from the popover's grid still blurs it (that grid is a separate,
 * portaled element this component doesn't control), which is what
 * `onOpenChange` exists to guard against — see its doc comment above.
 */
const EmojiInsertButton: React.FC<EmojiInsertButtonProps> = ({ input_ref, value, onChange, onOpenChange, size = 13, className = "" }) => {
  const trigger_ref = useRef<HTMLButtonElement>(null);
  const cursor_ref = useRef(value.length);
  const [is_open, setIsOpen] = useState(false);

  const open = () => {
    setIsOpen(true);
    onOpenChange?.(true);
  };
  const close = () => {
    setIsOpen(false);
    onOpenChange?.(false);
  };

  const handlePick = (emoji: string) => {
    const { next_text, next_cursor } = spliceTextAtCursor(value, emoji, cursor_ref.current);
    onChange(next_text);
    requestAnimationFrame(() => {
      input_ref.current?.focus();
      input_ref.current?.setSelectionRange(next_cursor, next_cursor);
    });
  };

  // No hardcoded `relative` here: every call site positions this whole unit
  // itself (typically `absolute ...` against its own already-relative
  // editor wrapper), and Tailwind's fixed utility ordering makes a baked-in
  // `.relative` win over a caller-supplied `.absolute` on the same element
  // regardless of class string order, silently breaking that positioning.
  return (
    <span className={`inline-flex ${className}`}>
      <button
        ref={trigger_ref}
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          cursor_ref.current = input_ref.current?.selectionStart ?? value.length;
          open();
        }}
        aria-label="Insert emoji"
        title="Insert emoji"
        className="flex items-center justify-center rounded text-shell-text-faint transition-colors hover:bg-shell-hover hover:text-shell-text-secondary"
      >
        <ReactSmileyIcon size={size} />
      </button>
      <EmojiPalette anchor_el={trigger_ref.current} is_open={is_open} onClose={close} onPick={handlePick} mode="insert" />
    </span>
  );
};

export default EmojiInsertButton;
