"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PlusIcon } from "@/icons/board-icons";
import { ChevronRightIcon, MoreDotsIcon } from "@/icons/workspace-icons";
import InlineTitleEditor from "../InlineTitleEditor";
import BoardPopover from "../toolbar/BoardPopover";
import { KANBAN_COLORS } from "./kanbanDesign";

export type BoardKanbanLane<TRow> = {
  id: string;
  label: string;
  color: string;
  rows: TRow[];
  /** Lanes without a real backing option (e.g. the "No status" bucket) can't be renamed. */
  renamable?: boolean;
};

type AddCardInputProps = {
  color: string;
  onSubmit: (title: string) => void;
  onCancel: () => void;
};

/** Mirrors `BoardTable`'s `AddItemInputRow` — an in-place text input replacing "+ Add card" while composing. */
const AddCardInput: React.FC<AddCardInputProps> = ({ color, onSubmit, onCancel }) => {
  const [value, setValue] = useState("");
  const input_ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input_ref.current?.focus();
  }, []);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
    else onCancel();
  };

  return (
    <div className="rounded-[9px] border bg-shell-panel p-2 shadow-[0_1px_2px_rgba(10,23,23,0.05)]" style={{ borderColor: color }}>
      <input
        ref={input_ref}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          } else if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        onBlur={commit}
        placeholder="Card title"
        style={{ borderColor: color, color: KANBAN_COLORS.text_strong }}
        className="w-full rounded-[6px] border bg-shell-panel px-2 py-1.5 text-[13px] outline-none"
      />
    </div>
  );
};

export type BoardKanbanProps<TRow> = {
  lanes: BoardKanbanLane<TRow>[];
  getRowId: (row: TRow) => string;
  /** Renders one card's content — the caller owns the layout (title, status chip, avatars, …), mirroring `BoardTable`'s `renderCell`. */
  renderCard: (row: TRow) => React.ReactNode;
  onCardClick?: (row: TRow) => void;
  selectedRowId?: string | null;
  /** Fired when a card is dropped into a different lane — omit to make lanes drop targets inert. */
  onMoveCard?: (row_id: string, lane_id: string) => void;
  /** Fired when a card is dropped at a new position within its (possibly unchanged) lane, with the lane's full new card order. */
  onReorderCards?: (lane_id: string, ordered_row_ids: string[]) => void;
  onAddCard?: (lane_id: string) => void;
  /** Which lane currently has its inline "add card" composer open. */
  addingLaneId?: string | null;
  onSubmitNewCard?: (lane_id: string, title: string) => void;
  onCancelAddCard?: () => void;
  /** Appends a new lane (e.g. a new status option) — omit to hide the trailing "+" lane. */
  onAddLane?: () => void;
  /** Renames a lane (e.g. the backing status option's label) — omit to make lane headers read-only. */
  onRenameLane?: (lane_id: string, label: string) => void;
};

const LANE_WIDTH = 288;
const LANE_BODY_MAX_HEIGHT = "min(62vh, 720px)";

type BoardBySortedIds<TRow> = Record<string, TRow>;

/** Builds the drag engine's working copy of each lane's card-id order from the (server-driven) `lanes` prop. */
function laneIdMap<TRow>(lanes: BoardKanbanLane<TRow>[], getRowId: (row: TRow) => string): Record<string, string[]> {
  return Object.fromEntries(lanes.map((lane) => [lane.id, lane.rows.map(getRowId)]));
}

type SortableCardProps<TRow> = {
  row: TRow;
  row_id: string;
  is_selected: boolean;
  can_drag: boolean;
  onCardClick?: (row: TRow) => void;
  renderCard: (row: TRow) => React.ReactNode;
};

/**
 * The card shell owns no padding of its own — `renderCard` is responsible for
 * padding its own content.
 */
function SortableCard<TRow>({ row, row_id, is_selected, can_drag, onCardClick, renderCard }: SortableCardProps<TRow>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row_id,
    disabled: !can_drag,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        background: KANBAN_COLORS.card_bg,
        boxShadow: isDragging
          ? "none"
          : is_selected
            ? `0 0 0 2px ${KANBAN_COLORS.text_strong}, ${KANBAN_COLORS.shadow_hover}`
            : KANBAN_COLORS.shadow_resting,
        opacity: isDragging ? 0 : 1,
        borderRadius: KANBAN_COLORS.card_radius,
        border: `1px solid ${is_selected ? "transparent" : "var(--color-shell-border)"}`,
      }}
      {...(can_drag ? attributes : {})}
      {...(can_drag ? listeners : {})}
      onClick={onCardClick ? () => onCardClick(row) : undefined}
      className={`group relative overflow-hidden transition-[box-shadow,transform] duration-150 hover:-translate-y-[3px] ${
        can_drag ? "cursor-grab touch-none active:cursor-grabbing" : onCardClick ? "cursor-pointer" : ""
      }`}
      onMouseEnter={(event) => {
        if (isDragging || is_selected) return;
        event.currentTarget.style.boxShadow = KANBAN_COLORS.shadow_hover;
      }}
      onMouseLeave={(event) => {
        if (isDragging || is_selected) return;
        event.currentTarget.style.boxShadow = KANBAN_COLORS.shadow_resting;
      }}
    >
      {renderCard(row)}
    </div>
  );
}

/** A static (non-interactive) copy of a card's content, used inside the drag overlay so the "held" card renders identically to its resting state, just lifted and tilted — mirrors the redesign's "dragging" state. */
function CardPreview<TRow>({ row, renderCard }: { row: TRow; renderCard: (row: TRow) => React.ReactNode }) {
  return (
    <div
      className="overflow-hidden"
      style={{
        width: LANE_WIDTH - 16,
        background: KANBAN_COLORS.card_bg,
        borderRadius: KANBAN_COLORS.card_radius,
        boxShadow: KANBAN_COLORS.shadow_dragging,
        transform: "rotate(-2deg)",
      }}
    >
      {renderCard(row)}
    </div>
  );
}

type KanbanLaneColumnProps<TRow> = {
  lane: BoardKanbanLane<TRow>;
  row_ids: string[];
  rows_by_id: BoardBySortedIds<TRow>;
  is_over: boolean;
  editing_lane_id: string | null;
  setEditingLaneId: (id: string | null) => void;
  selectedRowId: string | null;
  onCardClick?: (row: TRow) => void;
  renderCard: (row: TRow) => React.ReactNode;
  onMoveCard?: (row_id: string, lane_id: string) => void;
  onAddCard?: (lane_id: string) => void;
  addingLaneId?: string | null;
  onSubmitNewCard?: (lane_id: string, title: string) => void;
  onCancelAddCard?: () => void;
  onRenameLane?: (lane_id: string, label: string) => void;
};

function KanbanLaneColumn<TRow>({
  lane,
  row_ids,
  rows_by_id,
  is_over,
  editing_lane_id,
  setEditingLaneId,
  selectedRowId,
  onCardClick,
  renderCard,
  onMoveCard,
  onAddCard,
  addingLaneId,
  onSubmitNewCard,
  onCancelAddCard,
  onRenameLane,
}: KanbanLaneColumnProps<TRow>) {
  const { setNodeRef } = useDroppable({ id: lane.id, data: { type: "lane", lane_id: lane.id } });
  // Purely local, unpersisted UI state — collapsing a lane just hides its card
  // stack to skim the board faster.
  const [is_collapsed, setIsCollapsed] = useState(false);
  const [kebab_anchor_el, setKebabAnchorEl] = useState<HTMLElement | null>(null);
  const can_rename = Boolean(onRenameLane) && lane.renamable !== false;

  return (
    <div className="group/lane flex flex-none flex-col" style={{ width: LANE_WIDTH }}>
      <div className="flex flex-none items-center gap-[7px] px-1 pb-3 pt-1">
        <button
          type="button"
          onClick={() => setIsCollapsed((current) => !current)}
          className="flex-none rounded-[6px] p-0.5 opacity-0 transition-[transform,opacity,background-color] duration-150 hover:bg-shell-hover group-hover/lane:opacity-100"
          style={{ color: KANBAN_COLORS.icon_default, transform: is_collapsed ? "rotate(0deg)" : "rotate(90deg)" }}
          aria-label={is_collapsed ? "Expand list" : "Collapse list"}
          title={is_collapsed ? "Expand list" : "Collapse list"}
        >
          <ChevronRightIcon size={11} />
        </button>
        <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: lane.color }} />
        {editing_lane_id === lane.id ? (
          <InlineTitleEditor
            value={lane.label}
            onCommit={(label) => {
              onRenameLane?.(lane.id, label);
              setEditingLaneId(null);
            }}
            onCancel={() => setEditingLaneId(null)}
            className="min-w-0 flex-1 text-[14.5px] font-extrabold"
            style={{ color: KANBAN_COLORS.text_strong }}
            aria_label="Rename lane"
          />
        ) : (
          <span
            onClick={can_rename ? () => setEditingLaneId(lane.id) : undefined}
            className={`min-w-0 flex-1 truncate text-[14.5px] font-extrabold tracking-tight ${can_rename ? "cursor-text hover:opacity-80" : ""}`}
            style={{ color: KANBAN_COLORS.text_strong }}
            title={can_rename ? "Click to rename" : undefined}
          >
            {lane.label}
          </span>
        )}
        <span className="flex-none text-[13px] font-bold" style={{ color: KANBAN_COLORS.text_faded }}>
          {row_ids.length}
        </span>
        <span className="ml-auto flex flex-none items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover/lane:opacity-100">
          {can_rename && (
            <>
              <button
                type="button"
                onClick={(event) => setKebabAnchorEl(event.currentTarget)}
                className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[7px] transition-colors hover:bg-shell-hover"
                style={{ color: KANBAN_COLORS.icon_default }}
                aria-label="List actions"
                title="List actions"
              >
                <MoreDotsIcon size={14} />
              </button>
              <BoardPopover anchor_el={kebab_anchor_el} is_open={kebab_anchor_el !== null} onClose={() => setKebabAnchorEl(null)} align="end" width={160}>
                <button
                  type="button"
                  onClick={() => {
                    setEditingLaneId(lane.id);
                    setKebabAnchorEl(null);
                  }}
                  className="w-full rounded-md px-2.5 py-1.5 text-left text-[12.5px] font-medium hover:bg-shell-hover"
                  style={{ color: KANBAN_COLORS.text_strong }}
                >
                  Rename list
                </button>
              </BoardPopover>
            </>
          )}
          {onAddCard && (
            <button
              type="button"
              onClick={() => onAddCard(lane.id)}
              className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[7px] transition-colors hover:bg-shell-hover"
              style={{ color: KANBAN_COLORS.icon_default }}
              aria-label="Add card"
              title="Add card"
            >
              <PlusIcon size={13} />
            </button>
          )}
        </span>
      </div>

      {is_collapsed ? (
        <div ref={setNodeRef} className="rounded-[12px] px-2.5 py-3 text-[11.5px]" style={{ color: KANBAN_COLORS.text_placeholder }}>
          {row_ids.length} card{row_ids.length === 1 ? "" : "s"} hidden
        </div>
      ) : (
        <div
          ref={setNodeRef}
          className="shell-scrollbar flex flex-col gap-3 overflow-y-auto overflow-x-hidden rounded-[16px] p-1 transition-shadow duration-150"
          style={{
            maxHeight: LANE_BODY_MAX_HEIGHT,
            boxShadow: is_over ? `inset 0 0 0 2px ${lane.color}` : undefined,
          }}
        >
          <SortableContext items={row_ids} strategy={verticalListSortingStrategy}>
            {row_ids.length === 0 && addingLaneId !== lane.id && (
              <div
                className="rounded-[9px] border border-dashed px-2.5 py-4 text-center text-[11.5px]"
                style={{ borderColor: KANBAN_COLORS.border_default, color: KANBAN_COLORS.text_placeholder }}
              >
                No cards yet
              </div>
            )}

            {row_ids.map((row_id) => {
              const row = rows_by_id[row_id];
              if (!row) return null;
              return (
                <SortableCard
                  key={row_id}
                  row={row}
                  row_id={row_id}
                  is_selected={selectedRowId === row_id}
                  can_drag={Boolean(onMoveCard)}
                  onCardClick={onCardClick}
                  renderCard={renderCard}
                />
              );
            })}
          </SortableContext>

          {onAddCard &&
            (addingLaneId === lane.id ? (
              <AddCardInput
                color={lane.color}
                onSubmit={(title) => onSubmitNewCard?.(lane.id, title)}
                onCancel={() => onCancelAddCard?.()}
              />
            ) : (
              <button
                type="button"
                onClick={() => onAddCard(lane.id)}
                className="flex items-center gap-1.5 rounded-[8px] px-2 py-2 text-left text-[12.5px] font-semibold text-shell-text-faint transition-colors hover:bg-shell-hover hover:text-shell-text-secondary"
              >
                <PlusIcon size={13} />
                Add task
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/**
 * Generic, reusable Trello/Monday-style Kanban board built on `@dnd-kit`:
 * fixed-width lanes with a color-accented header (collapsible via the eye
 * toggle), a scrollable card stack (each lane scrolls independently once it
 * grows past the viewport), smooth pointer/keyboard drag-and-drop both
 * between lanes and within a lane, and a floating drag overlay so the held
 * card never gets clipped by a lane's own scroll container. Callers supply
 * the lanes (already partitioned) and a `renderCard` function that owns its
 * own padding, so any board view whose rows can be bucketed into lanes can
 * reuse this shell — mirroring
 * how `BoardTable` takes `renderCell` instead of owning cell layout itself.
 */
function BoardKanban<TRow>({
  lanes,
  getRowId,
  renderCard,
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
}: BoardKanbanProps<TRow>) {
  const [editing_lane_id, setEditingLaneId] = useState<string | null>(null);
  const [active_row_id, setActiveRowId] = useState<string | null>(null);
  const [over_lane_id, setOverLaneId] = useState<string | null>(null);
  const [lane_ids, setLaneIds] = useState<Record<string, string[]>>(() => laneIdMap(lanes, getRowId));
  // Mirrors `lane_ids` synchronously. `onDragOver` can fire multiple times
  // per pointer move before React commits a re-render, so reads that go
  // through the closed-over `lane_ids` state risk seeing a stale snapshot
  // mid-drag (event N+1 not yet reflecting event N's move) — that skew was
  // enough to leave the source lane's untouched cards visually reordered
  // after a same-tick sequence of drag-over events. Every write goes through
  // `applyLaneIds` below, which updates this ref and the state together.
  const lane_ids_ref = useRef<Record<string, string[]>>(lane_ids);
  const drag_start_lane_ids = useRef<Record<string, string[]>>(lane_ids);
  const is_dragging = useRef(false);

  const applyLaneIds = (next: Record<string, string[]>) => {
    lane_ids_ref.current = next;
    setLaneIds(next);
  };

  const rows_by_id: BoardBySortedIds<TRow> = React.useMemo(() => {
    const map: BoardBySortedIds<TRow> = {};
    for (const lane of lanes) for (const row of lane.rows) map[getRowId(row)] = row;
    return map;
  }, [lanes, getRowId]);

  // Re-sync the drag engine's local id lists whenever the server-driven `lanes`
  // prop changes — skipped mid-drag so an in-flight optimistic update from the
  // parent (e.g. an item edited elsewhere) can't yank a card out from under the pointer.
  useEffect(() => {
    if (is_dragging.current) return;
    applyLaneIds(laneIdMap(lanes, getRowId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lanes, getRowId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findLaneId = (id: string, source: Record<string, string[]> = lane_ids_ref.current): string | null => {
    if (id in source) return id;
    return Object.keys(source).find((lane_id) => source[lane_id].includes(id)) ?? null;
  };

  const collisionDetection: CollisionDetection = closestCorners;

  const handleDragStart = (event: DragStartEvent) => {
    is_dragging.current = true;
    drag_start_lane_ids.current = lane_ids_ref.current;
    setActiveRowId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const active_id = String(active.id);
    const over_id = String(over.id);
    const current = lane_ids_ref.current;
    const from_lane = findLaneId(active_id, current);
    const to_lane = findLaneId(over_id, current);
    setOverLaneId(to_lane);
    if (!from_lane || !to_lane || from_lane === to_lane) return;

    const source = current[from_lane].filter((id) => id !== active_id);
    const destination_index = current[to_lane].indexOf(over_id);
    const destination = [...current[to_lane]];
    const insert_at = destination_index >= 0 ? destination_index : destination.length;
    destination.splice(insert_at, 0, active_id);
    applyLaneIds({ ...current, [from_lane]: source, [to_lane]: destination });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    is_dragging.current = false;
    setActiveRowId(null);
    setOverLaneId(null);

    const { active, over } = event;
    const active_id = String(active.id);
    // Must come from the drag-start snapshot, not a fresh lookup — the
    // active card has already been relocated into its (possibly final)
    // lane by `handleDragOver` by the time the drop fires.
    const started_lane =
      Object.keys(drag_start_lane_ids.current).find((lane_id) => drag_start_lane_ids.current[lane_id].includes(active_id)) ??
      null;
    if (!over) return;

    const current = lane_ids_ref.current;
    const final_lane = findLaneId(active_id, current);
    if (!final_lane) return;

    // Same-lane reorder: dropped on another card still inside the origin lane.
    const over_id = String(over.id);
    if (final_lane === started_lane && over_id !== final_lane) {
      const current_order = current[final_lane];
      const from_index = current_order.indexOf(active_id);
      const to_index = current_order.indexOf(over_id);
      if (from_index !== -1 && to_index !== -1 && from_index !== to_index) {
        const reordered = [...current_order];
        reordered.splice(from_index, 1);
        reordered.splice(to_index, 0, active_id);
        applyLaneIds({ ...current, [final_lane]: reordered });
        onReorderCards?.(final_lane, reordered);
      }
      return;
    }

    if (final_lane !== started_lane) {
      onMoveCard?.(active_id, final_lane);
      onReorderCards?.(final_lane, current[final_lane]);
    }
  };

  const active_row = active_row_id ? rows_by_id[active_row_id] : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        is_dragging.current = false;
        setActiveRowId(null);
        setOverLaneId(null);
        applyLaneIds(laneIdMap(lanes, getRowId));
      }}
    >
      <div
        className="rounded-[20px] p-4"
        style={{ background: KANBAN_COLORS.canvas_bg }}
      >
        <div className="shell-scrollbar flex items-start gap-5 overflow-x-auto pb-2 pt-1">
          {lanes.map((lane) => (
            <KanbanLaneColumn
              key={lane.id}
              lane={lane}
              row_ids={lane_ids[lane.id] ?? []}
              rows_by_id={rows_by_id}
              is_over={over_lane_id === lane.id}
              editing_lane_id={editing_lane_id}
              setEditingLaneId={setEditingLaneId}
              selectedRowId={selectedRowId}
              onCardClick={onCardClick}
              renderCard={renderCard}
              onMoveCard={onMoveCard}
              onAddCard={onAddCard}
              addingLaneId={addingLaneId}
              onSubmitNewCard={onSubmitNewCard}
              onCancelAddCard={onCancelAddCard}
              onRenameLane={onRenameLane}
            />
          ))}

          {onAddLane && (
            <button
              type="button"
              onClick={onAddLane}
              className="group flex flex-none flex-col items-center justify-center gap-2 self-start rounded-[14px] border-2 border-dashed px-4 py-8 text-shell-text-faint transition-colors hover:bg-shell-hover hover:text-shell-text"
              style={{ width: LANE_WIDTH, borderColor: KANBAN_COLORS.border_default }}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-shell-hover text-shell-text-faint transition-colors group-hover:bg-shell-panel group-hover:text-shell-text">
                <PlusIcon size={15} />
              </span>
              <span className="text-[12.5px] font-semibold">Add lane</span>
            </button>
          )}
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {active_row ? <CardPreview row={active_row} renderCard={renderCard} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

export default BoardKanban;
