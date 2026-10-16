"use client";
import React, { useEffect, useRef, useState } from "react";
import "./board-drawer.css";

export type SlideOverPanelProps = {
  is_open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Extra classes for the panel, usually just its width. Surface, border, shadow and type come from `board-drawer.css`. */
  panel_class_name?: string;
  /** Extra classes for the backdrop. Defaults to the shared board drawer scrim. */
  overlay_class_name?: string;
  /** Accessible name of the drawer dialog. */
  aria_label?: string;
  /** Turns the edge drawer into a large centered dialog (wider screens only, phones stay full screen). */
  is_expanded?: boolean;
};

const TRANSITION_DURATION_MS = 260;

/**
 * Right edge slide over shell shared by every board drawer (`BoardItemDrawer`,
 * `BoardDiscussionDrawer`, `BoardActivityLogDrawer`, `UserDetailsDrawer`):
 * fades the backdrop in and out, slides the panel in and out from the right,
 * and closes on Escape.
 *
 * Stays mounted for one extra `TRANSITION_DURATION_MS` after `is_open` flips
 * to `false` so the close has something to animate. Callers should pair
 * this with {@link useLatchWhileOpen} so the panel keeps showing its last
 * row's content while it slides away, instead of going blank mid animation.
 */
function SlideOverPanel({
  is_open,
  onClose,
  children,
  panel_class_name = "",
  overlay_class_name = "",
  aria_label,
  is_expanded = false,
}: SlideOverPanelProps) {
  const [is_mounted, setIsMounted] = useState(is_open);
  const [is_visible, setIsVisible] = useState(false);
  const panel_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (is_open) {
      setIsMounted(true);
      // A single `requestAnimationFrame` isn't reliable here: React can batch
      // the `is_visible` flip into the same frame as the `is_mounted` one, so
      // the browser never paints the off screen state and has nothing to
      // transition from. A double rAF lets the off screen frame paint first.
      let inner_raf_id = 0;
      const outer_raf_id = requestAnimationFrame(() => {
        inner_raf_id = requestAnimationFrame(() => setIsVisible(true));
      });
      return () => {
        cancelAnimationFrame(outer_raf_id);
        cancelAnimationFrame(inner_raf_id);
      };
    }
    setIsVisible(false);
    const timeout_id = setTimeout(() => setIsMounted(false), TRANSITION_DURATION_MS);
    return () => clearTimeout(timeout_id);
  }, [is_open]);

  // Focus the panel once it is in, so Escape and Tab start inside it.
  useEffect(() => {
    if (is_visible) panel_ref.current?.focus({ preventScroll: true });
  }, [is_visible]);

  // Escape closes the drawer, unless something inside it already handled the
  // key (an inline editor cancelling) or focus sits in another dialog on top of
  // it. Popovers stop the key at `document`, so this window listener never sees theirs.
  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const panel_el = panel_ref.current;
      const active_element = document.activeElement;
      const is_inside_panel = !active_element || active_element === document.body || panel_el?.contains(active_element);
      if (!is_inside_panel) return;
      // First Escape leaves a focused field, the next one closes the drawer.
      if (
        active_element instanceof HTMLElement &&
        active_element !== panel_el &&
        active_element.matches("input, textarea, select, [contenteditable='true']")
      ) {
        active_element.blur();
        panel_el?.focus({ preventScroll: true });
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, onClose]);

  if (!is_mounted) return null;

  return (
    <>
      <div onClick={onClose} data-visible={is_visible || undefined} className={`board-drawer-backdrop ${overlay_class_name}`} />
      <div
        ref={panel_ref}
        role="dialog"
        aria-modal="true"
        aria-label={aria_label}
        tabIndex={-1}
        data-visible={is_visible || undefined}
        data-expanded={is_expanded || undefined}
        className={`board-drawer ${panel_class_name}`}
      >
        {children}
      </div>
    </>
  );
}

export default SlideOverPanel;
