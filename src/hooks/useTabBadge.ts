"use client";

import { useEffect } from "react";

// The trailing space is optional: a browser trims it when the rest of the title is empty.
const BADGE_PREFIX_PATTERN = /^\(\d+\+?\)\s*/;
const MAX_BADGE_COUNT = 99;

/** The tab title without a "(3) " unread prefix, whoever put it there. */
export const stripBadge = (title: string): string => title.replace(BADGE_PREFIX_PATTERN, "");

/**
 * Prefixes the browser tab title with the unread notification count, "(3)
 * Workspace", so the count shows on a background tab. The router rewrites
 * `document.title` on every page change, so the prefix is re-applied whenever
 * the title changes. A count of zero, or `is_enabled` off, restores the plain
 * title.
 */
export function useTabBadge(unread_count: number, is_enabled: boolean): void {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const badge = is_enabled && unread_count > 0 ? `(${unread_count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : unread_count})` : "";

    // Only writes when the title actually differs, so setting it never re-triggers the observer below.
    const apply = () => {
      const base_title = stripBadge(document.title);
      const next_title = badge && base_title ? `${badge} ${base_title}` : badge || base_title;
      if (document.title !== next_title) document.title = next_title;
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      document.title = stripBadge(document.title);
    };
  }, [unread_count, is_enabled]);
}
