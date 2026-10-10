"use client";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Whether the page runs inside a frame, for example a board opened with "Open in overlay". */
const getSnapshot = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    // A cross origin parent throws on access, which still means the page is framed.
    return true;
  }
};

const getServerSnapshot = (): boolean => false;

/**
 * True when the app is rendered inside an iframe. The admin layout then drops
 * the top bar and sidebar, so an overlay shows only the page itself. The
 * server snapshot is false, so hydration matches and the shell hides right after.
 */
export function useIsEmbedded(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
