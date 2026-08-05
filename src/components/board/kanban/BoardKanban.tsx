"use client";
import React, { useEffect, useRef, useState } from "react";
import { PlusIcon } from "@/icons/board-icons";
import InlineTitleEditor from "../InlineTitleEditor";

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
    <div className="rounded-[7px] border bg-shell-bg p-1.5" style={{ borderColor: color }}>
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
        className="w-full rounded-[5px] border border-brand-500 bg-shell-bg px-2 py-1 text-[13px] text-shell-text outline-none"
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
  /** Drag-and-drop between lanes — omit to make lanes drop targets inert. */
  onMoveCard?: (row_id: string, lane_id: string) => void;
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

const LANE_WIDTH = 272;

/**
 * Generic, reusable Monday-style Kanban board: fixed-width lanes with a
 * scrollable card stack and native HTML5 drag-and-drop between them. Callers
 * supply the lanes (already partitioned) and a `renderCard` function, so any
 * board view whose rows can be bucketed into lanes can reuse this shell —
 * mirroring how `BoardTable` takes `renderCell` instead of owning cell
 * layout itself.
 */
function BoardKanban<TRow>({
  lanes,
  getRowId,
  renderCard,
  onCardClick,
  selectedRowId = null,
  onMoveCard,
  onAddCard,
  addingLaneId = null,
  onSubmitNewCard,
  onCancelAddCard,
  onAddLane,
  onRenameLane,
}: BoardKanbanProps<TRow>) {
  const [drag_row_id, setDragRowId] = useState<string | null>(null);
  const [drag_over_lane_id, setDragOverLaneId] = useState<string | null>(null);
  const [editing_lane_id, setEditingLaneId] = useState<string | null>(null);

  const handleDrop = (lane_id: string) => {
    setDragOverLaneId(null);
    if (drag_row_id && onMoveCard) onMoveCard(drag_row_id, lane_id);
    setDragRowId(null);
  };

  return (
    <div className="flex items-start gap-3 overflow-x-auto pb-4">
      {lanes.map((lane) => (
        <div
          key={lane.id}
          onDragOver={(event) => {
            if (!onMoveCard) return;
            event.preventDefault();
            setDragOverLaneId(lane.id);
          }}
          onDragLeave={() => setDragOverLaneId((current) => (current === lane.id ? null : current))}
          onDrop={(event) => {
            if (!onMoveCard) return;
            event.preventDefault();
            handleDrop(lane.id);
          }}
          className={`flex flex-none flex-col rounded-[9px] bg-shell-panel-alt transition-colors ${
            drag_over_lane_id === lane.id ? "ring-2 ring-brand-500" : ""
          }`}
          style={{ width: LANE_WIDTH }}
        >
          <div className="flex items-center gap-2 px-3 py-2.5">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: lane.color }} />
            {editing_lane_id === lane.id ? (
              <InlineTitleEditor
                value={lane.label}
                onCommit={(label) => {
                  onRenameLane?.(lane.id, label);
                  setEditingLaneId(null);
                }}
                onCancel={() => setEditingLaneId(null)}
                className="min-w-0 flex-1 text-[13px] font-semibold"
                aria_label="Rename lane"
              />
            ) : (
              <span
                onClick={onRenameLane && lane.renamable !== false ? () => setEditingLaneId(lane.id) : undefined}
                className={`min-w-0 flex-1 truncate text-[13px] font-semibold text-shell-text ${
                  onRenameLane && lane.renamable !== false ? "cursor-text hover:opacity-80" : ""
                }`}
                title={onRenameLane && lane.renamable !== false ? "Click to rename" : undefined}
              >
                {lane.label}
              </span>
            )}
            <span className="flex-none text-[11.5px] font-medium text-shell-text-faint">{lane.rows.length}</span>
          </div>

          <div className="flex flex-col gap-2 px-2 pb-2">
            {lane.rows.map((row) => {
              const row_id = getRowId(row);
              const is_selected = selectedRowId === row_id;
              return (
                <div
                  key={row_id}
                  draggable={Boolean(onMoveCard)}
                  onDragStart={() => setDragRowId(row_id)}
                  onDragEnd={() => setDragRowId(null)}
                  onClick={onCardClick ? () => onCardClick(row) : undefined}
                  className={`rounded-[7px] border bg-shell-bg p-2.5 transition-colors ${
                    onCardClick ? "cursor-pointer" : ""
                  } ${is_selected ? "border-brand-500" : "border-shell-border hover:border-shell-border-strong"}`}
                >
                  {renderCard(row)}
                </div>
              );
            })}

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
      ))}

      {onAddLane && (
        <button
          type="button"
          onClick={onAddLane}
          className="flex h-9 flex-none items-center gap-1.5 rounded-[7px] border border-dashed border-shell-border px-2.5 text-[12.5px] font-medium text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
        >
          <PlusIcon size={13} />
          Add lane
        </button>
      )}
    </div>
  );
}

export default BoardKanban;
