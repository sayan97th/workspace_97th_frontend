"use client";
import React, { useMemo, useState } from "react";
import { ArrowDown, ChevronLeft, Plus, X } from "lucide-react";
import type { BoardAutomationDefinition } from "@/types/board-automation";
import type { AutomationBuilderContext } from "./automationCatalog";
import type { AutomationBuilderSaveMeta } from "./AutomationBuilder";
import { draftProblems, draftToDefinition, emptyAction, emptyCondition, MAX_CONDITIONS, type ActionDraft, type AutomationDraft, type ConditionDraft } from "./builderDraft";
import { PickerList, Token } from "./builderUi";
import { BUTTON_CONDITION_ENTRIES, CONDITION_ENTRY_NEEDS, actionFromButtonEntry, buttonActionSections, conditionFromEntry } from "./buttonFlowCatalog";
import ActionRow from "./ActionRow";
import ConditionRow from "./ConditionRow";

export type ButtonAutomationBuilderProps = {
  context: AutomationBuilderContext;
  initial_draft: AutomationDraft;
  is_loading_boards: boolean;
  is_saving: boolean;
  save_error: string | null;
  /** Back to the Automations center. */
  onBack: () => void;
  /** Closes the whole Automations center. */
  onClose: () => void;
  onSave: (definition: BoardAutomationDefinition, meta: AutomationBuilderSaveMeta) => void;
};

const MAX_ACTIONS = 10;

const SIDE_BUTTON =
  "flex h-8 items-center gap-1.5 rounded-[4px] px-2 text-[14px] text-boardtree-text transition-colors hover:bg-boardtree-hover";
const SIDE_ICON =
  "flex h-8 w-8 items-center justify-center rounded-[4px] text-boardtree-text-secondary transition-colors hover:bg-boardtree-hover hover:text-boardtree-text";

/** One sentence line with monday's "+ Add ..." and "x" controls on the right. */
function Line({ children, add_label, onAdd, remove_label, onRemove }: { children: React.ReactNode; add_label?: string; onAdd?: () => void; remove_label?: string; onRemove?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0 flex-1 text-[28px] font-light leading-[1.55] tracking-[-0.01em] text-boardtree-text sm:text-[34px]">{children}</div>
      {(onAdd || onRemove) && (
        <div className="flex flex-none items-center gap-2 pt-3">
          {onAdd && (
            <button type="button" onClick={onAdd} className={SIDE_BUTTON}>
              <Plus size={16} strokeWidth={1.8} />
              {add_label}
            </button>
          )}
          {onRemove && (
            <button type="button" onClick={onRemove} aria-label={remove_label} title={remove_label} className={SIDE_ICON}>
              <X size={17} strokeWidth={1.8} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The Button column's automation builder, laid out like monday's: "When Button clicked", optional
 * "and only if..." conditions, a green arrow, then "Then do this" and every "and then do this"
 * after it. Opened from the Button cell's "Set up" or the column's "Automate", it saves a regular
 * `button_clicked` automation, so pressing the button runs it and Manage lists it.
 */
export default function ButtonAutomationBuilder({ context, initial_draft, is_loading_boards, is_saving, save_error, onBack, onClose, onSave }: ButtonAutomationBuilderProps) {
  const [draft, setDraft] = useState<AutomationDraft>(initial_draft);
  const [has_tried_save, setHasTriedSave] = useState(false);
  // The row just added, whose menu opens by itself like monday's.
  const [fresh_key, setFreshKey] = useState<string | null>(null);
  // Rows still waiting for a pick are left out, like monday's builder ignores an unused "and then do this".
  const saved_draft = useMemo<AutomationDraft>(() => {
    const actions = draft.actions.filter((action) => action.type);
    return { ...draft, actions: actions.length ? actions : draft.actions, conditions: draft.conditions.filter((condition) => condition.column_id) };
  }, [draft]);
  const problems = useMemo(() => draftProblems(saved_draft, context), [saved_draft, context]);

  const button_columns = context.columns.filter((column) => column.scope === "item" && column.kind === "button");
  const trigger_column = button_columns.find((column) => column.id === draft.trigger_column_id) ?? null;
  const has_action = draft.actions.some((action) => action.type);

  const change = (patch: Partial<AutomationDraft>) => setDraft((current) => ({ ...current, ...patch }));

  const addCondition = () => {
    if (draft.conditions.length >= MAX_CONDITIONS) return;
    const condition = emptyCondition();
    setFreshKey(condition.key);
    change({ conditions: [...draft.conditions, condition] });
  };
  const updateCondition = (next: ConditionDraft) => change({ conditions: draft.conditions.map((condition) => (condition.key === next.key ? next : condition)) });
  const removeCondition = (key: string) => change({ conditions: draft.conditions.filter((condition) => condition.key !== key) });

  const updateAction = (next: ActionDraft) => change({ actions: draft.actions.map((action) => (action.key === next.key ? next : action)) });
  const removeAction = (key: string) => {
    const remaining = draft.actions.filter((action) => action.key !== key);
    change({ actions: remaining.length ? remaining : [emptyAction()] });
  };
  const addActionAfter = (key: string) => {
    if (draft.actions.length >= MAX_ACTIONS) return;
    // One empty "and then do this" at a time, a second click just reopens it.
    const pending = draft.actions.find((action) => !action.type);
    if (pending) {
      setFreshKey(`${pending.key}_${Date.now()}`);
      return;
    }
    const action = emptyAction();
    const index = draft.actions.findIndex((entry) => entry.key === key);
    setFreshKey(action.key);
    change({ actions: [...draft.actions.slice(0, index + 1), action, ...draft.actions.slice(index + 1)] });
  };

  const clearAll = () => change({ conditions: [], condition_groups: [], actions: [emptyAction()], else_actions: [] });

  const save = () => {
    setHasTriedSave(true);
    if (problems.length > 0) return;
    onSave(draftToDefinition(saved_draft), {
      name: draft.name.trim() || (trigger_column ? `${trigger_column.title} clicked` : null),
      description: draft.description.trim() || null,
      importance: draft.importance,
      failure_alert: draft.failure_alert,
    });
  };

  const renderConditionPicker = (condition: ConditionDraft, is_first: boolean) => (
    <Token key={fresh_key === condition.key ? "fresh" : "idle"} label={is_first ? "and only if..." : "and if..."} tone="link" default_open={fresh_key === condition.key} aria_label="Choose a condition" popover_width={330}>
      {(close) => (
        <PickerList
          sections={[
            {
              entries: BUTTON_CONDITION_ENTRIES.map((entry) => {
                const is_available = conditionFromEntry(entry.id, context) !== null;
                return { id: entry.id, label: entry.label, leading: entry.icon, disabled: !is_available, hint: is_available ? undefined : CONDITION_ENTRY_NEEDS[entry.id] };
              }),
            },
          ]}
          onPick={(entry_id) => {
            const preset = conditionFromEntry(entry_id, context);
            if (!preset) return;
            updateCondition({ ...condition, ...preset, value: "", values: [], dynamic: null, subitem_rule: null });
            setFreshKey(null);
            close();
          }}
          placeholder="Search"
          max_height={300}
        />
      )}
    </Token>
  );

  const renderActionPicker = (action: ActionDraft, index: number) => {
    const is_fresh = fresh_key !== null && fresh_key.startsWith(action.key);
    return (
      <Token key={is_fresh ? fresh_key : "idle"} label={index === 0 ? "Then do this" : "and then do this"} tone="link" default_open={is_fresh} aria_label="Choose an action" popover_width={330}>
        {(close) => (
          <PickerList
            sections={buttonActionSections(context.is_slack_connected)}
            onPick={(entry_id) => {
              const next = actionFromButtonEntry(entry_id, context, action.key);
              if (next) updateAction(next);
              setFreshKey(null);
              close();
            }}
            placeholder="Search"
            max_height={300}
          />
        )}
      </Token>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-boardtree-surface">
      <div className="flex h-[60px] flex-none items-center justify-between border-b border-boardtree-border-soft px-8">
        <button type="button" onClick={onBack} className="flex h-9 items-center gap-2 rounded-[4px] px-2 text-[15px] text-boardtree-text hover:bg-boardtree-hover">
          <ChevronLeft size={18} strokeWidth={1.8} />
          Back
        </button>
        <button type="button" onClick={onClose} aria-label="Close" title="Close" className="flex h-9 w-9 items-center justify-center rounded-[4px] text-boardtree-text hover:bg-boardtree-hover">
          <X size={20} strokeWidth={1.7} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1240px] px-6 pb-40 pt-16 sm:px-12 lg:pt-24">
          <Line add_label="Add condition" onAdd={draft.conditions.length < MAX_CONDITIONS ? addCondition : undefined} remove_label="Clear the automation" onRemove={clearAll}>
            <span>When </span>
            <Token label={trigger_column?.title ?? "Button"} is_placeholder={!trigger_column} aria_label="Choose a button" popover_width={280}>
              {(close) => (
                <PickerList
                  sections={[{ entries: button_columns.map((column) => ({ id: column.id, label: column.title })) }]}
                  selected={draft.trigger_column_id}
                  onPick={(column_id) => {
                    change({ trigger_column_id: column_id });
                    close();
                  }}
                  placeholder="Search buttons"
                  empty_text="This board has no Button column."
                />
              )}
            </Token>
            <span> clicked</span>
          </Line>

          {draft.conditions.map((condition, index) => (
            <Line key={condition.key} remove_label="Remove this condition" onRemove={() => removeCondition(condition.key)}>
              {condition.column_id ? (
                <ConditionRow
                  condition={condition}
                  is_first={index === 0}
                  lead={<span>{index === 0 ? "and only if " : "and "}</span>}
                  scope="item"
                  context={context}
                  onChange={updateCondition}
                />
              ) : (
                renderConditionPicker(condition, index === 0)
              )}
            </Line>
          ))}

          <div className="my-4 text-[#00854d]" aria-hidden="true">
            <ArrowDown size={34} strokeWidth={1.5} />
          </div>

          {draft.actions.map((action, index) => (
            <div key={action.key} className={index > 0 ? "mt-3" : undefined}>
              {action.type ? (
                <Line
                  add_label="Add action"
                  onAdd={draft.actions.length < MAX_ACTIONS ? () => addActionAfter(action.key) : undefined}
                  remove_label="Remove this action"
                  onRemove={() => removeAction(action.key)}
                >
                  <ActionRow
                    action={action}
                    context={context}
                    only_itemless={false}
                    scopes={["item"]}
                    has_trigger_item
                    is_loading_boards={is_loading_boards}
                    lead={index === 0 ? "Then" : "and"}
                    trigger_type="button_clicked"
                    action_menu="button"
                    onChange={updateAction}
                  />
                </Line>
              ) : (
                <Line remove_label={index > 0 ? "Remove this action" : undefined} onRemove={index > 0 ? () => removeAction(action.key) : undefined}>
                  {renderActionPicker(action, index)}
                </Line>
              )}
            </div>
          ))}

          {save_error && (
            <div role="alert" className="mt-8 max-w-[640px] rounded-[8px] border border-boardtree-danger/30 bg-boardtree-danger-hover px-3 py-2 text-[13px] text-boardtree-danger">
              {save_error}
            </div>
          )}
          {has_tried_save && problems.length > 0 && (
            <ul role="alert" className="mt-8 max-w-[640px] list-disc rounded-[8px] border border-boardtree-border-soft bg-boardtree-panel-alt py-2 pl-7 pr-3 text-[13px] text-boardtree-text-secondary">
              {problems.map((problem) => <li key={problem}>{problem}</li>)}
            </ul>
          )}

          {has_action && (
            <button
              type="button"
              onClick={save}
              disabled={is_saving}
              className="mt-10 h-10 rounded-[4px] bg-boardtree-accent px-4 text-[15px] text-white transition-colors hover:bg-boardtree-accent-hover disabled:opacity-50"
            >
              {is_saving ? "Creating..." : "Create automation"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
