"use client";
import React, { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BlockedIcon, DragHandleIcon, PaintBucketIcon, PlusIcon, TextLinesIcon } from "@/icons/board-icons";
import { DeleteIcon, EyeIcon, MoreDotsIcon } from "@/icons/workspace-icons";
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
 * Rename/recolor/delete/deactivate/describe/reorder actions for the options of
 * a status/dropdown column. The optional ones hide their control when omitted:
 * no "..." row for deactivate or describe, no drag handles without `onReorder`.
 */
export type BoardOptionActions = {
  onRename: (option_id: string, label: string) => void;
  onRecolor: (option_id: string, color: string) => void;
  onDelete: (option_id: string) => void;
  onToggleActive?: (option_id: string) => void;
  onSetDescription?: (option_id: string, description: string | null) => void;
  /** Saves a new label order after a drag, as the full list of option ids. */
  onReorder?: (ordered_ids: string[]) => void;
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
  /** Labels set on at least one item. Like monday.com, those can't be deleted, only deactivated. */
  used_option_ids?: ReadonlySet<string>;
};

/** monday.com stacks up to six labels per column before starting the next one. */
export const STATUS_PICKER_MAX_ROWS = 6;

/** Size of each field's paint bucket swatch, matching `.status-picker__swatch`. */
const SWATCH_SIZE_PX = 22;

/** How far the pointer must travel on a handle before it becomes a drag, so a plain click does nothing. */
const DRAG_ACTIVATION_DISTANCE = 4;

const IN_USE_DELETE_REASON = "This label is in use. Deactivate it instead, or change those items first.";

type LabelFieldProps = {
  option: BoardCellOption;
  actions: BoardOptionActions;
  is_editing_label: boolean;
  is_menu_open: boolean;
  onStartRename: () => void;
  onStopRename: () => void;
  onToggleMenu: (anchor: HTMLElement | null) => void;
};

/**
 * One label in edit mode: a drag handle on hover (when reordering is
 * supported), the paint bucket swatch, the click to rename text and the hover
 * "..." button. Sortable through dnd-kit and dragged by its handle only, so
 * the swatch, the text and the "..." keep their own clicks.
 */
const LabelField: React.FC<LabelFieldProps> = ({
  option,
  actions,
  is_editing_label,
  is_menu_open,
  onStartRename,
  onStopRename,
  onToggleMenu,
}) => {
  const can_reorder = actions.onReorder !== undefined;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: option.id,
    disabled: !can_reorder || is_editing_label,
  });
  const is_active = option.is_active !== false;

  return (
    <div
      ref={setNodeRef}
      className="status-picker__field"
      data-inactive={!is_active || undefined}
      data-active={is_menu_open || undefined}
      data-dragging={isDragging || undefined}
      title={option.description || (is_active ? undefined : `${option.label} (inactive)`)}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      {can_reorder && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Drag ${option.label} to reorder`}
          className="status-picker__handle"
        >
          <DragHandleIcon size={8} />
        </button>
      )}

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
            onStopRename();
          }}
          onCancel={onStopRename}
          className="status-picker__field-input"
          aria_label="Label name"
        />
      ) : (
        <button
          type="button"
          onClick={onStartRename}
          aria-label={`Rename ${option.label}`}
          className="status-picker__field-label"
        >
          {option.label}
        </button>
      )}

      <button
        type="button"
        onClick={(event) => onToggleMenu(is_menu_open ? null : event.currentTarget)}
        aria-label={`More actions for ${option.label}`}
        aria-haspopup="menu"
        aria-expanded={is_menu_open}
        className="status-picker__more"
      >
        <MoreDotsIcon size={14} />
      </button>
    </div>
  );
};

/**
 * monday.com style "Edit Labels" view for a status/dropdown column's
 * `config.options`: the same column layout as the picker, each label shown
 * as an outlined field with a paint bucket swatch (recolor), click to rename
 * text, a hover drag handle to reorder and a hover "..." menu (description,
 * deactivate, delete), followed by the read only "Default Label" and a
 * "+ New label" field. Swapped in place of the picker inside the same
 * popover, so it shares its outside click and Escape handling. Styles live in
 * `status-label-picker.css`.
 */
const EditLabelsPanel: React.FC<EditLabelsPanelProps> = ({
  options,
  actions,
  onCreateOption,
  onDone,
  max_rows = STATUS_PICKER_MAX_ROWS,
  used_option_ids,
}) => {
  const [editing_label_id, setEditingLabelId] = useState<string | null>(null);
  const [editing_description_id, setEditingDescriptionId] = useState<string | null>(null);
  const [description_draft, setDescriptionDraft] = useState("");
  const [menu_target, setMenuTarget] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [pending_delete_id, setPendingDeleteId] = useState<string | null>(null);
  const [is_creating, setIsCreating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const pending_delete = options.find((option) => option.id === pending_delete_id) ?? null;
  const editing_description_option = options.find((option) => option.id === editing_description_id) ?? null;
  const menu_option = options.find((option) => option.id === menu_target?.id) ?? null;
  const is_menu_option_in_use = menu_option !== null && (used_option_ids?.has(menu_option.id) ?? false);
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

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || !actions.onReorder) return;
    const ids = options.map((option) => option.id);
    const from_index = ids.indexOf(String(active.id));
    const to_index = ids.indexOf(String(over.id));
    if (from_index === -1 || to_index === -1) return;
    actions.onReorder(arrayMove(ids, from_index, to_index));
  };

  return (
    <div className={`status-picker ${boardTreeFontClassName}`} onClick={(event) => event.stopPropagation()}>
      <div
        className="status-picker__grid status-picker__grid--editing"
        style={{ "--status-picker-rows": row_count } as React.CSSProperties}
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToParentElement]}
          onDragStart={() => setMenuTarget(null)}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={options.map((option) => option.id)} strategy={rectSortingStrategy}>
            {options.map((option) => (
              <LabelField
                key={option.id}
                option={option}
                actions={actions}
                is_editing_label={editing_label_id === option.id}
                is_menu_open={menu_target?.id === option.id}
                onStartRename={() => setEditingLabelId(option.id)}
                onStopRename={() => setEditingLabelId(null)}
                onToggleMenu={(anchor) => setMenuTarget(anchor ? { id: option.id, anchor } : null)}
              />
            ))}
          </SortableContext>
        </DndContext>

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

      {/* One "..." menu for the whole panel, anchored to whichever label opened it. */}
      <MenuFlyout
        anchor_el={menu_target?.anchor ?? null}
        is_open={menu_option !== null}
        onClose={() => setMenuTarget(null)}
        side="right"
        width={232}
        unstyled
      >
        {menu_option && (
          <div role="menu" aria-label={`${menu_option.label} options`} className={`action-menu ${boardTreeFontClassName}`}>
            {actions.onSetDescription && (
              <button
                type="button"
                role="menuitem"
                onClick={() => startDescriptionEditor(menu_option)}
                className="action-menu__item"
              >
                <span className="action-menu__icon" aria-hidden="true">
                  <TextLinesIcon size={16} />
                </span>
                <span className="action-menu__label">
                  {menu_option.description ? "Edit label description" : "Add label description"}
                </span>
              </button>
            )}
            {actions.onToggleActive && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  actions.onToggleActive?.(menu_option.id);
                  setMenuTarget(null);
                }}
                className="action-menu__item"
              >
                <span className="action-menu__icon" aria-hidden="true">
                  {menu_option.is_active === false ? <EyeIcon size={16} /> : <BlockedIcon size={16} />}
                </span>
                <span className="action-menu__label">
                  {menu_option.is_active === false ? "Activate label" : "Deactivate label"}
                </span>
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              aria-disabled={is_menu_option_in_use || undefined}
              title={is_menu_option_in_use ? IN_USE_DELETE_REASON : undefined}
              onClick={() => {
                if (is_menu_option_in_use) return;
                setPendingDeleteId(menu_option.id);
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
        )}
      </MenuFlyout>

      {editing_description_option && (
        <div className="status-picker__description">
          <p className="status-picker__description-title">
            Description for <strong>{editing_description_option.label}</strong>
          </p>
          <textarea
            autoFocus
            value={description_draft}
            maxLength={500}
            onChange={(event) => setDescriptionDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                setEditingDescriptionId(null);
              } else if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                commitDescription();
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
            Delete <strong>{pending_delete?.label}</strong>?
            {used_option_ids === undefined && " Items currently set to this label will show no status."} This
            can&rsquo;t be undone.
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
