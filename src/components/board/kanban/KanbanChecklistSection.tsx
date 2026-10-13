"use client";
import React, { useEffect, useRef, useState } from "react";
import { CheckIcon, CloseIcon, PlusIcon } from "@/icons/board-icons";
import type { BoardItemChecklistItemDto } from "@/types/board-content";
import InlineTitleEditor from "../InlineTitleEditor";

export type KanbanChecklistSectionProps = {
  items: BoardItemChecklistItemDto[];
  loading: boolean;
  onAdd: (label: string) => void;
  onToggle: (checklist_item_id: number) => void;
  onRename: (checklist_item_id: number, label: string) => void;
  onDelete: (checklist_item_id: number) => void;
};

/** Self-contained "Add subtask" input, owns its own draft text and clears itself after a commit so several subtasks can be typed in a row. */
const AddSubtaskInput: React.FC<{ onSubmit: (label: string) => void }> = ({ onSubmit }) => {
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
    <div className="kanban-item-modal__subtask-add">
      <PlusIcon size={14} />
      <input
        ref={input_ref}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          } else if (event.key === "Escape" && value) {
            event.preventDefault();
            setValue("");
          }
        }}
        onBlur={commit}
        placeholder="Add a subtask"
        aria-label="Add a subtask"
        className="kanban-item-modal__subtask-input"
      />
    </div>
  );
};

/**
 * The Kanban item card's "Subtasks" section, an Asana style checklist with a
 * progress bar, backed by the `board_item_checklist_items` API (see
 * `BoardItemChecklistItemController`). Rolls up into the Kanban card's own
 * "done/total" badge via `BoardItemDto.checklist_total_count` and
 * `checklist_done_count`, which the caller keeps in sync on every mutation.
 * Styled by `kanban-item-modal.css`.
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
    <section className="kanban-item-modal__section" aria-labelledby="kanban-item-subtasks-title">
      <div className="kanban-item-modal__section-head">
        <h3 id="kanban-item-subtasks-title" className="kanban-item-modal__section-title">
          Subtasks
        </h3>
        {total_count > 0 && (
          <span className="kanban-item-modal__section-count">
            {done_count} of {total_count} done
          </span>
        )}
      </div>

      {total_count > 0 && (
        <div
          className="kanban-item-modal__progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress_pct}
          aria-label="Subtasks completed"
        >
          <div className="kanban-item-modal__progress-fill" style={{ width: `${progress_pct}%` }} />
        </div>
      )}

      <div className="kanban-item-modal__subtasks">
        {loading ? (
          <div className="kanban-item-modal__subtasks-loading">Loading subtasks...</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="kanban-item-modal__subtask">
              <button
                type="button"
                onClick={() => onToggle(item.id)}
                aria-label={item.is_done ? "Mark subtask incomplete" : "Mark subtask complete"}
                aria-pressed={item.is_done}
                data-done={item.is_done || undefined}
                className="kanban-item-modal__subtask-check"
              >
                <CheckIcon size={10} />
              </button>

              {editing_id === item.id ? (
                <InlineTitleEditor
                  value={item.label}
                  onCommit={(label) => {
                    onRename(item.id, label);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                  className="kanban-item-modal__subtask-input"
                  aria_label="Rename subtask"
                />
              ) : (
                <span
                  onClick={() => setEditingId(item.id)}
                  data-done={item.is_done || undefined}
                  className="kanban-item-modal__subtask-label"
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
                className="kanban-item-modal__subtask-delete"
              >
                <CloseIcon size={10} />
              </button>
            </div>
          ))
        )}
        <AddSubtaskInput onSubmit={onAdd} />
      </div>
    </section>
  );
};

export default KanbanChecklistSection;
