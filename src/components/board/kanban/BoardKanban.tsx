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
import { DragHandleIcon, PlusIcon } from "@/icons/board-icons";
import InlineTitleEditor from "../InlineTitleEditor";

export type BoardKanbanLane<TRow> = {
  id: string;
  label: string;
  color: string;
  rows: TRow[];
  /** Lanes without a real backing option (e.g. the "No status" bucket) can't be renamed. */
  renamable?: boolean;
};

/** Perceived-luminance check so a lane's colored header always keeps readable text, whatever hex it's given. */
const getReadableTextColor = (hex: string): string => {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized;
  const r = parseInt(full.substring(0, 2), 16) || 0;
  const g = parseInt(full.substring(2, 4), 16) || 0;
  const b = parseInt(full.substring(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1a2b2b" : "#ffffff";
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
    <div className="rounded-[10px] border bg-shell-panel p-2 shadow-sm" style={{ borderColor: color }}>
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
        className="w-full rounded-[6px] border border-brand-500 bg-shell-bg px-2 py-1.5 text-[13px] text-shell-text outline-none"
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
  lane_color: string;
  is_selected: boolean;
  can_drag: boolean;
  onCardClick?: (row: TRow) => void;
  renderCard: (row: TRow) => React.ReactNode;
};

function SortableCard<TRow>({ row, row_id, lane_color, is_selected, can_drag, onCardClick, renderCard }: SortableCardProps<TRow>) {
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
        borderLeftWidth: 3,
        borderLeftColor: lane_color,
      }}
      {...(can_drag ? attributes : {})}
      {...(can_drag ? listeners : {})}
      onClick={onCardClick ? () => onCardClick(row) : undefined}
      className={`group relative rounded-lg border bg-shell-panel p-2.5 pl-3 transition-shadow duration-150 ${
        onCardClick ? "cursor-pointer" : ""
      } ${can_drag ? "cursor-grab touch-none active:cursor-grabbing" : ""} ${
        isDragging
          ? "opacity-0"
          : is_selected
            ? "border-brand-500 shadow-sm ring-1 ring-brand-500/35"
            : "border-shell-border hover:-translate-y-0.5 hover:border-shell-border-strong hover:shadow-md"
      }`}
    >
      {can_drag && (
        <span className="pointer-events-none absolute right-1.5 top-1.5 text-shell-text-faint opacity-0 transition-opacity group-hover:opacity-70">
          <DragHandleIcon size={9} />
        </span>
      )}
      {renderCard(row)}
    </div>
  );
}

/** A static (non-interactive) copy of a card's content, used inside the drag overlay so the "held" card renders identically to its resting state, just elevated. */
function CardPreview<TRow>({ row, lane_color, renderCard }: { row: TRow; lane_color: string; renderCard: (row: TRow) => React.ReactNode }) {
  return (
    <div
      className="rounded-lg border border-shell-border-strong bg-shell-panel p-2.5 pl-3 shadow-xl ring-1 ring-black/5"
      style={{ borderLeftWidth: 3, borderLeftColor: lane_color, width: LANE_WIDTH - 16 }}
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
  const header_text_color = getReadableTextColor(lane.color);

  return (
    <div
      className="flex flex-none flex-col overflow-hidden rounded-xl border border-shell-border bg-shell-panel-alt shadow-sm transition-shadow duration-150"
      style={{
        width: LANE_WIDTH,
        boxShadow: is_over ? `0 0 0 2px ${lane.color}, 0 4px 14px rgba(0,0,0,0.12)` : undefined,
      }}
    >
      <div
        className="flex flex-none items-center gap-2 px-3 py-2.5"
        style={{ background: lane.color, color: header_text_color }}
      >
        {editing_lane_id === lane.id ? (
          <InlineTitleEditor
            value={lane.label}
            onCommit={(label) => {
              onRenameLane?.(lane.id, label);
              setEditingLaneId(null);
            }}
            onCancel={() => setEditingLaneId(null)}
            className="min-w-0 flex-1 text-[13px] font-semibold text-shell-text"
            style={{ background: "rgba(255,255,255,0.96)" }}
            aria_label="Rename lane"
          />
        ) : (
          <span
            onClick={onRenameLane && lane.renamable !== false ? () => setEditingLaneId(lane.id) : undefined}
            className={`min-w-0 flex-1 truncate text-[13px] font-semibold ${
              onRenameLane && lane.renamable !== false ? "cursor-text hover:opacity-80" : ""
            }`}
            title={onRenameLane && lane.renamable !== false ? "Click to rename" : undefined}
          >
            {lane.label}
          </span>
        )}
        <span
          className="flex-none rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
          style={{ background: header_text_color === "#ffffff" ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.1)" }}
        >
          {row_ids.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className="shell-scrollbar flex flex-col gap-2 overflow-y-auto px-2 pb-2 pt-2"
        style={{ maxHeight: LANE_BODY_MAX_HEIGHT }}
      >
        <SortableContext items={row_ids} strategy={verticalListSortingStrategy}>
          {row_ids.length === 0 && addingLaneId !== lane.id && (
            <div className="rounded-lg border border-dashed border-shell-border px-2.5 py-4 text-center text-[11.5px] text-shell-text-faint">
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
                lane_color={lane.color}
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
              className="flex items-center gap-1.5 rounded-[7px] px-2 py-1.5 text-left text-[12.5px] font-medium text-shell-text-faint transition-colors hover:bg-shell-hover hover:text-shell-text"
            >
              <PlusIcon size={12} />
              Add card
            </button>
          ))}
      </div>
    </div>
  );
}

/**
 * Generic, reusable Monday-style Kanban board built on `@dnd-kit`: fixed-width
 * lanes with a full-color header, a scrollable card stack (each lane scrolls
 * independently once it grows past the viewport), smooth pointer/keyboard
 * drag-and-drop both between lanes and within a lane, and a floating drag
 * overlay so the held card never gets clipped by a lane's own scroll
 * container. Callers supply the lanes (already partitioned) and a
 * `renderCard` function, so any board view whose rows can be bucketed into
 * lanes can reuse this shell — mirroring how `BoardTable` takes `renderCell`
 * instead of owning cell layout itself.
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
  const active_lane = active_row_id ? lanes.find((lane) => lane_ids[lane.id]?.includes(active_row_id)) : null;

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
      <div className="shell-scrollbar flex items-start gap-4 overflow-x-auto pb-4 pt-1">
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
            className="group flex flex-none flex-col items-center justify-center gap-2 self-start rounded-xl border-2 border-dashed border-shell-border px-4 py-8 text-shell-text-muted transition-colors hover:border-brand-400 hover:bg-shell-hover hover:text-shell-text"
            style={{ width: LANE_WIDTH }}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-shell-hover text-shell-text-muted transition-colors group-hover:bg-brand-500/15 group-hover:text-brand-500">
              <PlusIcon size={15} />
            </span>
            <span className="text-[12.5px] font-semibold">Add lane</span>
          </button>
        )}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {active_row && active_lane ? <CardPreview row={active_row} lane_color={active_lane.color} renderCard={renderCard} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

export default BoardKanban;
