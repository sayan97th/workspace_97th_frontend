"use client";

import { useEffect, type RefObject } from "react";

export const useOutsideClick = (
  ref: RefObject<HTMLElement | null>,
  is_active: boolean,
  onOutsideAction: () => void
): void => {
  useEffect(() => {
    if (!is_active) return;

    const handlePointerDown = (event: MouseEvent): void => {
      if (ref.current && ref.current.contains(event.target as Node)) return;
      const target = event.target as Node;
      // A nested flyout/dialog (e.g. `EditLabelsPanel`'s "..." menu or its delete
      // confirmation) portals to document.body as a sibling, so it isn't a DOM
      // descendant of `ref`. Treat clicks inside any such portal as "inside" — see
      // `BoardPopover`'s own identical check for why. Without this, a click there
      // fires this handler on `mousedown` and unmounts the whole menu (confirmation
      // dialog included) before the portaled element's own `click` handler runs.
      if (target instanceof Element && target.closest("[data-board-menu-flyout]")) return;
      onOutsideAction();
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onOutsideAction();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is_active, onOutsideAction]);
};
