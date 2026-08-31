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
  /** Same creation contract as {@link OptionPickerProps.onCreateOption} — reused so the "New label" chip behaves identically to the picker's "Add an option". */
  onCreateOption?: (option: { label: string; color: string }) => Promise<BoardCellOption | null>;
  /** Returns to the plain picker view (the "Apply" button). */
  onDone: () => void;
};

/** Compact trigger size for each chip's recolor swatch — smaller than {@link ColorSwatchPicker}'s own 30px default, which reads as oversized against a chip's ~13px label text. */
const CHIP_SWATCH_SIZE_PX = 18;

/**
 * Monday-style "Edit Labels" management view for a status/dropdown column's
 * `config.options`, laid out as a grid of chips (rather than one row per
 * label) so it stays compact once a column has many options. Rename,
 * recolor, add a description, deactivate, or delete any label, plus append
 * new ones. Swapped in place of {@link "./OptionPicker"} inside the same
 * popover, so it shares its width and outside-click/Escape handling.
 */
const EditLabelsPanel: React.FC<EditLabelsPanelProps> = ({ options, actions, onCreateOption, onDone }) => {
  const [editing_label_id, setEditingLabelId] = useState<string | null>(null);
  const [editing_description_id, setEditingDescriptionId] = useState<string | null>(null);
  const [description_draft, setDescriptionDraft] = useState("");
  const [menu_target, setMenuTarget] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [pending_delete_id, setPendingDeleteId] = useState<string | null>(null);
  const [is_creating, setIsCreating] = useState(false);

  const pending_delete = options.find((option) => option.id === pending_delete_id) ?? null;
  const editing_description_option = options.find((option) => option.id === editing_description_id) ?? null;
  const next_new_option_color = COLUMN_OPTION_PALETTE[options.length % COLUMN_OPTION_PALETTE.length];

  const startDescriptionEditor = (option: BoardCellOption) => {
    setDescriptionDraft(option.description ?? "");
    setEditingDescriptionId(option.id);
    setMenuTarget(null);
  };

  const commitDescription = () => {
    if (!editing_description_option) return;
    const trimmed = description_draft.trim();
    actions.onSetDescription(editing_description_option.id, trimmed === "" ? null : trimmed);
    setEditingDescriptionId(null);
  };

  const handleCreate = async (label: string) => {
    if (!onCreateOption) return;
    await onCreateOption({ label, color: next_new_option_color });
    setIsCreating(false);
  };

  return (
    <div className="flex flex-col gap-3 p-3" onClick={(event) => event.stopPropagation()}>
      <div className="px-0.5 text-[11.5px] font-semibold tracking-wide text-shell-text-faint">Edit Labels</div>

      <div className="grid max-h-[320px] grid-cols-2 gap-2 overflow-y-auto pr-0.5">
        {options.map((option) => {
          const is_active = option.is_active !== false;
          const is_editing_label = editing_label_id === option.id;

          return (
            <div
              key={option.id}
              className={`flex items-center gap-1.5 rounded-lg border border-shell-border-strong bg-shell-hover px-1.5 py-1.5 ${
                is_active ? "" : "opacity-50"
              }`}
            >
              <ColorSwatchPicker
                color={option.color}
                onSelect={(color) => actions.onRecolor(option.id, color)}
                size={CHIP_SWATCH_SIZE_PX}
              />

              {is_editing_label ? (
                <InlineTitleEditor
                  value={option.label}
                  onCommit={(label) => {
                    actions.onRename(option.id, label);
                    setEditingLabelId(null);
                  }}
                  onCancel={() => setEditingLabelId(null)}
                  className="min-w-0 flex-1 text-[12.5px] text-shell-text"
                  aria_label="Label name"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingLabelId(option.id)}
                  className="min-w-0 flex-1 truncate text-left text-[12.5px] text-shell-text"
                >
                  {option.label}
                  {!is_active && <span className="ml-1 text-[10.5px] font-medium text-shell-text-faint">(inactive)</span>}
                </button>
              )}

              <button
                type="button"
                onClick={(event) => setMenuTarget({ id: option.id, anchor: event.currentTarget })}
                aria-label={`More actions for ${option.label}`}
                className="flex h-5 w-5 flex-none items-center justify-center rounded text-shell-text-muted transition-colors hover:bg-shell-panel hover:text-shell-text"
              >
                <MoreDotsIcon size={12} />
              </button>

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

        {onCreateOption &&
          (is_creating ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-brand-500 bg-shell-hover px-1.5 py-1.5">
              <span
                className="flex-none rounded-[5px]"
                style={{ background: next_new_option_color, height: CHIP_SWATCH_SIZE_PX, width: CHIP_SWATCH_SIZE_PX }}
              />
              <InlineTitleEditor
                value=""
                onCommit={(label) => void handleCreate(label)}
                onCancel={() => setIsCreating(false)}
                select_on_focus={false}
                placeholder="Label name"
                className="min-w-0 flex-1 text-[12.5px] text-shell-text"
                aria_label="New label name"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-shell-border-strong px-1.5 py-1.5 text-[12.5px] font-medium text-shell-text-faint transition-colors hover:border-brand-500 hover:text-brand-200"
            >
              <PlusIcon size={12} />
              New label
            </button>
          ))}
      </div>

      {editing_description_option && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-shell-border-strong bg-shell-hover p-2.5">
          <p className="text-[11px] font-medium text-shell-text-faint">
            Description for <span className="text-shell-text">{editing_description_option.label}</span>
          </p>
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
            className="w-full resize-none rounded-md border border-shell-border-strong bg-shell-panel px-2 py-1.5 text-[12.5px] text-shell-text outline-none focus:border-brand-500"
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setEditingDescriptionId(null)}
              className="rounded-md px-2 py-1 text-[12px] font-medium text-shell-text-faint hover:bg-shell-panel"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={commitDescription}
              className="rounded-md bg-brand-500 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-brand-600"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onDone}
        className="self-center rounded-lg bg-brand-500 px-6 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-600"
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
