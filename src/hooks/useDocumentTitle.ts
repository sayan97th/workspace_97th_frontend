"use client";

import { useEffect } from "react";
import { APP_NAME } from "@/lib/page-title";
import { stripBadge } from "@/hooks/useTabBadge";

/**
 * Sets the browser tab title for a route whose name is only known on the
 * client (a board, a saved view, an open item), where the static
 * `metadata` export cannot reach because the data comes from an
 * authenticated API call. Pass `null` while the name is still loading to
 * leave the current title alone.
 *
 * The router rewrites `<title>` to the plain product name whenever the page
 * segment changes (opening or closing the item drawer is such a navigation),
 * even though the layout, and this hook, stay mounted. So the title is
 * re-applied whenever that default reappears. Any other title is left alone,
 * because it belongs to a route that has its own static title.
 *
 * When the title changes or the component unmounts, the title falls back to
 * the plain product name, but only if it is still the one this hook wrote,
 * so a route that sets its own title during the same navigation is never
 * overwritten. The unread "(3) " badge is untouched: `useTabBadge` re-applies
 * it whenever the title changes.
 */
export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    if (!title) return;

    // Only writes when the title actually differs, so setting it never re-triggers the observer below.
    const apply = () => {
      if (document.title !== title) document.title = title;
    };

    apply();

    const observer = new MutationObserver(() => {
      if (stripBadge(document.title) === APP_NAME) apply();
    });
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      if (stripBadge(document.title) === title) document.title = APP_NAME;
    };
  }, [title]);
}
