"use client";
import { useEffect, useRef } from "react";
import { isTypingTarget } from "@/lib/keyboard";

export type SidebarShortcutHandlers = {
  /** Ctrl/Cmd+B. */
  onToggleSidebar: () => void;
  /** "/" outside of any text field. */
  onFocusSearch: () => void;
};

/**
 * Global keyboard shortcuts of the workspace sidebar. Both stay out of the
 * way while the person is typing, so Ctrl/Cmd+B keeps meaning "bold" inside
 * doc editors and update boxes, and "/" can still be typed.
 */
export default function useSidebarShortcuts(handlers: SidebarShortcutHandlers): void {
  // Latest handlers without re-binding the listener on every render.
  const handlers_ref = useRef(handlers);
  useEffect(() => {
    handlers_ref.current = handlers;
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || isTypingTarget(event.target)) return;

      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        handlers_ref.current.onToggleSidebar();
        return;
      }

      if (event.key === "/" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        handlers_ref.current.onFocusSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
