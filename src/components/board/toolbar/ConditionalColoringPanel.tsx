"use client";
import React from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CloseIcon, ColorFillIcon, DragHandleIcon, PlusIcon } from "@/icons/board-icons";
import { FeedbackIcon } from "@/icons/board-options-icons";
import { ChevronDownIcon, HelpIcon } from "@/icons/workspace-icons";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import {
  BOARD_ADVANCED_FILTER_CONDITIONS,
  BOARD_CONDITIONAL_COLOR_SCOPES,
  BOARD_CONDITIONAL_COLORING_DEFAULTS,
  BOARD_CONDITIONAL_COLORING_PALETTE,
  BOARD_VALUELESS_CONDITIONS,
  type BoardConditionalColorRule,
  type BoardToolbarApi,
  type BoardToolbarViewActions,
} from "./types";
import ColorSwatchPicker from "./ColorSwatchPicker";
import ColumnSwatchBadge from "./ColumnSwatchBadge";
import { isConditionalColorRuleComplete } from "./deriveBoardRows";
import InlineFieldMenu from "./InlineFieldMenu";
import SaveViewButtons from "./SaveViewButtons";
import "./filter-panel.css";
import "./toolbar-panel.css";

export type ConditionalColoringPanelProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
  view_actions?: BoardToolbarViewActions;
  /** Wires the header's "Give feedback" button. The host owns the modal, since this panel unmounts when it closes. Omit to hide it. */
  onRequestFeedback?: () => void;
};

const HELP_TEXT = "Color items or cells when a column matches a condition. Rules apply top to bottom, the first match wins.";

/**
 * Field widths, fixed like monday's so the row never shifts while a column, condition or value is picked. Each one
 * still shrinks when the toolbar is narrow (see `toolbar-panel.css`).
 */
const FIELD_WIDTH = { scope: 96, column: 200, condition: 164, value: 220 } as const;

/** Tallest the Column and Value lists may grow. Both also shrink to the room left in the window and scroll past that. */
const COLUMN_MENU_MAX_HEIGHT = 640;
const VALUE_MENU_MAX_HEIGHT = 480;

/** The local id of the empty row shown while no rule exists yet. */
const DRAFT_RULE_ID = "draft";

const DRAFT_RULE: BoardConditionalColorRule = {
  id: DRAFT_RULE_ID,
  color: BOARD_CONDITIONAL_COLORING_DEFAULTS[0],
  scope: "cell",
  column_id: null,
  condition: null,
  value: "",
};

type ColorRuleRowProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
  rule: BoardConditionalColorRule;
  onUpdate: (patch: Partial<BoardConditionalColorRule>) => void;
  /** Omitted for the draft row, which has nothing to remove. */
  onRemove?: () => void;
};

/** A disabled field that keeps the dropdown look, for a value that cannot be picked yet (or is not needed). */
function ValuePlaceholder({ label }: { label: string }) {
  return (
    <div className="field-input field-input--placeholder toolbar-panel__color-value toolbar-panel__color-placeholder" style={{ width: FIELD_WIDTH.value }} aria-disabled>
      <span className="field-menu__label">{label}</span>
      <ChevronDownIcon size={11} />
    </div>
  );
}

/**
 * One rule: drag handle, color, Row/Cell scope, "When", column, condition, value and a remove "x". The value
 * lists the column's labels (Status, Dropdown, People and the like) and is free text for any other column.
 */
function ColorRuleRow<TRow>({ toolbar, rule, onUpdate, onRemove }: ColorRuleRowProps<TRow>) {
  const is_draft = rule.id === DRAFT_RULE_ID;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: rule.id,
    disabled: is_draft,
  });
  const colorable_columns = toolbar.columns.filter((column) => column.swatch);
  const selected_column = colorable_columns.find((column) => column.id === rule.column_id);
  const selected_condition = BOARD_ADVANCED_FILTER_CONDITIONS.find((condition) => condition.id === rule.condition);
  const selected_scope = BOARD_CONDITIONAL_COLOR_SCOPES.find((scope) => scope.id === rule.scope);
  const field = toolbar.filter_fields.find((candidate) => candidate.id === rule.column_id && candidate.scope !== "subitem");
  const value_options = field?.options ?? [];
  const is_valueless = rule.condition !== null && BOARD_VALUELESS_CONDITIONS.has(rule.condition);
  const update = onUpdate;

  const renderValue = () => {
    if (!selected_column) return <ValuePlaceholder label="Value" />;
    if (is_valueless) return <ValuePlaceholder label="No value needed" />;
    if (value_options.length > 0) {
      const selected_option = value_options.find((option) => option.label.toLowerCase() === rule.value.trim().toLowerCase());
      return (
        <InlineFieldMenu
          width={FIELD_WIDTH.value}
          className="toolbar-panel__color-value"
          menu_max_height={VALUE_MENU_MAX_HEIGHT}
          options={value_options}
          getOptionId={(option) => option.id}
          getSearchText={(option) => option.label}
          search_placeholder="Search values"
          empty_label="No values found"
          isSelected={(option) => option.id === selected_option?.id}
          onSelect={(option) => update({ value: option.label, condition: rule.condition ?? "equals" })}
          renderValue={() =>
            rule.value ? (
              <>
                {selected_option?.dot_color && <span className="toolbar-panel__value-dot" style={{ background: selected_option.dot_color }} />}
                <span className="field-menu__label">{rule.value}</span>
              </>
            ) : (
              <span className="field-menu__placeholder">Value</span>
            )
          }
          renderOption={(option) => (
            <>
              {option.dot_color && <span className="toolbar-panel__value-dot" style={{ background: option.dot_color }} />}
              <span className="field-menu__label">{option.label || "(Empty)"}</span>
            </>
          )}
        />
      );
    }
    return (
      <input
        type="text"
        value={rule.value}
        onChange={(event) => update({ value: event.target.value })}
        placeholder="Value"
        aria-label="Value"
        className="field-input toolbar-panel__color-value"
        style={{ width: FIELD_WIDTH.value }}
      />
    );
  };

  return (
    <div
      ref={setNodeRef}
      className="filter-rule toolbar-panel__color-rule"
      data-dragging={isDragging}
      data-draft={is_draft || undefined}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <Tooltip content="Drag to reorder" disabled={is_draft} className="flex">
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          disabled={is_draft}
          aria-label="Drag to reorder"
          className="filter-rule__handle"
        >
          <DragHandleIcon />
        </button>
      </Tooltip>

      <Tooltip content="Choose color" className="flex">
        <ColorSwatchPicker
          color={rule.color}
          size={24}
          appearance="panel"
          palette={BOARD_CONDITIONAL_COLORING_PALETTE}
          trigger_class_name="toolbar-panel__color-swatch"
          icon={<ColorFillIcon size={13} />}
          onSelect={(color) => update({ color })}
        />
      </Tooltip>

      <InlineFieldMenu
        width={FIELD_WIDTH.scope}
        className="toolbar-panel__color-scope"
        options={BOARD_CONDITIONAL_COLOR_SCOPES}
        getOptionId={(option) => option.id}
        isSelected={(option) => option.id === rule.scope}
        onSelect={(option) => update({ scope: option.id })}
        renderValue={() => <span className="field-menu__label">{selected_scope?.label}</span>}
        renderOption={(option) => <span>{option.label}</span>}
      />

      <span className="toolbar-panel__color-when">When</span>

      <div className="filter-rule__fields">
        <InlineFieldMenu
          width={FIELD_WIDTH.column}
          className="toolbar-panel__color-column"
          menu_heading="Item columns"
          menu_max_height={COLUMN_MENU_MAX_HEIGHT}
          options={colorable_columns}
          getOptionId={(column) => column.id}
          getSearchText={(column) => column.full_label ?? column.label ?? column.id}
          search_placeholder="Search columns"
          empty_label="No columns found"
          isSelected={(column) => column.id === rule.column_id}
          onSelect={(column) => {
            if (column.id === rule.column_id) return;
            // Labels from another column mean nothing here, so the value starts over.
            update({ column_id: column.id, condition: rule.condition ?? "equals", value: "" });
          }}
          renderValue={() =>
            selected_column ? (
              <>
                {selected_column.swatch && <ColumnSwatchBadge swatch={selected_column.swatch} size={20} />}
                <span className="field-menu__label">{selected_column.full_label ?? selected_column.label}</span>
              </>
            ) : (
              <span className="field-menu__placeholder">Column</span>
            )
          }
          renderOption={(column) => (
            <>
              {column.swatch && <ColumnSwatchBadge swatch={column.swatch} size={20} />}
              <span className="field-menu__label">{column.full_label ?? column.label}</span>
            </>
          )}
        />

        <InlineFieldMenu
          width={FIELD_WIDTH.condition}
          className="toolbar-panel__color-condition"
          options={BOARD_ADVANCED_FILTER_CONDITIONS}
          getOptionId={(option) => option.id}
          isSelected={(option) => option.id === rule.condition}
          onSelect={(option) =>
            // A value means nothing to "Is empty" and "Is not empty", so it is dropped instead of lingering hidden.
            update(BOARD_VALUELESS_CONDITIONS.has(option.id) ? { condition: option.id, value: "" } : { condition: option.id })
          }
          renderValue={() =>
            selected_condition ? (
              <span className="field-menu__label">{selected_condition.label}</span>
            ) : (
              <span className="field-menu__placeholder">Condition</span>
            )
          }
          renderOption={(option) => <span>{option.label}</span>}
        />

        {renderValue()}
      </div>

      {onRemove ? (
        <Tooltip content="Remove condition">
          <button type="button" onClick={onRemove} className="filter-panel__icon-button toolbar-panel__color-remove" aria-label="Remove condition">
            <CloseIcon size={12} />
          </button>
        </Tooltip>
      ) : (
        <span className="toolbar-panel__color-remove-spacer" aria-hidden />
      )}
    </div>
  );
}

/**
 * monday style Conditional coloring panel, opened from the toolbar's "..." menu: a header with a help tooltip,
 * "Give feedback" and "Save as new view", then one draggable rule per row (see {@link ColorRuleRow}) and
 * "+ New condition". Like monday, it never opens empty: with no rules it shows a draft row that only becomes a real
 * rule once it is edited, so opening the panel never changes (or autosaves) the view. Shares the Filter panel card
 * (`filter-panel.css`) and its `.filter-rule` rows; the card has no `overflow: hidden`, so the field menus can float
 * past its bottom edge.
 */
function ConditionalColoringPanel<TRow>({ toolbar, view_actions, onRequestFeedback }: ConditionalColoringPanelProps<TRow>) {
  const rules = toolbar.conditional_color_rules;
  const visible_rules = rules.length > 0 ? rules : [DRAFT_RULE];
  const has_active_rule = rules.some(isConditionalColorRuleComplete);
  // A small distance threshold, so a plain click on the handle never starts a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) toolbar.moveConditionalColorRule(String(active.id), String(over.id));
  };

  return (
    <div className="filter-panel toolbar-panel toolbar-panel--color" role="dialog" aria-label="Conditional coloring">
      <div className="filter-panel__header">
        <h2 className="filter-panel__title">Conditional coloring</h2>
        <Tooltip placement="bottom" content={HELP_TEXT}>
          <span className="filter-panel__help" tabIndex={0} aria-label="About conditional coloring">
            <HelpIcon size={16} />
          </span>
        </Tooltip>
        <div className="filter-panel__header-actions">
          {onRequestFeedback && (
            <Tooltip content="Give feedback">
              <button type="button" onClick={onRequestFeedback} className="filter-panel__icon-button" aria-label="Give feedback">
                <FeedbackIcon size={16} />
              </button>
            </Tooltip>
          )}
          <SaveViewButtons view_actions={view_actions} appearance="panel" is_save_as_new_disabled={!has_active_rule} />
        </div>
      </div>

      <div className="toolbar-panel__body">
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis, restrictToParentElement]} onDragEnd={handleDragEnd}>
          <SortableContext items={visible_rules.map((rule) => rule.id)} strategy={verticalListSortingStrategy}>
            <div className="filter-panel__rules">
              {visible_rules.map((rule) =>
                rule.id === DRAFT_RULE_ID ? (
                  <ColorRuleRow
                    key={rule.id}
                    toolbar={toolbar}
                    rule={rule}
                    onUpdate={(patch) => toolbar.addConditionalColorRule({ ...DRAFT_RULE, ...patch })}
                  />
                ) : (
                  <ColorRuleRow
                    key={rule.id}
                    toolbar={toolbar}
                    rule={rule}
                    onUpdate={(patch) => toolbar.updateConditionalColorRule(rule.id, patch)}
                    onRemove={() => toolbar.removeConditionalColorRule(rule.id)}
                  />
                )
              )}
            </div>
          </SortableContext>
        </DndContext>

        <div className="toolbar-panel__add-row">
          <button
            type="button"
            // With only the draft showing, the draft becomes the first rule and a second one is added under it.
            onClick={() => {
              if (rules.length === 0) toolbar.addConditionalColorRule({ ...DRAFT_RULE });
              toolbar.addConditionalColorRule();
            }}
            className="filter-panel__add-button"
          >
            <PlusIcon size={14} />
            New condition
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConditionalColoringPanel;
