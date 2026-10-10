"use client";
import React, { useState } from "react";
import { CommentIcon, PaintBucketIcon, PlusIcon } from "@/icons/board-icons";
import { DeleteIcon, EyeIcon, EyeOffIcon, MoreDotsIcon } from "@/icons/workspace-icons";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import MenuFlyout from "@/components/ui/dropdown/MenuFlyout";
import { boardTreeFontClassName } from "../board-tree-font";
import { COLUMN_OPTION_PALETTE } from "../columnTypes";
import ColorSwatchPicker from "../toolbar/ColorSwatchPicker";
import InlineTitleEditor from "../InlineTitleEditor";
import type { BoardCellOption } from "./OptionPicker";
import "@/components/ui/dropdown/action-menu.css";
import "./status-label-picker.css";

/**
 * Rename/recolor/delete/deactivate/describe actions for an existing
 * status/dropdown option. Deactivate and describe are optional, since the
 * board table's demo labels have no backing for them; their "..." rows are
 * hidden when omitted.
 */
export type BoardOptionActions = {
  onRename: (option_id: string, label: string) => void;
  onRecolor: (option_id: string, color: string) => void;
  onDelete: (option_id: string) => void;
  onToggleActive?: (option_id: string) => void;
  onSetDescription?: (option_id: string, description: string | null) => void;
};

export type EditLabelsPanelProps = {
  options: BoardCellOption[];
  actions: BoardOptionActions;
  /** Same creation contract as {@link OptionPickerProps.onCreateOption}, reused so the "New label" field behaves identically to the picker's "Add an option". */
  onCreateOption?: (option: { label: string; color: string }) => Promise<BoardCellOption | null>;
  /** Returns to the plain picker view (the "Apply" button). */
  onDone: () => void;
  /** Most fields stacked per column before a new column starts. Defaults to {@link STATUS_PICKER_MAX_ROWS}; pass a larger value for a single column list. */
  max_rows?: number;
};

/** monday.com stacks up to six labels per column before starting the next one. */
export const STATUS_PICKER_MAX_ROWS = 6;

/** Size of each field's paint bucket swatch, matching `.status-picker__swatch`. */
const SWATCH_SIZE_PX = 22;

/**
 * monday.com style "Edit Labels" view for a status/dropdown column's
 * `config.options`: the same column layout as the picker, each label shown
 * as an outlined field with a paint bucket swatch (recolor), click to rename
 * text and a hover "..." menu (description, deactivate, delete), followed by
 * the read only "Default Label" and a "+ New label" field. Swapped in place of
 * the picker inside the same popover, so it shares its outside click and
 * Escape handling. Styles live in `status-label-picker.css`.
 */
const EditLabelsPanel: React.FC<EditLabelsPanelProps> = ({
  options,
  actions,
  onCreateOption,
  onDone,
  max_rows = STATUS_PICKER_MAX_ROWS,
}) => {
  const [editing_label_id, setEditingLabelId] = useState<string | null>(null);
  const [editing_description_id, setEditingDescriptionId] = useState<string | null>(null);
  const [description_draft, setDescriptionDraft] = useState("");
  const [menu_target, setMenuTarget] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [pending_delete_id, setPendingDeleteId] = useState<string | null>(null);
  const [is_creating, setIsCreating] = useState(false);

  const pending_delete = options.find((option) => option.id === pending_delete_id) ?? null;
  const editing_description_option = options.find((option) => option.id === editing_description_id) ?? null;
  const next_new_option_color = COLUMN_OPTION_PALETTE[options.length % COLUMN_OPTION_PALETTE.length];
  // Every label plus the "Default Label" field and the "+ New label" field.
  const row_count = Math.max(1, Math.min(max_rows, options.length + (onCreateOption ? 2 : 1)));

  const startDescriptionEditor = (option: BoardCellOption) => {
    setDescriptionDraft(option.description ?? "");
    setEditingDescriptionId(option.id);
    setMenuTarget(null);
  };

  const commitDescription = () => {
    if (!editing_description_option) return;
    const trimmed = description_draft.trim();
    actions.onSetDescription?.(editing_description_option.id, trimmed === "" ? null : trimmed);
    setEditingDescriptionId(null);
  };

  const handleCreate = async (label: string) => {
    if (!onCreateOption) return;
    await onCreateOption({ label, color: next_new_option_color });
    setIsCreating(false);
  };

  return (
    <div className={`status-picker ${boardTreeFontClassName}`} onClick={(event) => event.stopPropagation()}>
      <div
        className="status-picker__grid status-picker__grid--editing"
        style={{ "--status-picker-rows": row_count } as React.CSSProperties}
      >
        {options.map((option) => {
          const is_active = option.is_active !== false;
          const is_editing_label = editing_label_id === option.id;
          const is_menu_open = menu_target?.id === option.id;

          return (
            <div
              key={option.id}
              className="status-picker__field"
              data-inactive={!is_active || undefined}
              data-active={is_menu_open || undefined}
              title={is_active ? undefined : `${option.label} (inactive)`}
            >
              <ColorSwatchPicker
                color={option.color}
                onSelect={(color) => actions.onRecolor(option.id, color)}
                size={SWATCH_SIZE_PX}
                trigger_class_name="status-picker__swatch"
                icon={<PaintBucketIcon size={14} />}
              />

              {is_editing_label ? (
                <InlineTitleEditor
                  value={option.label}
                  onCommit={(label) => {
                    actions.onRename(option.id, label);
                    setEditingLabelId(null);
                  }}
                  onCancel={() => setEditingLabelId(null)}
                  className="status-picker__field-input"
                  aria_label="Label name"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingLabelId(option.id)}
                  aria-label={`Rename ${option.label}`}
                  className="status-picker__field-label"
                >
                  {option.label}
                </button>
              )}

              <button
                type="button"
                onClick={(event) =>
                  setMenuTarget(is_menu_open ? null : { id: option.id, anchor: event.currentTarget })
                }
                aria-label={`More actions for ${option.label}`}
                aria-haspopup="menu"
                aria-expanded={is_menu_open}
                className="status-picker__more"
              >
                <MoreDotsIcon size={14} />
              </button>

              <MenuFlyout
                anchor_el={is_menu_open ? (menu_target?.anchor ?? null) : null}
                is_open={is_menu_open}
                onClose={() => setMenuTarget(null)}
                side="right"
                width={232}
                unstyled
              >
                <div role="menu" aria-label={`${option.label} options`} className={`action-menu ${boardTreeFontClassName}`}>
                  {actions.onSetDescription && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => startDescriptionEditor(option)}
                      className="action-menu__item"
                    >
                      <span className="action-menu__icon" aria-hidden="true">
                        <CommentIcon size={16} />
                      </span>
                      <span className="action-menu__label">
                        {option.description ? "Edit label description" : "Add label description"}
                      </span>
                    </button>
                  )}
                  {actions.onToggleActive && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        actions.onToggleActive?.(option.id);
                        setMenuTarget(null);
                      }}
                      className="action-menu__item"
                    >
                      <span className="action-menu__icon" aria-hidden="true">
                        {is_active ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                      </span>
                      <span className="action-menu__label">{is_active ? "Deactivate label" : "Activate label"}</span>
                    </button>
                  )}
                  {(actions.onSetDescription || actions.onToggleActive) && (
                    <div className="action-menu__divider" role="separator" />
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    data-danger
                    onClick={() => {
                      setPendingDeleteId(option.id);
                      setMenuTarget(null);
                    }}
                    className="action-menu__item"
                  >
                    <span className="action-menu__icon" aria-hidden="true">
                      <DeleteIcon size={16} />
                    </span>
                    <span className="action-menu__label">Delete label</span>
                  </button>
                </div>
              </MenuFlyout>
            </div>
          );
        })}

        <div
          className="status-picker__field status-picker__field--default"
          title="The default label marks items with no status and can't be edited"
        >
          <span className="status-picker__swatch" aria-hidden="true">
            <PaintBucketIcon size={14} />
          </span>
          <span className="status-picker__field-label">Default Label</span>
        </div>

        {onCreateOption &&
          (is_creating ? (
            <div className="status-picker__field" data-active>
              <span className="status-picker__swatch" style={{ background: next_new_option_color }} aria-hidden="true">
                <PaintBucketIcon size={14} />
              </span>
              <InlineTitleEditor
                value=""
                onCommit={(label) => void handleCreate(label)}
                onCancel={() => setIsCreating(false)}
                select_on_focus={false}
                placeholder="Label name"
                className="status-picker__field-input"
                aria_label="New label name"
              />
            </div>
          ) : (
            <button type="button" onClick={() => setIsCreating(true)} className="status-picker__add">
              <PlusIcon size={12} />
              New label
            </button>
          ))}
      </div>

      {editing_description_option && (
        <div className="status-picker__description">
          <p className="status-picker__description-title">
            Description for <strong>{editing_description_option.label}</strong>
          </p>
          <textarea
            autoFocus
            value={description_draft}
            onChange={(event) => setDescriptionDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setEditingDescriptionId(null);
              }
            }}
            placeholder="Describe this label..."
            rows={2}
            className="status-picker__description-input"
          />
          <div className="status-picker__description-actions">
            <button
              type="button"
              onClick={() => setEditingDescriptionId(null)}
              className="status-picker__button status-picker__button--secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={commitDescription}
              className="status-picker__button status-picker__button--primary"
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="status-picker__footer">
        <button type="button" onClick={onDone} className="status-picker__footer-button">
          Apply
        </button>
      </div>

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
