"use client";

import React from "react";
import type { BoardTableGroup, RowDropLanding } from "./types";
import "./row-move.scss";

interface RowMoveAnimatorProps {
  /** The board's groups. A new reference while a row drag is active plays the slide. */
  groups: BoardTableGroup[];
  /** True while a row (item or subitem) is being dragged. */
  is_dragging: boolean;
  /** The row the last drop moved, see `RowDropLanding`. A new object plays the landing flash on that row. */
  landing: RowDropLanding | null;
  /** The wrapper element, also read by `useRowDragSession` to tell drops inside the board apart. */
  root_ref: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

/** Visual top of each `[data-row-flip-key]` block before the reorder render, keyed by that attribute (rows can remount in another table). */
type RowMoveSnapshot = Map<string, number> | null;

const LANDING_MS = 950;
/** Blocks further than this outside the viewport aren't measured, which keeps long boards cheap. */
const VIEWPORT_MARGIN = 240;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * Slides rows and whole tables into their new place while a row is dragged,
 * inside one table or across tables (FLIP: measure First, let React render
 * the Last layout, Invert with a transform, Play by transitioning it away).
 *
 * Blocks opt in with `data-row-flip-key`: an item together with its open
 * subitems, each subitem, and the parts of a table around its rows (header,
 * column header, footer), so the tables below a moved row glide too instead
 * of jumping. Keys are stable ids rather than DOM nodes because a row that
 * changes table is remounted. A block nested inside another moving block only
 * plays its own share of the move.
 *
 * After a drop that moved something, the row gets `data-row-landed` for a
 * moment, a short wash in its group color so the eye finds where it landed.
 *
 * A class component because `getSnapshotBeforeUpdate` is the one hook that
 * runs after React has the new tree but before it touches the DOM.
 */
export default class RowMoveAnimator extends React.Component<RowMoveAnimatorProps> {
  private landing_timer: number | null = null;
  private landed_el: HTMLElement | null = null;

  getSnapshotBeforeUpdate(prev_props: RowMoveAnimatorProps): RowMoveSnapshot {
    const is_reorder = prev_props.groups !== this.props.groups && (prev_props.is_dragging || this.props.is_dragging);
    if (!is_reorder || prefersReducedMotion()) return null;
    const root = this.props.root_ref.current;
    if (!root) return null;
    const snapshot = new Map<string, number>();
    const viewport_height = window.innerHeight;
    root.querySelectorAll<HTMLElement>("[data-row-flip-key]").forEach((block) => {
      const rect = block.getBoundingClientRect();
      if (rect.bottom < -VIEWPORT_MARGIN || rect.top > viewport_height + VIEWPORT_MARGIN || rect.height === 0) return;
      snapshot.set(block.dataset.rowFlipKey!, rect.top);
    });
    return snapshot;
  }

  componentDidUpdate(prev_props: RowMoveAnimatorProps, _prev_state: unknown, snapshot: RowMoveSnapshot) {
    if (snapshot && snapshot.size > 0) this.playSlide(snapshot);
    if (this.props.landing && this.props.landing !== prev_props.landing) this.playLanding(this.props.landing.node_id);
  }

  componentWillUnmount() {
    if (this.landing_timer !== null) window.clearTimeout(this.landing_timer);
  }

  private playSlide(snapshot: Map<string, number>) {
    const root = this.props.root_ref.current;
    if (!root) return;
    const blocks = Array.from(root.querySelectorAll<HTMLElement>("[data-row-flip-key]")).filter((block) => snapshot.has(block.dataset.rowFlipKey!));

    // Pass 1, writes only: drop any slide still running so the next read sees the real new layout.
    for (const block of blocks) {
      block.dataset.rowFlipPhase = "invert";
      block.style.transform = "";
    }

    // Pass 2, reads only: how far each block moved.
    const deltas = new Map<HTMLElement, number>();
    for (const block of blocks) deltas.set(block, snapshot.get(block.dataset.rowFlipKey!)! - block.getBoundingClientRect().top);

    // A nested block already rides along with its moving parent, so it only plays the difference.
    const moved: Array<{ block: HTMLElement; delta: number }> = [];
    for (const block of blocks) {
      const parent = block.parentElement?.closest<HTMLElement>("[data-row-flip-key]");
      const own = deltas.get(block)! - (parent ? (deltas.get(parent) ?? 0) : 0);
      if (Math.abs(own) < 0.5) delete block.dataset.rowFlipPhase;
      else moved.push({ block, delta: own });
    }
    if (moved.length === 0) return;

    // Pass 3, writes: put every block back where it was on screen.
    for (const { block, delta } of moved) block.style.transform = `translate3d(0, ${delta}px, 0)`;
    // One forced reflow commits the inverted frame before the transition starts.
    void root.offsetHeight;
    // Pass 4, writes: let the transition carry each block home.
    for (const { block } of moved) {
      block.dataset.rowFlipPhase = "play";
      block.style.transform = "";
      block.addEventListener("transitionend", RowMoveAnimator.clearPhase, { once: true });
    }
  }

  private static clearPhase(event: Event) {
    const block = event.currentTarget as HTMLElement;
    if (block.dataset.rowFlipPhase === "play") delete block.dataset.rowFlipPhase;
  }

  private playLanding(node_id: string) {
    if (prefersReducedMotion()) return;
    const root = this.props.root_ref.current;
    const row = root?.querySelector<HTMLElement>(`[data-row-node-id="${CSS.escape(node_id)}"]`);
    if (this.landed_el) delete this.landed_el.dataset.rowLanded;
    if (this.landing_timer !== null) window.clearTimeout(this.landing_timer);
    if (!row) return;
    // Restart the animation even when the same row lands twice in a row.
    delete row.dataset.rowLanded;
    void row.offsetWidth;
    row.dataset.rowLanded = "true";
    this.landed_el = row;
    this.landing_timer = window.setTimeout(() => {
      this.landing_timer = null;
      delete row.dataset.rowLanded;
      this.landed_el = null;
    }, LANDING_MS);
  }

  render() {
    const { is_dragging, root_ref, children } = this.props;
    return (
      <div ref={root_ref} className="row-move-root" data-row-dragging-active={is_dragging ? "true" : undefined}>
        {children}
      </div>
    );
  }
}
