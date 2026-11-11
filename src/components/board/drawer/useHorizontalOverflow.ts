"use client";
import { useCallback, useEffect, useState, type RefObject } from "react";

/** How far one arrow click scrolls, as a share of the visible width. */
const ARROW_SCROLL_RATIO = 0.7;
/** Leeway for sub pixel scroll positions, so an edge never counts as "a bit more to go". */
const EDGE_TOLERANCE_PX = 2;
/** How far the mouse must move with the button held before it counts as a drag instead of a click. */
const DRAG_THRESHOLD_PX = 4;

export type HorizontalOverflow = {
  /** There is hidden content to the left. */
  can_scroll_start: boolean;
  /** There is hidden content to the right. */
  can_scroll_end: boolean;
  /** Scrolls one step left (-1) or right (1). */
  scrollByStep: (direction: -1 | 1) => void;
  /** True while the strip is being dragged with the mouse, for the grabbing cursor. */
  is_dragging: boolean;
};

/**
 * Tracks whether a horizontally scrolling strip (the Reactions card tabs)
 * has hidden content on either side, so the strip can show fades and
 * arrows only where there is more to see. A vertical mouse wheel scrolls it
 * sideways too, since most mice have no horizontal wheel, and holding the
 * mouse button down drags it sideways. A drag never selects the tab it
 * started on, a plain click still does. Touch keeps the native swipe.
 */
export function useHorizontalOverflow(ref: RefObject<HTMLElement | null>, watch: unknown): HorizontalOverflow {
  const [can_scroll_start, setCanScrollStart] = useState(false);
  const [can_scroll_end, setCanScrollEnd] = useState(false);
  const [is_dragging, setIsDragging] = useState(false);

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    setCanScrollStart(node.scrollLeft > EDGE_TOLERANCE_PX);
    setCanScrollEnd(node.scrollLeft + node.clientWidth < node.scrollWidth - EDGE_TOLERANCE_PX);
  }, [ref]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    measure();

    const onWheel = (event: WheelEvent) => {
      // Let a real horizontal gesture (trackpad, shift + wheel) through untouched.
      if (Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      if (node.scrollWidth <= node.clientWidth) return;
      event.preventDefault();
      node.scrollLeft += event.deltaY;
    };

    // Mouse drag to scroll. Pointer capture only starts once the drag passes the threshold, so a click stays a click.
    let drag: { pointer_id: number; start_x: number; start_scroll: number; has_moved: boolean } | null = null;
    let should_swallow_click = false;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      if (node.scrollWidth <= node.clientWidth) return;
      drag = { pointer_id: event.pointerId, start_x: event.clientX, start_scroll: node.scrollLeft, has_moved: false };
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointer_id) return;
      const distance = event.clientX - drag.start_x;
      if (!drag.has_moved) {
        if (Math.abs(distance) < DRAG_THRESHOLD_PX) return;
        drag.has_moved = true;
        node.setPointerCapture(event.pointerId);
        setIsDragging(true);
      }
      event.preventDefault();
      node.scrollLeft = drag.start_scroll - distance;
    };

    const endDrag = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointer_id) return;
      should_swallow_click = drag.has_moved;
      if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
      drag = null;
      setIsDragging(false);
    };

    // The click that ends a drag would select whatever tab is under the mouse, drop it.
    const onClickCapture = (event: MouseEvent) => {
      if (!should_swallow_click) return;
      should_swallow_click = false;
      event.preventDefault();
      event.stopPropagation();
    };

    // Native image and text drag would fight the sideways drag.
    const onDragStart = (event: DragEvent) => event.preventDefault();

    const resize_observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    resize_observer?.observe(node);
    node.addEventListener("scroll", measure, { passive: true });
    node.addEventListener("wheel", onWheel, { passive: false });
    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("pointermove", onPointerMove);
    node.addEventListener("pointerup", endDrag);
    node.addEventListener("pointercancel", endDrag);
    node.addEventListener("click", onClickCapture, true);
    node.addEventListener("dragstart", onDragStart);
    return () => {
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("pointermove", onPointerMove);
      node.removeEventListener("pointerup", endDrag);
      node.removeEventListener("pointercancel", endDrag);
      node.removeEventListener("click", onClickCapture, true);
      node.removeEventListener("dragstart", onDragStart);
      resize_observer?.disconnect();
      node.removeEventListener("scroll", measure);
      node.removeEventListener("wheel", onWheel);
    };
    // `watch` re-measures when the tabs themselves change (a reaction added while the card is open).
  }, [ref, measure, watch]);

  const scrollByStep = useCallback(
    (direction: -1 | 1) => {
      const node = ref.current;
      if (!node) return;
      node.scrollBy({ left: direction * node.clientWidth * ARROW_SCROLL_RATIO, behavior: "smooth" });
    },
    [ref]
  );

  return { can_scroll_start, can_scroll_end, scrollByStep, is_dragging };
}
