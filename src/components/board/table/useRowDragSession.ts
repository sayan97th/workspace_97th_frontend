"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { RowDragOutcome } from "./types";
import { ROW_DRAG_END_EVENT } from "./rowDragUtils";

/** How close to the scroll area's top or bottom edge the pointer must be before the board scrolls on its own. */
const AUTO_SCROLL_EDGE = 64;
/** Pixels per frame at the very edge. The speed eases in from zero at `AUTO_SCROLL_EDGE`. */
const AUTO_SCROLL_MAX_STEP = 22;
/** A `dragover` older than this means the pointer left the window, so auto scroll pauses. */
const POINTER_STALE_MS = 160;

function findScrollParent(node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement ?? null;
  while (current && current !== document.body) {
    const { overflowY } = window.getComputedStyle(current);
    if ((overflowY === "auto" || overflowY === "scroll") && current.scrollHeight > current.clientHeight) return current;
    current = current.parentElement;
  }
  return null;
}

/**
 * Runs the window side of a row drag while one is in flight.
 *
 * A row that changes table is remounted by React (it gets a new parent), and
 * React never hears the `dragend` of a source node that left its tree. Even a
 * row that only moved inside its table can end with no `drop` event and a
 * `dropEffect` of "none", since the browser lost track of the moved node. So
 * the drag is finished from here, and the outcome comes from where the pointer
 * last was: inside the board commits the live position, outside it (or out of
 * the window) puts everything back.
 * - `drop` inside the board commits, a drop on something outside it cancels.
 * - `dragend`, from the document while the source row is still mounted, or
 *   relayed by `startRowDrag`'s own listener on the source node
 *   (`ROW_DRAG_END_EVENT`) once it was remounted elsewhere.
 * - the first plain mouse move after the drag, with no button held, as a last
 *   resort. Browsers send no mouse events during a native drag, so this only
 *   fires once it's over.
 *
 * It also lets the row be dropped anywhere on the board (gaps between tables
 * included) and scrolls the board when the pointer nears its top or bottom
 * edge, so a row can travel to a table far down the page.
 */
export function useRowDragSession(root_ref: RefObject<HTMLElement | null>, is_active: boolean, onFinish: (outcome: RowDragOutcome) => void) {
  const finish_ref = useRef(onFinish);
  useEffect(() => {
    finish_ref.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (!is_active) return;

    const scroller = findScrollParent(root_ref.current);
    let is_done = false;
    let pointer_y: number | null = null;
    let last_over_at = 0;
    let last_drag_event_at = performance.now();
    let is_pointer_inside = true;
    let frame = 0;

    const finish = (outcome: RowDragOutcome) => {
      if (is_done) return;
      is_done = true;
      finish_ref.current(outcome);
    };

    const isInsideBoard = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      return !!root_ref.current?.contains(target) || !!scroller?.contains(target);
    };

    const handleDragOver = (event: DragEvent) => {
      last_drag_event_at = performance.now();
      is_pointer_inside = isInsideBoard(event.target);
      if (!is_pointer_inside) {
        pointer_y = null;
        return;
      }
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      pointer_y = event.clientY;
      last_over_at = performance.now();
    };

    const handleDrop = (event: DragEvent) => {
      if (isInsideBoard(event.target)) {
        event.preventDefault();
        finish("drop");
      } else {
        finish("cancel");
      }
    };

    // Leaving the window fires no `dragover` outside the board, so this is how a release out there is told apart.
    const handleDragLeave = (event: DragEvent) => {
      if (event.relatedTarget === null && (event.clientX <= 0 || event.clientY <= 0 || event.clientX >= window.innerWidth || event.clientY >= window.innerHeight)) {
        is_pointer_inside = false;
        pointer_y = null;
      }
    };

    const finishWherePointerIs = () => finish(is_pointer_inside ? "drop" : "cancel");

    // Extra guard on top of the button check: a drag still in flight keeps firing `dragover`.
    const handleMouseMove = (event: MouseEvent) => {
      if (event.buttons === 0 && performance.now() - last_drag_event_at > POINTER_STALE_MS) finishWherePointerIs();
    };

    const autoScroll = () => {
      frame = window.requestAnimationFrame(autoScroll);
      if (pointer_y === null || performance.now() - last_over_at > POINTER_STALE_MS) return;
      const top = scroller ? scroller.getBoundingClientRect().top : 0;
      const bottom = scroller ? scroller.getBoundingClientRect().bottom : window.innerHeight;
      let step = 0;
      if (pointer_y < top + AUTO_SCROLL_EDGE) step = -((top + AUTO_SCROLL_EDGE - pointer_y) / AUTO_SCROLL_EDGE);
      else if (pointer_y > bottom - AUTO_SCROLL_EDGE) step = (pointer_y - (bottom - AUTO_SCROLL_EDGE)) / AUTO_SCROLL_EDGE;
      if (step === 0) return;
      const clamped = Math.max(-1, Math.min(1, step));
      const delta = Math.sign(clamped) * Math.ceil(clamped * clamped * AUTO_SCROLL_MAX_STEP);
      if (scroller) scroller.scrollTop += delta;
      else window.scrollBy(0, delta);
    };

    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop, true);
    document.addEventListener("dragend", finishWherePointerIs, true);
    document.addEventListener("dragleave", handleDragLeave, true);
    window.addEventListener(ROW_DRAG_END_EVENT, finishWherePointerIs);
    document.addEventListener("mousemove", handleMouseMove, true);
    document.body.classList.add("is-dragging-row");
    frame = window.requestAnimationFrame(autoScroll);

    return () => {
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop, true);
      document.removeEventListener("dragend", finishWherePointerIs, true);
      document.removeEventListener("dragleave", handleDragLeave, true);
      window.removeEventListener(ROW_DRAG_END_EVENT, finishWherePointerIs);
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.body.classList.remove("is-dragging-row");
      window.cancelAnimationFrame(frame);
    };
  }, [is_active, root_ref]);
}
