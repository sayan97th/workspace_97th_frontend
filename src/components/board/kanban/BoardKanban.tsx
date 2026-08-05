"use client";
import React, { useEffect, useRef, useState } from "react";
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

const LANE_WIDTH = 288;
const LANE_BODY_MAX_HEIGHT = "min(62vh, 720px)";

/**
 * Generic, reusable Monday-style Kanban board: fixed-width lanes with a
 * full-color header, a scrollable card stack (each lane scrolls
 * independently once it grows past the viewport), and native HTML5
 * drag-and-drop between lanes. Callers supply the lanes (already
 * partitioned) and a `renderCard` function, so any board view whose rows
 * can be bucketed into lanes can reuse this shell — mirroring how
 * `BoardTable` takes `renderCell` instead of owning cell layout itself.
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
    <div className="shell-scrollbar flex items-start gap-4 overflow-x-auto pb-4 pt-1">
      {lanes.map((lane) => {
        const header_text_color = getReadableTextColor(lane.color);
        const is_drag_over = drag_over_lane_id === lane.id;

        return (
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
            className="flex flex-none flex-col overflow-hidden rounded-xl border border-shell-border bg-shell-panel-alt shadow-sm transition-shadow duration-150"
            style={{
              width: LANE_WIDTH,
              boxShadow: is_drag_over ? `0 0 0 2px ${lane.color}, 0 4px 14px rgba(0,0,0,0.12)` : undefined,
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
                {lane.rows.length}
              </span>
            </div>

            <div
              className="shell-scrollbar flex flex-col gap-2 overflow-y-auto px-2 pb-2 pt-2"
              style={{ maxHeight: LANE_BODY_MAX_HEIGHT }}
            >
              {lane.rows.length === 0 && addingLaneId !== lane.id && (
                <div className="rounded-lg border border-dashed border-shell-border px-2.5 py-4 text-center text-[11.5px] text-shell-text-faint">
                  No cards yet
                </div>
              )}

              {lane.rows.map((row) => {
                const row_id = getRowId(row);
                const is_selected = selectedRowId === row_id;
                const is_dragging = drag_row_id === row_id;
                return (
                  <div
                    key={row_id}
                    draggable={Boolean(onMoveCard)}
                    onDragStart={() => setDragRowId(row_id)}
                    onDragEnd={() => setDragRowId(null)}
                    onClick={onCardClick ? () => onCardClick(row) : undefined}
                    className={`group relative rounded-lg border bg-shell-panel p-2.5 pl-3 transition-all duration-150 ${
                      onCardClick ? "cursor-pointer" : ""
                    } ${onMoveCard ? "cursor-grab active:cursor-grabbing" : ""} ${
                      is_dragging
                        ? "scale-[0.98] opacity-40"
                        : is_selected
                          ? "border-brand-500 shadow-sm ring-1 ring-brand-500/35"
                          : "border-shell-border hover:-translate-y-0.5 hover:border-shell-border-strong hover:shadow-md"
                    }`}
                    style={{ borderLeftWidth: 3, borderLeftColor: lane.color }}
                  >
                    {onMoveCard && (
                      <span className="pointer-events-none absolute right-1.5 top-1.5 text-shell-text-faint opacity-0 transition-opacity group-hover:opacity-70">
                        <DragHandleIcon size={9} />
                      </span>
                    )}
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
        );
      })}

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
  );
}

export default BoardKanban;
