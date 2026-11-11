"use client";
import { useCallback, useSyncExternalStore } from "react";

/** Where the viewer's choice is kept, so the toolbar stays the way they left it. */
const STORAGE_KEY = "feed_composer_toolbar_hidden";

const listeners = new Set<() => void>();

const readIsHidden = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    // Storage blocked (private window, disabled site data): the toolbar just starts shown.
    return false;
  }
};

const writeIsHidden = (is_hidden: boolean): void => {
  try {
    if (is_hidden) window.localStorage.setItem(STORAGE_KEY, "true");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Not saved, the choice still applies until the page reloads through the in memory fallback below.
  }
};

// In memory copy, so the toggle works even when storage can't be written.
let is_hidden_snapshot: boolean | null = null;

const getSnapshot = (): boolean => {
  if (is_hidden_snapshot === null) is_hidden_snapshot = readIsHidden();
  return is_hidden_snapshot;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * Whether the Update feed reply boxes show the formatting toolbar, shared by
 * every reply box on screen and remembered per browser. Shown by default,
 * the "Format" button hides it for a plain, Slack like box.
 */
export function useFeedComposerToolbar() {
  const is_hidden = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const toggleToolbar = useCallback(() => {
    is_hidden_snapshot = !getSnapshot();
    writeIsHidden(is_hidden_snapshot);
    listeners.forEach((listener) => listener());
  }, []);

  return { is_toolbar_shown: !is_hidden, toggleToolbar };
}
