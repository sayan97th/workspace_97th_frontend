"use client";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronsLeftRight, ChevronsRightLeft, Palette } from "lucide-react";
import ActionMenu, { type ActionMenuItem, type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { PlusIcon } from "@/icons/board-icons";
import { CheckIcon, DeleteIcon, MoreDotsIcon, RenameIcon } from "@/icons/workspace-icons";
import InlineTitleEditor from "../InlineTitleEditor";
import { KANBAN_LANE_COLORS } from "./kanbanDefaults";
import "./board-kanban.css";

export type BoardKanbanLane<TRow> = {
  id: string;
  label: string;
  color: string;
  rows: TRow[];
  /** Lanes without a real backing option (e.g. the "No status" bucket) can't be renamed, recolored, moved or deleted. */
  renamable?: boolean;
};

export type BoardKanbanProps<TRow> = {
  lanes: BoardKanbanLane<TRow>[];
  getRowId: (row: TRow) => string;
  /** Plain text name of a card, used by screen reader drag announcements. */
  getRowTitle?: (row: TRow) => string;
  /** Renders one card's content. The board owns the card shell (border, hover lift, drag ghost), the caller owns what's inside. */
  renderCard: (row: TRow) => React.ReactNode;
  /** Fades a finished card, the way Asana dims completed tasks. */
  isRowDone?: (row: TRow) => boolean;
  onCardClick?: (row: TRow) => void;
  selectedRowId?: string | null;
  /** Fired when a card is dropped into a different lane. Omit to make cards static. */
  onMoveCard?: (row_id: string, lane_id: string) => void;
  /** Fired when a card is dropped at a new position, with the lane's full new card order. */
  onReorderCards?: (lane_id: string, ordered_row_ids: string[]) => void;
  /** Opens a lane's inline "add task" composer. */
  onAddCard?: (lane_id: string) => void;
  /** Which lane currently has its inline "add task" composer open. */
  addingLaneId?: string | null;
  /** Creates a task. The composer stays open afterwards for quick entry of the next one. */
  onSubmitNewCard?: (lane_id: string, title: string) => void;
  onCancelAddCard?: () => void;
  /** Appends a new lane with the given name. Omit to hide the trailing "Add lane" control. */
  onAddLane?: (label: string) => void;
  onRenameLane?: (lane_id: string, label: string) => void;
  onRecolorLane?: (lane_id: string, color: string) => void;
  /** Deletes a lane. Its cards are not deleted, they fall back to the "No status" lane. */
  onDeleteLane?: (lane_id: string) => void;
  /** Fired after a lane is dragged to a new spot, with every movable lane id in its new order. */
  onReorderLanes?: (ordered_lane_ids: string[]) => void;
  /** Remembers which lanes are collapsed, per viewer, under this key. Omit to keep it in memory only. */
  storage_key?: string;
};

/**
 * Space kept between the board and the bottom of the window. The board pulls
 * up over most of the page scroller's own bottom padding (see `.board-kanban`
 * in board-kanban.css), so the page itself never scrolls.
 */
const BOARD_BOTTOM_GAP = 24;
const BOARD_MIN_HEIGHT = 380;
const LANE_SORTABLE_PREFIX = "lane:";
const LANDED_HIGHLIGHT_MS = 900;
const DROP_ANIMATION_MS = 240;

const laneSortableId = (lane_id: string): string => `${LANE_SORTABLE_PREFIX}${lane_id}`;
const laneIdFromSortableId = (id: UniqueIdentifier): string | null => {
  const value = String(id);
  return value.startsWith(LANE_SORTABLE_PREFIX) ? value.slice(LANE_SORTABLE_PREFIX.length) : null;
};

/** Builds the drag engine's working copy of each lane's card id order from the (server driven) `lanes` prop. */
function laneIdMap<TRow>(lanes: BoardKanbanLane<TRow>[], getRowId: (row: TRow) => string): Record<string, string[]> {
  return Object.fromEntries(lanes.map((lane) => [lane.id, lane.rows.map(getRowId)]));
}

const readCollapsedLaneIds = (storage_key?: string): string[] => {
  if (!storage_key || typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(`kanban_collapsed_lanes:${storage_key}`);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
};

const writeCollapsedLaneIds = (storage_key: string | undefined, lane_ids: string[]) => {
  if (!storage_key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`kanban_collapsed_lanes:${storage_key}`, JSON.stringify(lane_ids));
  } catch {
    // Private windows and blocked storage just forget the collapsed lanes on reload.
  }
};

/** The nearest scrolling ancestor, whose size changes move the board's top edge. */
const findScrollParent = (element: HTMLElement | null): HTMLElement | null => {
  let current = element?.parentElement ?? null;
  while (current) {
    const overflow_y = window.getComputedStyle(current).overflowY;
    if (overflow_y === "auto" || overflow_y === "scroll") return current;
    current = current.parentElement;
  }
  return null;
};

/**
 * The held card settles back flat (unrotated, unscaled) while it glides into
 * its slot, and the real card stays hidden until the glide ends so the ghost
 * and the card never show at the same time.
 */
const drop_animation: DropAnimation = {
  duration: DROP_ANIMATION_MS,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  sideEffects: (params) => {
    params.dragOverlay.node.setAttribute("data-dropping", "");
    return defaultDropAnimationSideEffects({ styles: { active: { opacity: "0" } } })(params);
  },
};

// ── Add task composer ───────────────────────────────────────────────────

type AddCardComposerProps = {
  onSubmit: (title: string) => void;
  onClose: () => void;
};

/**
 * Card shaped composer at the bottom of a lane. Enter creates the task and
 * keeps the composer open for the next one (Trello's quick entry), Escape or
 * clicking away closes it, and a click away with text still saves it.
 */
const AddCardComposer: React.FC<AddCardComposerProps> = ({ onSubmit, onClose }) => {
  const [value, setValue] = useState("");
  const textarea_ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textarea_ref.current;
    if (!textarea) return;
    textarea.focus();
    textarea.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  // Grows with the text instead of scrolling inside a fixed box.
  useLayoutEffect(() => {
    const textarea = textarea_ref.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  const submit = (keep_open: boolean) => {
    const title = value.trim();
    if (title) onSubmit(title);
    if (keep_open && title) {
      setValue("");
      return;
    }
    onClose();
  };

  return (
    <div className="kanban-composer">
      <textarea
        ref={textarea_ref}
        rows={1}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit(true);
          } else if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
        onBlur={() => submit(false)}
        placeholder="Write a task name"
        aria-label="New task name"
      />
      <div className="kanban-composer__hint">Press Enter to add, Esc to close</div>
    </div>
  );
};

// ── Add lane control ────────────────────────────────────────────────────

const AddLaneControl: React.FC<{ onAddLane: (label: string) => void }> = ({ onAddLane }) => {
  const [is_open, setIsOpen] = useState(false);
  const [value, setValue] = useState("");

  const close = () => {
    setIsOpen(false);
    setValue("");
  };

  const submit = () => {
    const label = value.trim();
    if (label) onAddLane(label);
    close();
  };

  if (!is_open) {
    return (
      <button type="button" className="kanban-add-lane" onClick={() => setIsOpen(true)}>
        <PlusIcon size={14} />
        Add lane
      </button>
    );
  }

  return (
    <div className="kanban-add-lane-form">
      <div className="kanban-composer">
        <input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            } else if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
          }}
          onBlur={submit}
          placeholder="Lane name"
          aria-label="New lane name"
        />
      </div>
    </div>
  );
};

// ── Card slot ───────────────────────────────────────────────────────────

type KanbanCardSlotProps<TRow> = {
  row: TRow;
  row_id: string;
  lane_id: string;
  index: number;
  is_selected: boolean;
  is_done: boolean;
  is_landed: boolean;
  can_drag: boolean;
  onCardClick?: (row: TRow) => void;
  renderCard: (row: TRow) => React.ReactNode;
};

function KanbanCardSlot<TRow>({
  row,
  row_id,
  lane_id,
  index,
  is_selected,
  is_done,
  is_landed,
  can_drag,
  onCardClick,
  renderCard,
}: KanbanCardSlotProps<TRow>) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: row_id,
    data: { type: "card", lane_id },
    disabled: !can_drag,
  });
  // The entry fade only plays on a card's first appearance. A card that
  // mounts as a drag ghost (moved into another lane mid drag) skips it, so it
  // doesn't fade in a second time once it's dropped.
  const [is_entering, setIsEntering] = useState(() => !isDragging);

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        setActivatorNodeRef(node);
      }}
      className="kanban-card-slot"
      data-dragging={isDragging || undefined}
      data-landed={is_landed || undefined}
      data-draggable={can_drag || undefined}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...(can_drag ? attributes : { role: "button", tabIndex: 0 })}
      {...(can_drag ? listeners : {})}
      aria-roledescription={can_drag ? "draggable task" : undefined}
      onClick={onCardClick ? () => onCardClick(row) : undefined}
    >
      <div
        className="kanban-card group"
        data-selected={is_selected || undefined}
        data-done={is_done || undefined}
        data-entering={is_entering || undefined}
        style={{ "--kanban-card-index": index } as React.CSSProperties}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setIsEntering(false);
        }}
      >
        {renderCard(row)}
      </div>
    </div>
  );
}

// ── Lane ────────────────────────────────────────────────────────────────

type KanbanLaneProps<TRow> = {
  lane: BoardKanbanLane<TRow>;
  row_ids: string[];
  rows_by_id: Record<string, TRow>;
  is_over: boolean;
  is_collapsed: boolean;
  is_lane_draggable: boolean;
  is_editing_title: boolean;
  landed_row_id: string | null;
  selectedRowId: string | null;
  isRowDone?: (row: TRow) => boolean;
  onCardClick?: (row: TRow) => void;
  renderCard: (row: TRow) => React.ReactNode;
  can_drag_cards: boolean;
  is_adding: boolean;
  onAddCard?: (lane_id: string) => void;
  onSubmitNewCard?: (lane_id: string, title: string) => void;
  onCancelAddCard?: () => void;
  onToggleCollapsed: (lane_id: string) => void;
  onStartRename: (lane_id: string) => void;
  onFinishRename: () => void;
  onRenameLane?: (lane_id: string, label: string) => void;
  onRecolorLane?: (lane_id: string, color: string) => void;
  onRequestDeleteLane?: (lane_id: string) => void;
};

function KanbanLane<TRow>({
  lane,
  row_ids,
  rows_by_id,
  is_over,
  is_collapsed,
  is_lane_draggable,
  is_editing_title,
  landed_row_id,
  selectedRowId,
  isRowDone,
  onCardClick,
  renderCard,
  can_drag_cards,
  is_adding,
  onAddCard,
  onSubmitNewCard,
  onCancelAddCard,
  onToggleCollapsed,
  onStartRename,
  onFinishRename,
  onRenameLane,
  onRecolorLane,
  onRequestDeleteLane,
}: KanbanLaneProps<TRow>) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: laneSortableId(lane.id),
    data: { type: "lane", lane_id: lane.id },
    disabled: !is_lane_draggable || is_editing_title,
  });
  const { setNodeRef: setDroppableNodeRef } = useDroppable({ id: lane.id, data: { type: "lane-body", lane_id: lane.id } });
  const [menu_anchor_el, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const is_real_lane = lane.renamable !== false;
  const can_rename = Boolean(onRenameLane) && is_real_lane;
  const lane_style = {
    "--kanban-lane-color": lane.color,
    transform: CSS.Translate.toString(transform),
    transition,
  } as React.CSSProperties;

  const menu_sections: ActionMenuSection[] = [
    {
      key: "create",
      items: onAddCard ? [{ key: "add-task", label: "Add task", icon: <PlusIcon size={14} />, onClick: () => onAddCard(lane.id) }] : [],
    },
    {
      key: "edit",
      items: [
        ...(can_rename
          ? [{ key: "rename", label: "Rename lane", icon: <RenameIcon size={14} />, onClick: () => onStartRename(lane.id) }]
          : []),
        ...(onRecolorLane && is_real_lane
          ? [
              {
                key: "color",
                label: "Change color",
                icon: <Palette size={14} strokeWidth={1.7} />,
                submenu: KANBAN_LANE_COLORS.map(
                  (swatch): ActionMenuItem => ({
                    key: swatch.color,
                    label: swatch.label,
                    icon: (
                      <span
                        className="kanban-swatch flex items-center justify-center text-white"
                        style={{ "--kanban-swatch-color": swatch.color } as React.CSSProperties}
                      >
                        {swatch.color.toLowerCase() === lane.color.toLowerCase() && <CheckIcon size={10} />}
                      </span>
                    ),
                    onClick: () => onRecolorLane(lane.id, swatch.color),
                  })
                ),
              },
            ]
          : []),
        {
          key: "collapse",
          label: "Collapse lane",
          icon: <ChevronsRightLeft size={14} strokeWidth={1.7} />,
          onClick: () => onToggleCollapsed(lane.id),
        },
      ],
    },
    {
      key: "danger",
      items:
        onRequestDeleteLane && is_real_lane
          ? [{ key: "delete", label: "Delete lane", icon: <DeleteIcon size={14} />, danger: true, onClick: () => onRequestDeleteLane(lane.id) }]
          : [],
    },
  ];

  if (is_collapsed) {
    return (
      <div
        ref={(node) => {
          setSortableNodeRef(node);
          setDroppableNodeRef(node);
        }}
        className="kanban-lane"
        data-collapsed=""
        data-over={is_over || undefined}
        data-placeholder={isDragging || undefined}
        style={lane_style}
        onClick={() => onToggleCollapsed(lane.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onToggleCollapsed(lane.id);
          }
        }}
        aria-label={`Expand ${lane.label}, ${row_ids.length} tasks`}
        title={`Expand ${lane.label}`}
      >
        <div className="kanban-lane__collapsed">
          <span className="kanban-icon-button" aria-hidden="true">
            <ChevronsLeftRight size={15} strokeWidth={1.8} />
          </span>
          <span key={row_ids.length} className="kanban-lane__count">
            {row_ids.length}
          </span>
          <span className="kanban-lane__collapsed-title">{lane.label}</span>
        </div>
      </div>
    );
  }

  return (
    <section
      ref={setSortableNodeRef}
      className="kanban-lane"
      data-over={is_over || undefined}
      data-placeholder={isDragging || undefined}
      style={lane_style}
      aria-label={`${lane.label}, ${row_ids.length} tasks`}
    >
      <header
        ref={setActivatorNodeRef}
        className="kanban-lane__header"
        data-draggable={is_lane_draggable || undefined}
        {...(is_lane_draggable ? attributes : {})}
        {...(is_lane_draggable ? listeners : {})}
        aria-roledescription={is_lane_draggable ? "draggable lane" : undefined}
        tabIndex={is_lane_draggable ? 0 : undefined}
      >
        {is_editing_title ? (
          <div
            className="min-w-0 flex-1"
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <InlineTitleEditor
              value={lane.label}
              onCommit={(label) => {
                onRenameLane?.(lane.id, label);
                onFinishRename();
              }}
              onCancel={onFinishRename}
              className="w-full min-w-0 bg-transparent text-[15px] font-semibold text-[color:var(--kanban-text)] outline-none"
              aria_label="Rename lane"
            />
          </div>
        ) : (
          <h3
            className="kanban-lane__title"
            data-renamable={can_rename || undefined}
            onClick={can_rename ? () => onStartRename(lane.id) : undefined}
            title={can_rename ? "Click to rename" : lane.label}
          >
            {lane.label}
          </h3>
        )}
        {!is_editing_title && (
          <span key={row_ids.length} className="kanban-lane__count" aria-label={`${row_ids.length} tasks`}>
            {row_ids.length}
          </span>
        )}
        <span
          className="kanban-lane__actions"
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {onAddCard && (
            <button
              type="button"
              onClick={() => onAddCard(lane.id)}
              className="kanban-icon-button"
              aria-label={`Add task to ${lane.label}`}
              title="Add task"
            >
              <PlusIcon size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={(event) => setMenuAnchorEl((current) => (current ? null : event.currentTarget))}
            className="kanban-icon-button"
            aria-label={`${lane.label} lane options`}
            aria-haspopup="menu"
            aria-expanded={menu_anchor_el !== null}
            title="Lane options"
          >
            <MoreDotsIcon size={15} />
          </button>
          <ActionMenu
            anchor_el={menu_anchor_el}
            is_open={menu_anchor_el !== null}
            onClose={() => setMenuAnchorEl(null)}
            sections={menu_sections}
            aria_label={`${lane.label} lane options`}
            width={220}
            submenu_width={190}
            align="end"
          />
        </span>
      </header>

      <div ref={setDroppableNodeRef} className="kanban-lane__body shell-scrollbar">
        <SortableContext items={row_ids} strategy={verticalListSortingStrategy}>
          {row_ids.length === 0 && !is_adding && <div className="kanban-lane__empty">Drop tasks here</div>}

          {row_ids.map((row_id, index) => {
            const row = rows_by_id[row_id];
            if (!row) return null;
            return (
              <KanbanCardSlot
                key={row_id}
                row={row}
                row_id={row_id}
                lane_id={lane.id}
                index={index}
                is_selected={selectedRowId === row_id}
                is_done={isRowDone?.(row) ?? false}
                is_landed={landed_row_id === row_id}
                can_drag={can_drag_cards}
                onCardClick={onCardClick}
                renderCard={renderCard}
              />
            );
          })}
        </SortableContext>

        {is_adding && onSubmitNewCard && (
          <AddCardComposer onSubmit={(title) => onSubmitNewCard(lane.id, title)} onClose={() => onCancelAddCard?.()} />
        )}
      </div>

      {onAddCard && !is_adding && (
        <div className="kanban-lane__footer">
          <button type="button" className="kanban-add-task" onClick={() => onAddCard(lane.id)}>
            <PlusIcon size={13} />
            Add task
          </button>
        </div>
      )}
    </section>
  );
}

/** A read only copy of a lane (header plus its first cards), shown under the pointer while the lane is dragged. */
function LanePreview<TRow>({
  lane,
  row_ids,
  rows_by_id,
  renderCard,
}: {
  lane: BoardKanbanLane<TRow>;
  row_ids: string[];
  rows_by_id: Record<string, TRow>;
  renderCard: (row: TRow) => React.ReactNode;
}) {
  return (
    <div className="kanban-lane" style={{ "--kanban-lane-color": lane.color } as React.CSSProperties}>
      <div className="kanban-lane__header">
        <span className="kanban-lane__title">{lane.label}</span>
        <span className="kanban-lane__count">{row_ids.length}</span>
      </div>
      <div className="kanban-lane__body" style={{ overflow: "hidden" }}>
        {row_ids.slice(0, 3).map((row_id) => {
          const row = rows_by_id[row_id];
          return row ? (
            <div key={row_id} className="kanban-card">
              {renderCard(row)}
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
}

// ── Board ───────────────────────────────────────────────────────────────

/**
 * Generic, reusable Kanban board built on `@dnd-kit`, styled after Asana's
 * board with Trello and Jira touches:
 *
 * - Lanes with a slim color bar, a live task count and a "..." menu (add
 *   task, rename, change color, collapse, delete). Lanes are reordered by
 *   dragging their header and collapse into a narrow strip that still
 *   accepts drops.
 * - Cards lift and tilt under the pointer, leave a tinted ghost in their
 *   slot, glide flat into their new slot on drop and pulse once in the
 *   lane's color after they land. Neighbours slide out of the way.
 * - Lanes fill the viewport height and scroll on their own, the board
 *   scrolls sideways and auto scrolls while dragging near an edge.
 *
 * Callers supply the lanes (already partitioned) and a `renderCard` function
 * that owns the card's content, so any board view whose rows can be bucketed
 * into lanes can reuse this shell, mirroring how `BoardTable` takes
 * `renderCell` instead of owning cell layout itself.
 */
function BoardKanban<TRow>({
  lanes,
  getRowId,
  getRowTitle,
  renderCard,
  isRowDone,
  onCardClick,
  selectedRowId = null,
  onMoveCard,
  onReorderCards,
  onAddCard,
  addingLaneId = null,
  onSubmitNewCard,
  onCancelAddCard,
  onAddLane,
  onRenameLane,
  onRecolorLane,
  onDeleteLane,
  onReorderLanes,
  storage_key,
}: BoardKanbanProps<TRow>) {
  const root_ref = useRef<HTMLDivElement>(null);
  const [board_height, setBoardHeight] = useState<number | null>(null);
  const [editing_lane_id, setEditingLaneId] = useState<string | null>(null);
  const [active_drag, setActiveDrag] = useState<{ type: "card" | "lane"; id: string } | null>(null);
  const [over_lane_id, setOverLaneId] = useState<string | null>(null);
  const [landed_row_id, setLandedRowId] = useState<string | null>(null);
  const [pending_delete_lane_id, setPendingDeleteLaneId] = useState<string | null>(null);
  const [collapsed_lane_ids, setCollapsedLaneIds] = useState<string[]>(() => readCollapsedLaneIds(storage_key));
  // A dropped lane keeps its new spot until the `lanes` prop catches up
  // (the parent saves the new option order asynchronously).
  const [lane_order_override, setLaneOrderOverride] = useState<{ for_lanes: BoardKanbanLane<TRow>[]; order: string[] } | null>(null);
  const [lane_ids, setLaneIds] = useState<Record<string, string[]>>(() => laneIdMap(lanes, getRowId));
  // Mirrors `lane_ids` synchronously. `onDragOver` can fire several times per
  // pointer move before React commits, so reads through the closed over state
  // could see a stale snapshot mid drag. Every write goes through `applyLaneIds`.
  const lane_ids_ref = useRef<Record<string, string[]>>(lane_ids);
  const drag_start_lane_ids = useRef<Record<string, string[]>>(lane_ids);
  const is_dragging = useRef(false);
  const last_over_id = useRef<UniqueIdentifier | null>(null);
  const moved_to_new_lane = useRef(false);
  const landed_timer = useRef<number | null>(null);

  const applyLaneIds = (next: Record<string, string[]>) => {
    lane_ids_ref.current = next;
    setLaneIds(next);
  };

  const ordered_lanes = useMemo(() => {
    if (!lane_order_override || lane_order_override.for_lanes !== lanes) return lanes;
    const order_index = new Map(lane_order_override.order.map((id, index) => [id, index]));
    return [...lanes].sort(
      (a, b) => (order_index.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order_index.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    );
  }, [lanes, lane_order_override]);

  const movable_lane_ids = useMemo(
    () => ordered_lanes.filter((lane) => lane.renamable !== false).map((lane) => lane.id),
    [ordered_lanes]
  );

  const rows_by_id: Record<string, TRow> = useMemo(() => {
    const map: Record<string, TRow> = {};
    for (const lane of lanes) for (const row of lane.rows) map[getRowId(row)] = row;
    return map;
  }, [lanes, getRowId]);

  // Re-sync the drag engine's id lists whenever the server driven `lanes`
  // change, except mid drag, so an update made elsewhere can't yank a card
  // out from under the pointer.
  useEffect(() => {
    if (is_dragging.current) return;
    applyLaneIds(laneIdMap(lanes, getRowId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lanes, getRowId]);

  useEffect(() => {
    requestAnimationFrame(() => {
      moved_to_new_lane.current = false;
    });
  }, [lane_ids]);

  useEffect(() => () => {
    if (landed_timer.current !== null) window.clearTimeout(landed_timer.current);
  }, []);

  // Lanes fill the rest of the viewport and scroll on their own, like Asana
  // and Jira, instead of growing the whole page.
  useLayoutEffect(() => {
    const root = root_ref.current;
    if (!root) return;
    const measure = () => {
      const top = root.getBoundingClientRect().top;
      setBoardHeight(Math.max(BOARD_MIN_HEIGHT, Math.round(window.innerHeight - top - BOARD_BOTTOM_GAP)));
    };
    measure();
    const scroll_parent = findScrollParent(root);
    const observer = new ResizeObserver(measure);
    if (scroll_parent) observer.observe(scroll_parent);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const toggleCollapsed = useCallback(
    (lane_id: string) => {
      setCollapsedLaneIds((current) => {
        const next = current.includes(lane_id) ? current.filter((id) => id !== lane_id) : [...current, lane_id];
        writeCollapsedLaneIds(storage_key, next);
        return next;
      });
    },
    [storage_key]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findLaneId = (id: UniqueIdentifier, source: Record<string, string[]> = lane_ids_ref.current): string | null => {
    const value = String(id);
    if (value in source) return value;
    return Object.keys(source).find((lane_id) => source[lane_id].includes(value)) ?? null;
  };

  /**
   * Lanes only collide with other lanes. Cards first find the lane under the
   * pointer, then the closest card inside it, so an empty or collapsed lane
   * is just as easy to hit as a full one (dnd-kit's multiple containers recipe).
   */
  const collisionDetection: CollisionDetection = useCallback((args) => {
    if (args.active.data.current?.type === "lane") {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter((container) => container.data.current?.type === "lane"),
      });
    }

    const card_targets = args.droppableContainers.filter((container) => container.data.current?.type !== "lane");
    const pointer_hits = pointerWithin({ ...args, droppableContainers: card_targets });
    const hits = pointer_hits.length > 0 ? pointer_hits : rectIntersection({ ...args, droppableContainers: card_targets });
    let over_id = getFirstCollision(hits, "id");

    if (over_id != null) {
      const lane_hit = hits.find((hit) => String(hit.id) in lane_ids_ref.current);
      if (lane_hit) {
        const lane_cards = lane_ids_ref.current[String(lane_hit.id)] ?? [];
        const closest_card = closestCenter({
          ...args,
          droppableContainers: card_targets.filter((container) => lane_cards.includes(String(container.id))),
        });
        over_id = closest_card[0]?.id ?? lane_hit.id;
      }
      last_over_id.current = over_id;
      return [{ id: over_id }];
    }

    // Right after a card switches lanes the layout shifts under the pointer,
    // keep pointing at it for one frame instead of bouncing back.
    if (moved_to_new_lane.current) last_over_id.current = args.active.id;
    return last_over_id.current != null ? [{ id: last_over_id.current }] : [];
  }, []);

  const resetDragState = () => {
    is_dragging.current = false;
    last_over_id.current = null;
    setActiveDrag(null);
    setOverLaneId(null);
  };

  const flashLandedCard = (row_id: string) => {
    if (landed_timer.current !== null) window.clearTimeout(landed_timer.current);
    // Waits for the drop glide to finish so the pulse plays on the visible card.
    landed_timer.current = window.setTimeout(() => {
      setLandedRowId(row_id);
      landed_timer.current = window.setTimeout(() => setLandedRowId(null), LANDED_HIGHLIGHT_MS);
    }, DROP_ANIMATION_MS);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const lane_id = laneIdFromSortableId(event.active.id);
    is_dragging.current = true;
    drag_start_lane_ids.current = lane_ids_ref.current;
    setActiveDrag(lane_id ? { type: "lane", id: lane_id } : { type: "card", id: String(event.active.id) });
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.data.current?.type === "lane") return;
    const active_id = String(active.id);
    const over_id = String(over.id);
    const current = lane_ids_ref.current;
    const from_lane = findLaneId(active_id, current);
    const to_lane = findLaneId(over_id, current);
    setOverLaneId(to_lane);
    if (!from_lane || !to_lane || from_lane === to_lane) return;

    const source = current[from_lane].filter((id) => id !== active_id);
    const destination = [...current[to_lane]];
    const over_index = destination.indexOf(over_id);
    let insert_at = destination.length;
    if (over_index >= 0) {
      const translated = active.rect.current.translated;
      const is_below_over = translated !== null && translated.top > over.rect.top + over.rect.height / 2;
      insert_at = over_index + (is_below_over ? 1 : 0);
    }
    destination.splice(insert_at, 0, active_id);
    moved_to_new_lane.current = true;
    applyLaneIds({ ...current, [from_lane]: source, [to_lane]: destination });
  };

  const handleLaneDragEnd = (event: DragEndEvent) => {
    const active_lane_id = laneIdFromSortableId(event.active.id);
    const over_lane = event.over ? laneIdFromSortableId(event.over.id) : null;
    if (!active_lane_id || !over_lane || active_lane_id === over_lane) return;
    const from_index = movable_lane_ids.indexOf(active_lane_id);
    const to_index = movable_lane_ids.indexOf(over_lane);
    if (from_index === -1 || to_index === -1) return;
    const next_order = arrayMove(movable_lane_ids, from_index, to_index);
    setLaneOrderOverride({ for_lanes: lanes, order: next_order });
    onReorderLanes?.(next_order);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const was_lane = event.active.data.current?.type === "lane";
    resetDragState();
    if (was_lane) {
      handleLaneDragEnd(event);
      return;
    }

    const { active, over } = event;
    const active_id = String(active.id);
    // Must come from the drag start snapshot, `handleDragOver` has already
    // relocated the active card into its (possibly final) lane by now.
    const started_lane = findLaneId(active_id, drag_start_lane_ids.current);
    if (!over) {
      applyLaneIds(laneIdMap(lanes, getRowId));
      return;
    }

    const current = lane_ids_ref.current;
    const final_lane = findLaneId(active_id, current);
    if (!final_lane) return;

    const over_id = String(over.id);
    const current_order = current[final_lane];
    const from_index = current_order.indexOf(active_id);
    const to_index = current_order.indexOf(over_id);
    const final_order =
      from_index !== -1 && to_index !== -1 && from_index !== to_index ? arrayMove(current_order, from_index, to_index) : current_order;
    if (final_order !== current_order) applyLaneIds({ ...current, [final_lane]: final_order });

    if (final_lane !== started_lane) {
      onMoveCard?.(active_id, final_lane);
      onReorderCards?.(final_lane, final_order);
      flashLandedCard(active_id);
      return;
    }
    if (final_order !== current_order) {
      onReorderCards?.(final_lane, final_order);
      flashLandedCard(active_id);
    }
  };

  const laneLabel = (lane_id: string | null): string =>
    (lane_id && ordered_lanes.find((lane) => lane.id === lane_id)?.label) || "a lane";

  const describeDraggable = (id: UniqueIdentifier): string => {
    const lane_id = laneIdFromSortableId(id);
    if (lane_id) return `lane ${laneLabel(lane_id)}`;
    const row = rows_by_id[String(id)];
    return row && getRowTitle ? `task ${getRowTitle(row)}` : "task";
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${describeDraggable(active.id)}.`,
    onDragOver: ({ active, over }) => {
      if (!over) return `${describeDraggable(active.id)} is no longer over a lane.`;
      const lane_id = laneIdFromSortableId(over.id) ?? findLaneId(over.id);
      return `${describeDraggable(active.id)} is over ${laneLabel(lane_id)}.`;
    },
    onDragEnd: ({ active, over }) => {
      if (!over) return `${describeDraggable(active.id)} was dropped back where it started.`;
      const lane_id = laneIdFromSortableId(over.id) ?? findLaneId(over.id);
      return `${describeDraggable(active.id)} was dropped in ${laneLabel(lane_id)}.`;
    },
    onDragCancel: ({ active }) => `Moving ${describeDraggable(active.id)} was cancelled.`,
  };

  const active_row = active_drag?.type === "card" ? rows_by_id[active_drag.id] ?? null : null;
  const active_lane = active_drag?.type === "lane" ? ordered_lanes.find((lane) => lane.id === active_drag.id) ?? null : null;
  const active_row_lane_color =
    active_row && active_drag ? ordered_lanes.find((lane) => lane.id === findLaneId(active_drag.id, lane_ids))?.color : undefined;
  const pending_delete_lane = pending_delete_lane_id ? ordered_lanes.find((lane) => lane.id === pending_delete_lane_id) ?? null : null;
  const pending_delete_count = pending_delete_lane ? (lane_ids[pending_delete_lane.id] ?? []).length : 0;
  const can_reorder_lanes = Boolean(onReorderLanes);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      accessibility={{ announcements }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        resetDragState();
        applyLaneIds(laneIdMap(lanes, getRowId));
      }}
    >
      <div
        ref={root_ref}
        className="board-kanban"
        style={board_height ? ({ "--kanban-board-height": `${board_height}px` } as React.CSSProperties) : undefined}
      >
        <div className="board-kanban__scroller shell-scrollbar" data-dragging={active_drag ? "" : undefined}>
          <SortableContext items={movable_lane_ids.map(laneSortableId)} strategy={horizontalListSortingStrategy}>
            {ordered_lanes.map((lane) => (
              <KanbanLane
                key={lane.id}
                lane={lane}
                row_ids={lane_ids[lane.id] ?? []}
                rows_by_id={rows_by_id}
                is_over={active_drag?.type === "card" && over_lane_id === lane.id}
                is_collapsed={collapsed_lane_ids.includes(lane.id)}
                is_lane_draggable={can_reorder_lanes && lane.renamable !== false}
                is_editing_title={editing_lane_id === lane.id}
                landed_row_id={landed_row_id}
                selectedRowId={selectedRowId}
                isRowDone={isRowDone}
                onCardClick={onCardClick}
                renderCard={renderCard}
                can_drag_cards={Boolean(onMoveCard)}
                is_adding={addingLaneId === lane.id}
                onAddCard={
                  onAddCard
                    ? (lane_id) => {
                        if (collapsed_lane_ids.includes(lane_id)) toggleCollapsed(lane_id);
                        onAddCard(lane_id);
                      }
                    : undefined
                }
                onSubmitNewCard={onSubmitNewCard}
                onCancelAddCard={onCancelAddCard}
                onToggleCollapsed={toggleCollapsed}
                onStartRename={setEditingLaneId}
                onFinishRename={() => setEditingLaneId(null)}
                onRenameLane={onRenameLane}
                onRecolorLane={onRecolorLane}
                onRequestDeleteLane={onDeleteLane ? setPendingDeleteLaneId : undefined}
              />
            ))}
          </SortableContext>

          {onAddLane && <AddLaneControl onAddLane={onAddLane} />}
        </div>
      </div>

      <DragOverlay
        className="board-kanban-overlay"
        dropAnimation={drop_animation}
        style={active_row_lane_color ? ({ "--kanban-lane-color": active_row_lane_color } as React.CSSProperties) : undefined}
      >
        {active_row ? (
          <div className="kanban-card" data-done={isRowDone?.(active_row) || undefined}>
            {renderCard(active_row)}
          </div>
        ) : active_lane ? (
          <LanePreview lane={active_lane} row_ids={lane_ids[active_lane.id] ?? []} rows_by_id={rows_by_id} renderCard={renderCard} />
        ) : null}
      </DragOverlay>

      <ConfirmActionModal
        is_open={pending_delete_lane !== null}
        title="Delete lane"
        description={
          pending_delete_lane ? (
            <>
              Delete the <strong>{pending_delete_lane.label}</strong> lane?{" "}
              {pending_delete_count > 0
                ? `Its ${pending_delete_count} ${pending_delete_count === 1 ? "task is" : "tasks are"} kept and moved to "No status".`
                : "It has no tasks."}
            </>
          ) : (
            ""
          )
        }
        confirm_label="Delete lane"
        variant="danger"
        onClose={() => setPendingDeleteLaneId(null)}
        onConfirm={() => {
          if (pending_delete_lane) onDeleteLane?.(pending_delete_lane.id);
          setPendingDeleteLaneId(null);
        }}
      />
    </DndContext>
  );
}

export default BoardKanban;
