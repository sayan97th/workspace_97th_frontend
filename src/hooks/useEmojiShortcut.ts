"use client";
import { useEffect } from "react";

/**
 * Detects macOS's own emoji-picker chord — Control + Command + Space, the
 * shortcut macOS binds system-wide to the Character Viewer — while
 * `target_ref`'s element has focus, and calls `onTrigger` instead of letting
 * the keystroke fall through to the OS. Lets any of this app's text inputs
 * (tab/column/group/item names, comment drafts, nav item labels, ...) offer
 * the in-app emoji picker through the exact muscle memory users already have
 * for the native one, without every call site wiring its own `keydown`
 * listener.
 *
 * Reads `event.code` (not `event.key`) for the Space check so it still
 * matches once a modifier has already shifted `key` on some layouts.
 */
export function useEmojiShortcut<T extends HTMLElement>(
  target_ref: React.RefObject<T | null>,
  onTrigger: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;
    const target_el = target_ref.current;
    if (!target_el) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const is_emoji_chord = event.ctrlKey && event.metaKey && event.code === "Space";
      if (!is_emoji_chord) return;
      event.preventDefault();
      onTrigger();
    };

    target_el.addEventListener("keydown", handleKeyDown);
    return () => target_el.removeEventListener("keydown", handleKeyDown);
  }, [target_ref, onTrigger, enabled]);
}
