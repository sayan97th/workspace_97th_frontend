"use client";

import React from "react";
import "./column-move.scss";

interface ColumnMoveAnimatorProps {
  /** `columnOrderKey` of the current groups. A change while a column drag is active plays the slide. */
  order_key: string;
  /** `columnMoveKey` of the column being dragged, null when no column drag is in flight. */
  dragging_key: string | null;
  children: React.ReactNode;
}

/** Visual left edge of each column cell before the reorder render, keyed by the DOM node React keeps across the move. */
type ColumnMoveSnapshot = Map<HTMLElement, number> | null;

const SETTLE_MS = 520;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * Slides table columns into their new place while a header is dragged
 * (FLIP: measure First, let React render the Last layout, Invert with a
 * transform, Play by transitioning the transform away). Timing and the
 * lifted placeholder look live in `column-move.scss`, driven by the
 * `data-column-move-*` attributes set here.
 *
 * A class component because `getSnapshotBeforeUpdate` is the one hook that
 * runs after React has the new tree but before it touches the DOM, which is
 * exactly when the old positions must be read.
 */
export default class ColumnMoveAnimator extends React.Component<ColumnMoveAnimatorProps> {
  private root_ref = React.createRef<HTMLDivElement>();
  private settle_timer: number | null = null;

  getSnapshotBeforeUpdate(prev_props: ColumnMoveAnimatorProps): ColumnMoveSnapshot {
    const is_reorder = prev_props.order_key !== this.props.order_key && (prev_props.dragging_key !== null || this.props.dragging_key !== null);
    if (!is_reorder || prefersReducedMotion()) return null;
    const root = this.root_ref.current;
    if (!root) return null;
    const snapshot = new Map<HTMLElement, number>();
    const viewport_height = window.innerHeight;
    root.querySelectorAll<HTMLElement>("[data-column-move]").forEach((cell) => {
      const rect = cell.getBoundingClientRect();
      // Rows scrolled out of view never get animated, which keeps long boards cheap.
      if (rect.bottom < 0 || rect.top > viewport_height || rect.width === 0) return;
      snapshot.set(cell, rect.left);
    });
    return snapshot;
  }

  componentDidUpdate(prev_props: ColumnMoveAnimatorProps, _prev_state: unknown, snapshot: ColumnMoveSnapshot) {
    this.syncLifted(prev_props.dragging_key);
    if (snapshot && snapshot.size > 0) this.playSlide(snapshot);
    if (prev_props.dragging_key && !this.props.dragging_key) this.playSettle(prev_props.dragging_key);
  }

  componentWillUnmount() {
    if (this.settle_timer !== null) window.clearTimeout(this.settle_timer);
  }

  private cellsOf(column_key: string): NodeListOf<HTMLElement> | [] {
    const root = this.root_ref.current;
    return root ? root.querySelectorAll<HTMLElement>(`[data-column-move="${CSS.escape(column_key)}"]`) : [];
  }

  /**
   * Marks the dragged column's cells as the lifted placeholder. Done on every
   * update while dragging, so rows rendered mid drag pick it up too. React
   * never owns this attribute, so its renders leave it alone.
   */
  private syncLifted(prev_dragging_key: string | null) {
    const { dragging_key } = this.props;
    if (prev_dragging_key && prev_dragging_key !== dragging_key) {
      this.cellsOf(prev_dragging_key).forEach((cell) => { delete cell.dataset.columnMoveLifted; });
    }
    if (dragging_key) this.cellsOf(dragging_key).forEach((cell) => { cell.dataset.columnMoveLifted = "true"; });
  }

  private playSlide(snapshot: Map<HTMLElement, number>) {
    const cells = Array.from(snapshot.keys()).filter((cell) => cell.isConnected);
    // Pass 1, writes only: drop any slide still running so the next read sees the real new layout.
    for (const cell of cells) {
      cell.dataset.columnMovePhase = "invert";
      cell.style.transform = "";
    }
    // Pass 2, reads only: where each cell landed.
    const moved: Array<{ cell: HTMLElement; delta: number }> = [];
    for (const cell of cells) {
      const delta = snapshot.get(cell)! - cell.getBoundingClientRect().left;
      if (Math.abs(delta) < 0.5) delete cell.dataset.columnMovePhase;
      else moved.push({ cell, delta });
    }
    if (moved.length === 0) return;
    // Pass 3, writes: put every cell back where it was on screen.
    for (const { cell, delta } of moved) cell.style.transform = `translate3d(${delta}px, 0, 0)`;
    // One forced reflow commits the inverted frame before the transition starts.
    void this.root_ref.current?.offsetWidth;
    // Pass 4, writes: let the transition carry each cell home.
    for (const { cell } of moved) {
      cell.dataset.columnMovePhase = "play";
      cell.style.transform = "";
      cell.addEventListener("transitionend", ColumnMoveAnimator.clearPhase, { once: true });
    }
  }

  private static clearPhase(event: Event) {
    const cell = event.currentTarget as HTMLElement;
    if (cell.dataset.columnMovePhase === "play") delete cell.dataset.columnMovePhase;
  }

  /** A short accent wash on the dropped column, so the eye finds where it landed. */
  private playSettle(column_key: string) {
    if (prefersReducedMotion()) return;
    const cells = this.cellsOf(column_key);
    cells.forEach((cell) => { cell.dataset.columnMoveSettle = "true"; });
    if (this.settle_timer !== null) window.clearTimeout(this.settle_timer);
    this.settle_timer = window.setTimeout(() => {
      this.settle_timer = null;
      cells.forEach((cell) => { delete cell.dataset.columnMoveSettle; });
    }, SETTLE_MS);
  }

  render() {
    const { dragging_key, children } = this.props;
    return (
      <div ref={this.root_ref} className="column-move-root" data-column-dragging={dragging_key ? "true" : undefined}>
        {children}
      </div>
    );
  }
}
