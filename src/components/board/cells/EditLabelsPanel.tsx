"use client";
import React, { useState } from "react";
import { CommentIcon, PlusIcon } from "@/icons/board-icons";
import { DeleteIcon, EyeIcon, EyeOffIcon, MoreDotsIcon } from "@/icons/workspace-icons";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import MenuFlyout from "@/components/ui/dropdown/MenuFlyout";
import { COLUMN_OPTION_PALETTE } from "../columnTypes";
import ColorSwatchPicker from "../toolbar/ColorSwatchPicker";
import InlineTitleEditor from "../InlineTitleEditor";
import type { BoardCellOption } from "./OptionPicker";

/** Rename/recolor/delete/deactivate/describe actions for an existing status/dropdown option. */
export type BoardOptionActions = {
  onRename: (option_id: string, label: string) => void;
  onRecolor: (option_id: string, color: string) => void;
  onDelete: (option_id: string) => void;
  onToggleActive: (option_id: string) => void;
  onSetDescription: (option_id: string, description: string | null) => void;
};

export type EditLabelsPanelProps = {
  options: BoardCellOption[];
  actions: BoardOptionActions;
  /** Same creation contract as {@link OptionPickerProps.onCreateOption} — reused so "+ New label" behaves identically to the picker's "Add an option". */
  onCreateOption?: (option: { label: string; color: string }) => Promise<BoardCellOption | null>;
  /** Returns to the plain picker view (the "Apply" button). */
  onDone: () => void;
};

/**
 * Monday-style "Edit Labels" management view for a status/dropdown column's
 * `config.options` — rename, recolor, add a description, deactivate, or
 * delete any label, plus append new ones. Swapped in place of
 * {@link "./OptionPicker"} inside the same popover, so it shares its width
 * and outside-click/Escape handling.
 */
const EditLabelsPanel: React.FC<EditLabelsPanelProps> = ({ options, actions, onCreateOption, onDone }) => {
  const [editing_label_id, setEditingLabelId] = useState<string | null>(null);
  const [editing_description_id, setEditingDescriptionId] = useState<string | null>(null);
  const [description_draft, setDescriptionDraft] = useState("");
  const [menu_target, setMenuTarget] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [pending_delete_id, setPendingDeleteId] = useState<string | null>(null);
  const [new_label, setNewLabel] = useState("");
  const [is_creating, setIsCreating] = useState(false);

  const pending_delete = options.find((option) => option.id === pending_delete_id) ?? null;

  const startDescriptionEditor = (option: BoardCellOption) => {
    setDescriptionDraft(option.description ?? "");
    setEditingDescriptionId(option.id);
    setMenuTarget(null);
  };

  const commitDescription = (option_id: string) => {
    const trimmed = description_draft.trim();
    actions.onSetDescription(option_id, trimmed === "" ? null : trimmed);
    setEditingDescriptionId(null);
  };

  const handleCreate = async () => {
    const label = new_label.trim();
    if (!label || !onCreateOption || is_creating) return;
    setIsCreating(true);
    const color = COLUMN_OPTION_PALETTE[options.length % COLUMN_OPTION_PALETTE.length];
    const created = await onCreateOption({ label, color });
    setIsCreating(false);
    if (created) setNewLabel("");
  };

  return (
    <div className="flex flex-col gap-1 p-2" onClick={(event) => event.stopPropagation()}>
      <div className="px-1 pb-1 pt-0.5 text-[11.5px] font-semibold tracking-wide text-shell-text-faint">
        Edit Labels
      </div>

      <div className="flex max-h-[280px] flex-col gap-0.5 overflow-y-auto">
        {options.map((option) => {
          const is_active = option.is_active !== false;
          const is_editing_label = editing_label_id === option.id;
          const is_editing_description = editing_description_id === option.id;

          return (
            <div key={option.id} className={`rounded-md px-1.5 py-1 ${is_active ? "" : "opacity-50"}`}>
              <div className="flex items-center gap-2">
                <ColorSwatchPicker color={option.color} onSelect={(color) => actions.onRecolor(option.id, color)} />

                {is_editing_label ? (
                  <InlineTitleEditor
                    value={option.label}
                    onCommit={(label) => {
                      actions.onRename(option.id, label);
                      setEditingLabelId(null);
                    }}
                    onCancel={() => setEditingLabelId(null)}
                    className="min-w-0 flex-1 text-[13px] text-shell-text"
                    aria_label="Label name"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingLabelId(option.id)}
                    className="min-w-0 flex-1 truncate rounded-md px-1.5 py-1.5 text-left text-[13px] text-shell-text hover:bg-shell-hover"
                  >
                    {option.label}
                    {!is_active && <span className="ml-1.5 text-[11px] font-medium text-shell-text-faint">(inactive)</span>}
                  </button>
                )}

                <button
                  type="button"
                  onClick={(event) => setMenuTarget({ id: option.id, anchor: event.currentTarget })}
                  aria-label={`More actions for ${option.label}`}
                  className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-md text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
                >
                  <MoreDotsIcon size={14} />
                </button>
              </div>

              {is_editing_description ? (
                <div className="ml-[38px] mt-1 flex flex-col gap-1.5">
                  <textarea
                    autoFocus
                    value={description_draft}
                    onChange={(event) => setDescriptionDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setEditingDescriptionId(null);
                      }
                    }}
                    placeholder="Describe this label…"
                    rows={2}
                    className="w-full resize-none rounded-md border border-shell-border-strong bg-shell-hover px-2 py-1.5 text-[12.5px] text-shell-text outline-none focus:border-brand-500"
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingDescriptionId(null)}
                      className="rounded-md px-2 py-1 text-[12px] font-medium text-shell-text-faint hover:bg-shell-hover"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => commitDescription(option.id)}
                      className="rounded-md bg-brand-500 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-brand-600"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                option.description && (
                  <p className="ml-[38px] mt-0.5 truncate text-[11.5px] text-shell-text-faint">{option.description}</p>
                )
              )}

              <MenuFlyout
                anchor_el={menu_target?.id === option.id ? menu_target.anchor : null}
                is_open={menu_target?.id === option.id}
                onClose={() => setMenuTarget(null)}
                side="right"
                width={208}
              >
                <div className="p-1.5">
                  <button
                    type="button"
                    onClick={() => startDescriptionEditor(option)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-shell-text hover:bg-shell-hover"
                  >
                    <span className="flex flex-none text-shell-text-muted">
                      <CommentIcon size={14} />
                    </span>
                    {option.description ? "Edit label description" : "Add label description"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      actions.onToggleActive(option.id);
                      setMenuTarget(null);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-shell-text hover:bg-shell-hover"
                  >
                    <span className="flex flex-none text-shell-text-muted">
                      {is_active ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                    </span>
                    {is_active ? "Deactivate label" : "Activate label"}
                  </button>
                  <div className="my-1 h-px bg-shell-border" />
                  <button
                    type="button"
                    onClick={() => {
                      setPendingDeleteId(option.id);
                      setMenuTarget(null);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-brand-200 hover:bg-brand-500/[0.12]"
                  >
                    <span className="flex flex-none">
                      <DeleteIcon size={14} />
                    </span>
                    Delete label
                  </button>
                </div>
              </MenuFlyout>
            </div>
          );
        })}
      </div>

      {onCreateOption && (
        <div className="mt-1 flex items-center gap-1.5 border-t border-shell-border pt-2">
          <input
            value={new_label}
            onChange={(event) => setNewLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleCreate();
              }
            }}
            placeholder="New label"
            className="min-w-0 flex-1 rounded-md border border-shell-border-strong bg-shell-hover px-2 py-1.5 text-[12.5px] text-shell-text outline-none focus:border-brand-500"
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={!new_label.trim() || is_creating}
            aria-label="Add new label"
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-md bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:opacity-40"
          >
            <PlusIcon size={14} />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onDone}
        className="mt-1 rounded-md bg-brand-500 px-1.5 py-2 text-center text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-600"
      >
        Apply
      </button>

      <ConfirmActionModal
        is_open={pending_delete !== null}
        title="Delete label?"
        description={
          <>
            Delete <strong>{pending_delete?.label}</strong>? Items currently set to this label will show no status.
            This can&rsquo;t be undone.
          </>
        }
        confirm_label="Delete label"
        danger
        onConfirm={() => {
          if (pending_delete) actions.onDelete(pending_delete.id);
        }}
        onClose={() => setPendingDeleteId(null)}
      />
    </div>
  );
};

export default EditLabelsPanel;
