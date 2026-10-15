"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent, type FocusEvent, type MouseEvent, type RefObject } from "react";

/** True for elements the user types into: inputs that take text, textareas and contenteditable regions. */
export function isTextEntryElement(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el instanceof HTMLTextAreaElement) return true;
  if (!(el instanceof HTMLInputElement)) return false;
  return !["checkbox", "radio", "button", "submit", "reset", "file", "color", "range", "image"].includes(el.type);
}

/**
 * A table row is a native `draggable` element so it can be reordered, but a
 * draggable ancestor hijacks mouse drags inside its text fields: pressing in
 * an input and moving the mouse starts a row move instead of selecting text.
 * This hook locks the row's drag while one of its text fields has focus, and
 * cancels any drag whose gesture began inside a text field as a fallback for
 * browsers that decide the drag source on mousedown.
 *
 * `row_ref` must point at the `draggable` element itself.
 */
export function useTextEntryDragLock(row_ref: RefObject<HTMLElement | null>) {
  const [is_text_entry_focused, setIsTextEntryFocused] = useState(false);
  const pointer_in_text_entry_ref = useRef(false);

  // A focused field that unmounts (Enter, Escape, or a cell editor closing)
  // never fires `blur`, so after every render drop the lock once focus is no
  // longer on a text field inside the row.
  useEffect(() => {
    if (!is_text_entry_focused) return;
    const active_el = document.activeElement;
    if (!isTextEntryElement(active_el) || !row_ref.current?.contains(active_el)) setIsTextEntryFocused(false);
  });

  const onFocusCapture = useCallback((e: FocusEvent<HTMLElement>) => {
    if (isTextEntryElement(e.target)) setIsTextEntryFocused(true);
  }, []);

  const onBlurCapture = useCallback((e: FocusEvent<HTMLElement>) => {
    if (isTextEntryElement(e.target)) setIsTextEntryFocused(false);
  }, []);

  const onMouseDownCapture = useCallback((e: MouseEvent<HTMLElement>) => {
    pointer_in_text_entry_ref.current = isTextEntryElement(e.target);
  }, []);

  /** Returns true (after cancelling the native drag) when the gesture began inside a text field. */
  const shouldCancelDrag = useCallback((e: DragEvent<HTMLElement>) => {
    if (!pointer_in_text_entry_ref.current) return false;
    e.preventDefault();
    return true;
  }, []);

  return {
    is_text_entry_focused,
    shouldCancelDrag,
    lock_handlers: { onFocusCapture, onBlurCapture, onMouseDownCapture },
  };
}
