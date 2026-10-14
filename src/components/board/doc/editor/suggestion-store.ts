import { useSyncExternalStore } from "react";
import type { Range } from "@tiptap/core";

/** What a suggestion popup (the "/" block menu, the "@" people menu) needs to render. */
export type SuggestionState<T> = {
  is_open: boolean;
  items: T[];
  query: string;
  selected_index: number;
  /** The range of the typed trigger ("/hea"), replaced when an item is picked. */
  range: Range | null;
  /** Caret rectangle the popup anchors to. */
  getRect: (() => DOMRect | null) | null;
  /** Picks an item, replacing the typed trigger. */
  command: ((item: T) => void) | null;
  /** The popup was asked for its full list (the "/" menu's "More options"). */
  is_expanded: boolean;
};

export type SuggestionStore<T> = {
  getState: () => SuggestionState<T>;
  setState: (patch: Partial<SuggestionState<T>>) => void;
  subscribe: (listener: () => void) => () => void;
  close: () => void;
};

const closedState = <T,>(): SuggestionState<T> => ({
  is_open: false,
  items: [],
  query: "",
  selected_index: 0,
  range: null,
  getRect: null,
  command: null,
  is_expanded: false,
});

/**
 * A tiny external store that bridges a Tiptap `Suggestion` plugin (which
 * lives outside React and reports through `onStart/onUpdate/onExit` callbacks)
 * to the React popup that renders it via {@link useSuggestionState}. One store
 * per editor instance, created by the editor component and handed to the
 * extension through its options.
 */
export const createSuggestionStore = <T,>(): SuggestionStore<T> => {
  let state = closedState<T>();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());

  return {
    getState: () => state,
    setState: (patch) => {
      state = { ...state, ...patch };
      emit();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close: () => {
      state = closedState<T>();
      emit();
    },
  };
};

export const useSuggestionState = <T,>(store: SuggestionStore<T>): SuggestionState<T> =>
  useSyncExternalStore(store.subscribe, store.getState, store.getState);

/**
 * Shared keyboard handling for a suggestion popup: arrows move the
 * highlight (wrapping), Enter and Tab pick, Escape closes. Returns true when
 * the key was handled so the editor ignores it.
 */
export const handleSuggestionKey = <T,>(store: SuggestionStore<T>, event: KeyboardEvent, onEscape: () => void): boolean => {
  const state = store.getState();
  if (!state.is_open) return false;
  const count = state.items.length;

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    if (count === 0) return true;
    const step = event.key === "ArrowDown" ? 1 : -1;
    store.setState({ selected_index: (state.selected_index + step + count) % count });
    return true;
  }
  if (event.key === "Enter" || event.key === "Tab") {
    const item = state.items[state.selected_index];
    if (!item || !state.command) return false;
    state.command(item);
    return true;
  }
  if (event.key === "Escape") {
    onEscape();
    return true;
  }
  return false;
};
