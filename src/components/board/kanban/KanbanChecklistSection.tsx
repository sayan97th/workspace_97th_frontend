"use client";
import React, { useEffect, useRef, useState } from "react";
import { CheckIcon, CloseIcon, PlusIcon } from "@/icons/board-icons";
import type { BoardItemChecklistItemDto } from "@/types/board-content";
import InlineTitleEditor from "../InlineTitleEditor";
import { KANBAN_COLORS } from "./kanbanDesign";

export type KanbanChecklistSectionProps = {
  items: BoardItemChecklistItemDto[];
  loading: boolean;
  onAdd: (label: string) => void;
  onToggle: (checklist_item_id: number) => void;
  onRename: (checklist_item_id: number, label: string) => void;
  onDelete: (checklist_item_id: number) => void;
};

type AddSubtaskInputProps = {
  onSubmit: (label: string) => void;
};

/** Self-contained "Add subtask" input, mirroring `BoardKanban.tsx`'s `AddCardInput` — owns its own draft text and clears itself after a commit. */
const AddSubtaskInput: React.FC<AddSubtaskInputProps> = ({ onSubmit }) => {
  const [value, setValue] = useState("");
  const input_ref = useRef<HTMLInputElement>(null);

  const commit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
    input_ref.current?.focus();
  };

  return (
    <input
      ref={input_ref}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit();
        }
      }}
      onBlur={commit}
      placeholder="Add a subtask..."
      className="w-full rounded-lg px-[11px] py-2 text-[13px] outline-none"
      style={{ border: `1px solid ${KANBAN_COLORS.border_subtle}`, color: KANBAN_COLORS.text_secondary }}
    />
  );
};

/**
 * The Kanban item drawer's "Subtasks" section — a literal reproduction of
 * `design/design_2/97 Workspace Menu.dc.html`'s checklist block (progress bar
 * + checkbox rows), backed by the real `board_item_checklist_items` API
 * (see `BoardItemChecklistItemController`). Rolls up into the Kanban card's
 * own "✓ done/total" badge via `BoardItemDto.checklist_total_count`/`checklist_done_count`,
 * which the caller (`TableBoardView`) keeps in sync on every mutation here.
 */
const KanbanChecklistSection: React.FC<KanbanChecklistSectionProps> = ({ items, loading, onAdd, onToggle, onRename, onDelete }) => {
  const [editing_id, setEditingId] = useState<number | null>(null);
  const done_count = items.filter((item) => item.is_done).length;
  const total_count = items.length;
  const progress_pct = total_count ? Math.round((100 * done_count) / total_count) : 0;

  useEffect(() => {
    if (editing_id !== null && !items.some((item) => item.id === editing_id)) setEditingId(null);
  }, [items, editing_id]);

  return (
    <div className="mb-5" style={{ borderTop: `1px solid ${KANBAN_COLORS.border_subtle}`, paddingTop: 16 }}>
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[12.5px] font-bold" style={{ color: KANBAN_COLORS.text_disabled }}>
          Subtasks
        </span>
        {total_count > 0 && (
          <span className="text-[12px] font-semibold" style={{ color: KANBAN_COLORS.text_placeholder }}>
            {done_count}/{total_count}
          </span>
        )}
      </div>

      {total_count > 0 && (
        <div className="mb-2.5 h-[5px] overflow-hidden rounded-[3px]" style={{ background: "var(--color-shell-border-strong)" }}>
          <div
            className="h-full rounded-[3px] transition-[width]"
            style={{ width: `${progress_pct}%`, background: KANBAN_COLORS.success }}
          />
        </div>
      )}

      {!loading && (
        <div className="mb-2.5 flex flex-col gap-0.5">
          {items.map((item) => (
            <div key={item.id} className="group flex items-center gap-2 py-[5px]">
              <button
                type="button"
                onClick={() => onToggle(item.id)}
                aria-label={item.is_done ? "Mark subtask incomplete" : "Mark subtask complete"}
                className="flex h-3.5 w-3.5 flex-none items-center justify-center rounded-[4px] border-[1.6px] transition-colors"
                style={{
                  borderColor: item.is_done ? KANBAN_COLORS.success : KANBAN_COLORS.text_hairline,
                  background: item.is_done ? KANBAN_COLORS.success : KANBAN_COLORS.card_bg,
                }}
              >
                {item.is_done && <CheckIcon size={8} className="text-white" />}
              </button>

              {editing_id === item.id ? (
                <InlineTitleEditor
                  value={item.label}
                  onCommit={(label) => {
                    onRename(item.id, label);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                  className="min-w-0 flex-1 text-[13px] font-medium"
                  style={{ color: KANBAN_COLORS.text_secondary }}
                  aria_label="Rename subtask"
                />
              ) : (
                <span
                  onClick={() => setEditingId(item.id)}
                  className="min-w-0 flex-1 cursor-text truncate text-[13px] font-medium"
                  style={{
                    color: item.is_done ? KANBAN_COLORS.text_faded : KANBAN_COLORS.text_secondary,
                    textDecoration: item.is_done ? "line-through" : "none",
                  }}
                  title="Click to rename"
                >
                  {item.label}
                </span>
              )}

              <button
                type="button"
                onClick={() => onDelete(item.id)}
                aria-label="Delete subtask"
                title="Delete subtask"
                className="flex h-5 w-5 flex-none items-center justify-center rounded-[6px] opacity-0 transition-opacity hover:bg-shell-hover group-hover:opacity-100"
                style={{ color: KANBAN_COLORS.text_faint }}
              >
                <CloseIcon size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <AddSubtaskInputRow onAdd={onAdd} />
    </div>
  );
};

const AddSubtaskInputRow: React.FC<{ onAdd: (label: string) => void }> = ({ onAdd }) => (
  <div className="flex items-center gap-1.5">
    <span className="flex h-5 w-5 flex-none items-center justify-center" style={{ color: KANBAN_COLORS.text_placeholder }}>
      <PlusIcon size={12} />
    </span>
    <AddSubtaskInput onSubmit={onAdd} />
  </div>
);

export default KanbanChecklistSection;
