"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  MouseSensor,
  TouchSensor,
  defaultDropAnimationSideEffects,
  getClientRect,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DraggableSyntheticListeners,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
  type Modifier,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import type { BoardTableGroup } from "../types";
import { boardTreeFontClassName } from "../../board-tree-font";
import { GroupDragHandleProvider, NO_GROUP_DRAG_SELECTOR, type GroupDragHandle } from "./groupDragHandle";

/** How far the mouse must travel before a press on a header becomes a drag, so clicks (rename, collapse) still work. */
const MOUSE_ACTIVATION_DISTANCE = 6;
/** Touch needs a short hold instead, otherwise every swipe over a header would pick the group up instead of scrolling. */
const TOUCH_ACTIVATION = { delay: 220, tolerance: 8 };
/** Slide timing of the groups that make room for the dragged one. */
const GROUP_SLIDE_TRANSITION = { duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)" };
/** How long the dropped card takes to glide into its slot. The list stays compact until it lands. */
const DROP_DURATION = 220;
/** How long the moved group keeps its highlight after the tables open again. */
const LANDED_HIGHLIGHT_DURATION = 1100;
/** Gap between the compact cards while dragging, the same one collapsed groups use at rest (see `GroupSection`). */
const COMPACT_GAP = 10;
/** Safety cap for the scroll compensation loop below. */
const MAX_COMPENSATION_PASSES = 3;

const DROP_ANIMATION: DropAnimation = {
  duration: DROP_DURATION,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
  sideEffects: defaultDropAnimationSideEffects({ className: { dragOverlay: "is-dropping" } }),
};

interface SortableGroupListProps {
  state: BoardTableState;
  actions: BoardTableActions;
  /** One table. `view_state` is `state`, or a copy with every group collapsed while a group is being dragged. */
  renderGroup: (group: BoardTableGroup, index: number, view_state: BoardTableState, is_reordering: boolean) => React.ReactNode;
  /** The card that follows the pointer, the group's collapsed summary row. */
  renderPreview: (group: BoardTableGroup, view_state: BoardTableState) => React.ReactNode;
}

interface Anchor {
  key: string;
  /** Viewport top of the group's header (or collapsed card) before the layout change. */
  top: number;
}

function sortableNodeOf(list: HTMLElement | null, key: string): HTMLElement | null {
  return list?.querySelector<HTMLElement>(`[data-group-sort-key="${escapeSelector(key)}"]`) ?? null;
}

function escapeSelector(value: string): string {
  return typeof window !== "undefined" && window.CSS?.escape ? window.CSS.escape(value) : value.replace(/"/g, '\\"');
}

/** Viewport top of the group's visible header: the sticky header bar, or the collapsed card. */
function anchorTopOf(list: HTMLElement | null, key: string): number | null {
  const node = sortableNodeOf(list, key);
  if (!node) return null;
  return (node.querySelector("[data-group-anchor]") ?? node).getBoundingClientRect().top;
}

function scrollParentOf(node: HTMLElement): HTMLElement {
  for (let element = node.parentElement; element; element = element.parentElement) {
    const { overflowY } = getComputedStyle(element);
    if ((overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") && element.scrollHeight > element.clientHeight) return element;
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

/** Same tier (priority client groups or the rest), see `moveGroupToIndex`: a group can't be dropped across that line. */
function isSameTier(a: BoardTableGroup | undefined, b: BoardTableGroup | undefined): boolean {
  return !!a && !!b && !!a.is_priority === !!b.is_priority;
}

/**
 * Wraps dnd-kit's listeners so presses that belong to something else never start a drag:
 * fields and `[data-no-group-drag]` controls, and anything rendered in a portal (the group
 * menu), whose React events still bubble up here although it lives elsewhere in the DOM.
 */
function guardListeners(listeners: DraggableSyntheticListeners): GroupDragHandle["listeners"] {
  if (!listeners) return undefined;
  return Object.fromEntries(
    Object.entries(listeners).map(([name, handler]) => [
      name,
      (event: React.SyntheticEvent) => {
        const target = event.target as Element;
        if (!(event.currentTarget as Element).contains(target) || target.closest(NO_GROUP_DRAG_SELECTOR)) return;
        handler(event);
      },
    ])
  );
}

/** Swallows the click the browser fires right after a drop, so it doesn't rename or collapse the group under the pointer. */
function suppressNextClick() {
  const stop = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
  };
  window.addEventListener("click", stop, { capture: true, once: true });
  window.setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0);
}

interface SortableGroupItemProps {
  group: BoardTableGroup;
  index: number;
  is_enabled: boolean;
  is_reordering: boolean;
  is_landed: boolean;
  is_expanding: boolean;
  is_motion_reduced: boolean;
  children: React.ReactNode;
}

function SortableGroupItem({ group, index, is_enabled, is_reordering, is_landed, is_expanding, is_motion_reduced, children }: SortableGroupItemProps) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({
    id: group.key,
    disabled: !is_enabled,
    transition: is_motion_reduced ? null : GROUP_SLIDE_TRANSITION,
  });

  const handle = useMemo<GroupDragHandle>(
    () => ({ is_enabled, listeners: is_enabled ? guardListeners(listeners) : undefined }),
    [is_enabled, listeners]
  );

  const style: React.CSSProperties & Record<"--group-color", string> = {
    "--group-color": group.color,
    // No transform at rest: a transformed ancestor would break the sticky group header inside.
    transform: CSS.Translate.toString(transform),
    transition: is_reordering ? transition : undefined,
    // While compact the gap is a margin, so this element's box is exactly the card, which is what
    // the drop animation lands on. At rest `GroupSection` keeps the gap as padding (see its own note).
    marginTop: is_reordering && index > 0 ? COMPACT_GAP : undefined,
    position: isDragging ? "relative" : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-group-sort-key={group.key}
      data-group-ghost={isDragging ? "" : undefined}
      data-group-landed={is_landed ? "" : undefined}
      data-group-expanding={is_expanding ? "" : undefined}
    >
      <GroupDragHandleProvider value={handle}>{children}</GroupDragHandleProvider>
      {isDragging && (
        <div
          aria-hidden
          className="group-drop-slot pointer-events-none absolute inset-0 rounded-[8px] border-2 border-dashed"
          style={{ borderColor: group.color }}
        />
      )}
    </div>
  );
}

/**
 * The board's tables, reorderable by dragging a group header, like monday.com: on pickup
 * every table folds into its compact summary card so the whole board fits on screen, the
 * other cards slide aside as the dragged one passes, and once it lands every table opens
 * again with the moved one briefly highlighted. Collapsing is only visual (`view_state`),
 * the viewer's own saved collapsed groups are never touched. The drop is saved through
 * `actions.moveGroupToIndex`, which keeps priority client groups and the rest apart.
 *
 * Folding the tables moves everything on the page, so the list scrolls (or, out of scroll
 * room, pads itself) to keep the dragged card right where its header was under the pointer.
 */
export default function SortableGroupList({ state, actions, renderGroup, renderPreview }: SortableGroupListProps) {
  const list_ref = useRef<HTMLDivElement>(null);
  const [active_key, setActiveKey] = useState<string | null>(null);
  const [settling_key, setSettlingKey] = useState<string | null>(null);
  const [landed_key, setLandedKey] = useState<string | null>(null);
  const [expanding, setExpanding] = useState(false);
  const [spacers, setSpacers] = useState({ top: 0, bottom: 0 });
  const [portal_target, setPortalTarget] = useState<HTMLElement | null>(null);

  const anchor_ref = useRef<Anchor | null>(null);
  const compensation_passes_ref = useRef(0);
  const scroller_ref = useRef<HTMLElement | null>(null);
  const overlay_offset_ref = useRef(0);
  const timers_ref = useRef<number[]>([]);
  const groups_ref = useRef(state.groups);
  groups_ref.current = state.groups;

  const is_reordering = active_key !== null || settling_key !== null;
  const is_enabled = !state.read_only && state.can_edit_structure && state.can_reorder_groups && state.groups.length > 1;
  const active_key_ref = useRef(active_key);
  active_key_ref.current = active_key;

  const [is_motion_reduced, setIsMotionReduced] = useState(false);

  useEffect(() => setPortalTarget(document.body), []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setIsMotionReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const timers = timers_ref.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      document.body.classList.remove("is-dragging-group");
    };
  }, []);

  const later = useCallback((fn: () => void, delay: number) => {
    timers_ref.current.push(window.setTimeout(fn, delay));
  }, []);

  const view_state = useMemo<BoardTableState>(() => {
    if (!is_reordering) return state;
    return {
      ...state,
      collapsed_groups: Object.fromEntries(state.groups.map((group) => [group.key, true])),
      hover_group_key: null,
      open_group_menu_key: null,
    };
  }, [state, is_reordering]);

  // Keeps the anchored group's header at the same spot on screen across a layout change
  // (folding on pickup, unfolding after the drop). When the scroller runs out of room, a
  // spacer above or below the cards makes some and this runs again to finish the job.
  // Spacers only exist while compact, they're dropped together with the fold.
  useLayoutEffect(() => {
    const anchor = anchor_ref.current;
    const scroller = scroller_ref.current;
    if (!anchor || !scroller) return;

    const top = anchorTopOf(list_ref.current, anchor.key);
    const drift = top === null ? 0 : top - anchor.top;
    const before = scroller.scrollTop;
    if (Math.abs(drift) >= 1) scroller.scrollTop = before + drift;
    const remaining = drift - (scroller.scrollTop - before);

    compensation_passes_ref.current += 1;
    if (Math.abs(remaining) < 1 || !is_reordering || compensation_passes_ref.current >= MAX_COMPENSATION_PASSES) {
      anchor_ref.current = null;
      return;
    }
    setSpacers((s) => (remaining < 0 ? { ...s, top: s.top - remaining } : { ...s, bottom: s.bottom + remaining }));
  }, [is_reordering, spacers]);

  const anchorGroup = (key: string) => {
    const top = anchorTopOf(list_ref.current, key);
    anchor_ref.current = top === null ? null : { key, top };
    compensation_passes_ref.current = 0;
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: MOUSE_ACTIVATION_DISTANCE } }),
    useSensor(TouchSensor, { activationConstraint: TOUCH_ACTIVATION })
  );

  /**
   * Picks the slot under the pointer, measured live and without the slide transforms, among the
   * dragged group's own tier. dnd-kit's cached rects can't be trusted here: they're taken before
   * the tables fold and before the scroll compensation above moves everything.
   */
  const collisionDetection = useCallback<CollisionDetection>(({ active, droppableContainers, pointerCoordinates }) => {
    if (!pointerCoordinates) return [];
    const groups = groups_ref.current;
    const active_group = groups.find((group) => group.key === active.id);

    let best: { container: (typeof droppableContainers)[number]; distance: number } | null = null;
    for (const container of droppableContainers) {
      const node = container.node.current;
      if (!node || !isSameTier(active_group, groups.find((group) => group.key === container.id))) continue;
      const rect = getClientRect(node, { ignoreTransform: true });
      const y = pointerCoordinates.y;
      const distance = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
      if (!best || distance < best.distance) best = { container, distance };
    }
    return best ? [{ id: best.container.id, data: { droppableContainer: best.container, value: best.distance } }] : [];
  }, []);

  /** Starts the preview card over the dragged group's header and keeps it moving vertically only. */
  const anchorOverlay = useCallback<Modifier>(({ transform }) => ({ ...transform, x: 0, y: transform.y + overlay_offset_ref.current }), []);
  const overlay_modifiers = useMemo(() => [anchorOverlay], [anchorOverlay]);

  const handleDragStart = ({ active }: DragStartEvent) => {
    const key = String(active.id);
    const node = sortableNodeOf(list_ref.current, key);
    if (node) {
      scroller_ref.current = scrollParentOf(node);
      const anchor_top = anchorTopOf(list_ref.current, key) ?? node.getBoundingClientRect().top;
      // The overlay is placed at the group's whole box as measured right now (padding included),
      // the card should start where the header is instead.
      overlay_offset_ref.current = anchor_top - node.getBoundingClientRect().top;
    }
    anchorGroup(key);
    actions.closeGroupMenu();
    document.body.classList.add("is-dragging-group");
    setLandedKey(null);
    setSettlingKey(null);
    setActiveKey(key);
  };

  const finishDrag = (key: string, over_key: string | null) => {
    document.body.classList.remove("is-dragging-group");
    suppressNextClick();

    const did_move = over_key !== null && over_key !== key;
    if (did_move) {
      const groups = groups_ref.current;
      const moved = groups.find((group) => group.key === key);
      const tier = groups.filter((group) => isSameTier(group, moved));
      actions.moveGroupToIndex(key, tier.findIndex((group) => group.key === over_key));
    }

    setActiveKey(null);
    setSettlingKey(key);

    // Unfold only once the card has landed, the drop animation aims at the compact slot.
    later(() => {
      // A new drag picked up during the landing keeps the list compact, its own drop unfolds it.
      if (active_key_ref.current) return;
      anchorGroup(key);
      setSettlingKey(null);
      setSpacers({ top: 0, bottom: 0 });
      setExpanding(true);
      if (did_move) setLandedKey(key);
      later(() => setExpanding(false), 260);
      if (did_move) later(() => setLandedKey((current) => (current === key ? null : current)), LANDED_HIGHLIGHT_DURATION);
    }, is_motion_reduced ? 0 : DROP_DURATION + 20);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => finishDrag(String(active.id), over ? String(over.id) : null);
  const handleDragCancel = () => {
    if (active_key) finishDrag(active_key, null);
  };

  const active_group = active_key ? state.groups.find((group) => group.key === active_key) : undefined;
  const group_keys = useMemo(() => state.groups.map((group) => group.key), [state.groups]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      autoScroll={{ threshold: { x: 0, y: 0.18 } }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={group_keys} strategy={verticalListSortingStrategy}>
        <div
          ref={list_ref}
          className="group-sortable-list"
          data-reordering={is_reordering ? "" : undefined}
          style={{ paddingTop: spacers.top || undefined, paddingBottom: spacers.bottom || undefined }}
        >
          {state.groups.map((group, index) => (
            <SortableGroupItem
              key={group.key}
              group={group}
              index={index}
              is_enabled={is_enabled}
              is_reordering={is_reordering}
              is_landed={landed_key === group.key}
              is_expanding={expanding}
              is_motion_reduced={is_motion_reduced}
            >
              {renderGroup(group, index, view_state, is_reordering)}
            </SortableGroupItem>
          ))}
        </div>
      </SortableContext>

      {portal_target &&
        createPortal(
          <DragOverlay dropAnimation={is_motion_reduced ? null : DROP_ANIMATION} modifiers={overlay_modifiers} style={{ height: "auto" }}>
            {active_group ? (
              <div className={`group-drag-preview ${boardTreeFontClassName}`} style={{ "--group-color": active_group.color } as React.CSSProperties}>
                {renderPreview(active_group, view_state)}
              </div>
            ) : null}
          </DragOverlay>,
          portal_target
        )}
    </DndContext>
  );
}
