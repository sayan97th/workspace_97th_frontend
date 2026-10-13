"use client";

import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BlockedIcon, CloseIcon, DragHandleIcon, PaintBucketIcon, PlusIcon, TextLinesIcon } from "@/icons/board-icons";
import { DeleteIcon, EyeIcon, MoreDotsIcon } from "@/icons/workspace-icons";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import MenuFlyout from "@/components/ui/dropdown/MenuFlyout";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import { boardTreeFontClassName } from "../../board-tree-font";
import type { BoardOptionActions } from "../../cells/EditLabelsPanel";
import ColorSwatchPicker from "../../toolbar/ColorSwatchPicker";
import InlineTitleEditor from "../../InlineTitleEditor";
import { DROPDOWN_OPTION_COLORS } from "../constants";
import type { StatusDef } from "../types";
import PopoverPanel from "./PopoverPanel";
import "@/components/ui/dropdown/action-menu.css";
import "./dropdown-picker.css";

const IN_USE_DELETE_REASON = "This label is in use. Deactivate it instead, or remove it from those items first.";

/** How far the pointer must travel on a handle before it becomes a drag, so a plain click does nothing. */
const DRAG_ACTIVATION_DISTANCE = 4;

interface DropdownMenuProps {
  options: StatusDef[];
  /** The cell's selected option ids (or labels, for the demo data). */
  selected: string[];
  onToggle: (id: string) => void;
  /** Empties the cell. */
  onClear: () => void;
  onClose: () => void;
  /** "+ Create as a new label" while picking: adds the option and selects it on this cell. */
  onCreateAndSelect: (option: { label: string; color: string }) => void;
  /** "+ Create as a new label" in edit mode: only adds the option to the column. */
  onAddOption: (option: { label: string; color: string }) => void;
  /** Rename, recolor, delete, deactivate, describe and reorder for edit mode. */
  option_actions: BoardOptionActions;
  /** Labels set on at least one loaded item, which can't be deleted, only deactivated. */
  used_option_ids?: ReadonlySet<string>;
}

const chipStyle = (color: string) => ({ "--dropdown-chip-color": color || "#9aa0b6" }) as CSSProperties;

const normalize = (value: string) => value.trim().toLocaleLowerCase();

interface LabelFieldProps {
  option: StatusDef;
  actions: BoardOptionActions;
  can_reorder: boolean;
  is_renaming: boolean;
  is_menu_open: boolean;
  onStartRename: () => void;
  onStopRename: () => void;
  onToggleMenu: (anchor: HTMLElement | null) => void;
}

/**
 * One label in edit mode: a drag handle on hover, the color swatch, the click
 * to rename text and the "..." button. Sortable through dnd-kit and dragged by
 * its handle only, so the swatch, the text and the "..." keep their own clicks.
 */
function LabelField({ option, actions, can_reorder, is_renaming, is_menu_open, onStartRename, onStopRename, onToggleMenu }: LabelFieldProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: option.id,
    disabled: !can_reorder || is_renaming,
  });
  const is_active = option.is_active !== false;

  return (
    <div
      ref={setNodeRef}
      className="dropdown-picker__field"
      data-inactive={!is_active || undefined}
      data-active={is_menu_open || undefined}
      data-dragging={isDragging || undefined}
      title={option.description || undefined}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      {can_reorder && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Drag ${option.label} to reorder`}
          className="dropdown-picker__handle"
        >
          <DragHandleIcon size={8} />
        </button>
      )}

      <ColorSwatchPicker
        color={option.color}
        onSelect={(color) => actions.onRecolor(option.id, color)}
        size={20}
        trigger_class_name="dropdown-picker__swatch"
        icon={<PaintBucketIcon size={12} />}
      />

      {is_renaming ? (
        <InlineTitleEditor
          value={option.label}
          onCommit={(label) => {
            actions.onRename(option.id, label);
            onStopRename();
          }}
          onCancel={onStopRename}
          className="dropdown-picker__field-input"
          aria_label="Label name"
        />
      ) : (
        <button type="button" onClick={onStartRename} aria-label={`Rename ${option.label}`} className="dropdown-picker__field-label">
          {option.label}
        </button>
      )}

      {!is_active && <span className="dropdown-picker__inactive-tag">Inactive</span>}

      <button
        type="button"
        onClick={(event) => onToggleMenu(is_menu_open ? null : event.currentTarget)}
        aria-label={`More actions for ${option.label}`}
        aria-haspopup="menu"
        aria-expanded={is_menu_open}
        className="dropdown-picker__more"
      >
        <MoreDotsIcon size={14} />
      </button>
    </div>
  );
}

/**
 * The table's Dropdown cell picker, monday style. The selected labels sit on
 * top as tinted chips (each with its own "x"), followed by a "Create or find
 * labels" search, the labels still available to pick, a "+ Create as a new
 * label" button while the typed name is new, and an "Edit labels" footer.
 *
 * Edit labels keeps the chips and the search and lists every label as an
 * editable field: drag to reorder, recolor, click to rename and a "..." menu
 * with description, deactivate and delete (blocked for labels in use).
 * "Apply" returns to picking. Picks save right away, like monday.com.
 * Styles live in `dropdown-picker.css`.
 */
export default function DropdownMenu({
  options,
  selected,
  onToggle,
  onClear,
  onClose,
  onCreateAndSelect,
  onAddOption,
  option_actions,
  used_option_ids,
}: DropdownMenuProps) {
  const [query, setQuery] = useState("");
  const [is_editing, setIsEditing] = useState(false);
  const [highlighted_index, setHighlightedIndex] = useState(-1);
  const [renaming_id, setRenamingId] = useState<string | null>(null);
  const [menu_target, setMenuTarget] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [pending_delete_id, setPendingDeleteId] = useState<string | null>(null);
  const [description_id, setDescriptionId] = useState<string | null>(null);
  const [description_draft, setDescriptionDraft] = useState("");
  const search_ref = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const labeled_options = useMemo(() => options.filter((option) => option.label), [options]);
  // Each chip keeps the raw stored entry, since demo data stores a label's text instead of its id.
  const selected_options = useMemo(
    () =>
      selected.map((entry) => ({
        entry,
        ...(labeled_options.find((option) => option.id === entry) ??
          labeled_options.find((option) => option.label === entry) ?? { id: entry, label: entry, color: "" }),
      })),
    [selected, labeled_options]
  );
  const selected_ids = useMemo(() => new Set(selected_options.map((option) => option.id)), [selected_options]);

  const normalized_query = normalize(query);
  const matchesQuery = (option: StatusDef) => normalize(option.label).includes(normalized_query);
  // Picking lists the active labels not yet on the cell, edit mode lists every label.
  const pick_options = labeled_options.filter((option) => option.is_active !== false && !selected_ids.has(option.id) && matchesQuery(option));
  const edit_options = labeled_options.filter(matchesQuery);
  const has_exact_match = labeled_options.some((option) => normalize(option.label) === normalized_query);
  const can_create = normalized_query !== "" && !has_exact_match;
  // A filtered list can't be reordered without scrambling the hidden labels.
  const can_reorder = option_actions.onReorder !== undefined && normalized_query === "";
  const next_color = DROPDOWN_OPTION_COLORS[labeled_options.length % DROPDOWN_OPTION_COLORS.length];

  const menu_option = labeled_options.find((option) => option.id === menu_target?.id) ?? null;
  const is_menu_option_in_use = menu_option !== null && (used_option_ids?.has(menu_option.id) ?? false);
  const pending_delete = labeled_options.find((option) => option.id === pending_delete_id) ?? null;
  const description_option = labeled_options.find((option) => option.id === description_id) ?? null;

  const updateQuery = (value: string) => {
    setQuery(value);
    setHighlightedIndex(-1);
  };

  const pickOption = (id: string) => {
    onToggle(id);
    updateQuery("");
    search_ref.current?.focus();
  };

  const createLabel = () => {
    const label = query.trim();
    if (!label || has_exact_match) return;
    const option = { label, color: next_color };
    if (is_editing) onAddOption(option);
    else onCreateAndSelect(option);
    updateQuery("");
    search_ref.current?.focus();
  };

  const toggleEditing = () => {
    setIsEditing((value) => !value);
    setRenamingId(null);
    setMenuTarget(null);
    setDescriptionId(null);
    updateQuery("");
  };

  const openDescriptionEditor = (option: StatusDef) => {
    setDescriptionDraft(option.description ?? "");
    setDescriptionId(option.id);
    setMenuTarget(null);
  };

  const commitDescription = () => {
    if (!description_option) return;
    const trimmed = description_draft.trim();
    option_actions.onSetDescription?.(description_option.id, trimmed === "" ? null : trimmed);
    setDescriptionId(null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || !option_actions.onReorder) return;
    const ids = labeled_options.map((option) => option.id);
    const from_index = ids.indexOf(String(active.id));
    const to_index = ids.indexOf(String(over.id));
    if (from_index === -1 || to_index === -1) return;
    option_actions.onReorder(arrayMove(ids, from_index, to_index));
  };

  // Arrows move through the list, Enter picks the highlighted label or creates the typed one,
  // Backspace on an empty search drops the last chip, Escape closes the picker.
  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    } else if (!is_editing && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      if (pick_options.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      const start_index = highlighted_index < 0 ? (step === 1 ? -1 : 0) : highlighted_index;
      setHighlightedIndex((start_index + step + pick_options.length) % pick_options.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const highlighted = is_editing ? undefined : pick_options[highlighted_index];
      if (highlighted) pickOption(highlighted.id);
      else if (can_create) createLabel();
      else if (!is_editing && pick_options.length === 1) pickOption(pick_options[0].id);
    } else if (event.key === "Backspace" && query === "" && selected_options.length > 0) {
      event.preventDefault();
      onToggle(selected_options[selected_options.length - 1].entry);
    }
  };

  const empty_message = labeled_options.length === 0
    ? "No labels yet. Type a name to create the first one."
    : normalized_query
      ? can_create ? null : "No other labels match."
      : "All labels are selected.";

  return (
    <PopoverPanel onClose={onClose} unstyled className="left-1/2 top-full w-max -translate-x-1/2">
      <div className={`dropdown-picker ${boardTreeFontClassName}`}>
        <div className="dropdown-picker__body">
          {selected_options.length > 0 && (
            <div className="dropdown-picker__chips">
              {selected_options.map((option) => (
                <span
                  key={option.entry}
                  className="dropdown-picker__chip"
                  style={chipStyle(option.color)}
                  data-inactive={option.is_active === false || undefined}
                  title={option.is_active === false ? `${option.label} (inactive)` : option.label}
                >
                  <span className="dropdown-picker__chip-label">{option.label}</span>
                  <button
                    type="button"
                    onClick={() => pickOption(option.entry)}
                    aria-label={`Remove ${option.label}`}
                    className="dropdown-picker__chip-remove"
                  >
                    <CloseIcon size={10} />
                  </button>
                </span>
              ))}
              {selected_options.length > 1 && (
                <Tooltip content="Clear all" placement="top">
                  <button
                    type="button"
                    onClick={() => {
                      onClear();
                      updateQuery("");
                    }}
                    aria-label="Clear all labels"
                    className="dropdown-picker__clear"
                  >
                    <DeleteIcon size={14} />
                  </button>
                </Tooltip>
              )}
            </div>
          )}

          <input
            ref={search_ref}
            autoFocus
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Create or find labels"
            aria-label="Create or find labels"
            className="dropdown-picker__search"
          />

          {is_editing ? (
            <div className="dropdown-picker__list" role="list" aria-label="Labels">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                onDragStart={() => setMenuTarget(null)}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={edit_options.map((option) => option.id)} strategy={verticalListSortingStrategy}>
                  {edit_options.map((option) => (
                    <LabelField
                      key={option.id}
                      option={option}
                      actions={option_actions}
                      can_reorder={can_reorder}
                      is_renaming={renaming_id === option.id}
                      is_menu_open={menu_target?.id === option.id}
                      onStartRename={() => setRenamingId(option.id)}
                      onStopRename={() => setRenamingId(null)}
                      onToggleMenu={(anchor) => setMenuTarget(anchor ? { id: option.id, anchor } : null)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {edit_options.length === 0 && !can_create && (
                <div className="dropdown-picker__empty">{labeled_options.length === 0 ? "No labels yet. Type a name to create the first one." : "No labels match."}</div>
              )}
            </div>
          ) : (
            <div className="dropdown-picker__list" role="listbox" aria-label="Labels" aria-multiselectable="true">
              {pick_options.map((option, index) => (
                <button
                  type="button"
                  key={option.id}
                  role="option"
                  aria-selected={false}
                  data-highlighted={index === highlighted_index || undefined}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => pickOption(option.id)}
                  title={option.description || undefined}
                  className="dropdown-picker__option"
                >
                  <span className="dropdown-picker__chip" style={chipStyle(option.color)}>
                    <span className="dropdown-picker__chip-label">{option.label}</span>
                  </span>
                </button>
              ))}
              {pick_options.length === 0 && empty_message && <div className="dropdown-picker__empty">{empty_message}</div>}
            </div>
          )}

          {can_create && (
            <button type="button" onClick={createLabel} className="dropdown-picker__create">
              <PlusIcon size={12} />
              <span className="dropdown-picker__create-label">Create as a new label</span>
            </button>
          )}

          {description_option && (
            <div className="dropdown-picker__description">
              <p className="dropdown-picker__description-title">
                Description for <strong>{description_option.label}</strong>
              </p>
              <textarea
                autoFocus
                value={description_draft}
                maxLength={500}
                rows={2}
                onChange={(event) => setDescriptionDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    setDescriptionId(null);
                  } else if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    commitDescription();
                  }
                }}
                placeholder="Describe this label..."
                className="dropdown-picker__description-input"
              />
              <div className="dropdown-picker__description-actions">
                <button type="button" onClick={() => setDescriptionId(null)} className="dropdown-picker__button dropdown-picker__button--secondary">
                  Cancel
                </button>
                <button type="button" onClick={commitDescription} className="dropdown-picker__button dropdown-picker__button--primary">
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="dropdown-picker__footer">
          <button type="button" onClick={toggleEditing} className="dropdown-picker__footer-button">
            {is_editing ? "Apply" : "Edit labels"}
          </button>
        </div>
      </div>

      {/* One "..." menu for the whole list, anchored to whichever label opened it. */}
      <MenuFlyout anchor_el={menu_target?.anchor ?? null} is_open={menu_option !== null} onClose={() => setMenuTarget(null)} side="right" width={232} unstyled>
        {menu_option && (
          <div role="menu" aria-label={`${menu_option.label} options`} className={`action-menu ${boardTreeFontClassName}`}>
            {option_actions.onSetDescription && (
              <button type="button" role="menuitem" onClick={() => openDescriptionEditor(menu_option)} className="action-menu__item">
                <span className="action-menu__icon" aria-hidden="true">
                  <TextLinesIcon size={16} />
                </span>
                <span className="action-menu__label">{menu_option.description ? "Edit label description" : "Add label description"}</span>
              </button>
            )}
            {option_actions.onToggleActive && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  option_actions.onToggleActive?.(menu_option.id);
                  setMenuTarget(null);
                }}
                className="action-menu__item"
              >
                <span className="action-menu__icon" aria-hidden="true">
                  {menu_option.is_active === false ? <EyeIcon size={16} /> : <BlockedIcon size={16} />}
                </span>
                <span className="action-menu__label">{menu_option.is_active === false ? "Activate label" : "Deactivate label"}</span>
              </button>
            )}
            <Tooltip content={IN_USE_DELETE_REASON} placement="bottom" disabled={!is_menu_option_in_use} className="w-full">
              <button
                type="button"
                role="menuitem"
                aria-disabled={is_menu_option_in_use || undefined}
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
            </Tooltip>
          </div>
        )}
      </MenuFlyout>

      <ConfirmActionModal
        is_open={pending_delete !== null}
        title="Delete label?"
        description={
          <>
            Delete <strong>{pending_delete?.label}</strong>? It will be removed from this column. This can&rsquo;t be undone.
          </>
        }
        confirm_label="Delete label"
        variant="danger"
        onConfirm={() => {
          if (pending_delete) option_actions.onDelete(pending_delete.id);
        }}
        onClose={() => setPendingDeleteId(null)}
      />
    </PopoverPanel>
  );
}
