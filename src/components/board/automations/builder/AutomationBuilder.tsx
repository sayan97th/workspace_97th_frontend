"use client";
import React, { useMemo, useState } from "react";
import { ArrowDown, ChevronLeft, Plus, Trash2 } from "lucide-react";
import type { BoardAutomationDefinition, BoardAutomationImportance } from "@/types/board-automation";
import { IMPORTANCE_LABELS, type AutomationBuilderContext } from "./automationCatalog";
import { findColumn } from "./automationSentence";
import { draftProblems, draftToDefinition, emptyAction, emptyCondition, type ActionDraft, type AutomationDraft, type ConditionDraft } from "./builderDraft";
import ActionRow from "./ActionRow";
import ConditionRow from "./ConditionRow";
import TriggerRow from "./TriggerRow";
import { ImportanceIcon } from "./ImportanceIcon";

export type AutomationBuilderSaveMeta = { name: string | null; description: string | null; importance: BoardAutomationImportance };

export type AutomationBuilderProps = {
  context: AutomationBuilderContext;
  initial_draft: AutomationDraft;
  mode: "create" | "edit";
  is_loading_boards: boolean;
  is_saving: boolean;
  save_error: string | null;
  onBack: () => void;
  onSave: (definition: BoardAutomationDefinition, meta: AutomationBuilderSaveMeta) => void;
};

const MAX_ACTIONS = 10;
const MAX_CONDITIONS = 10;

const ROW_ICON =
  "flex h-9 w-9 flex-none items-center justify-center rounded-[6px] text-boardtree-text-secondary transition-colors hover:bg-boardtree-hover hover:text-boardtree-text disabled:opacity-30";

/** One line of the sentence with its + and trash buttons on the right, like monday's builder rows. */
function SentenceLine({ children, onAdd, add_label, onRemove, remove_label }: { children: React.ReactNode; onAdd?: () => void; add_label?: string; onRemove: () => void; remove_label: string }) {
  return (
    <div className="group flex items-start justify-between gap-6">
      <div className="min-w-0 flex-1 text-[26px] font-light leading-[1.6] tracking-[-0.01em] text-boardtree-text sm:text-[30px]">{children}</div>
      <div className="flex flex-none items-center gap-1 pt-2.5">
        {onAdd && (
          <button type="button" onClick={onAdd} aria-label={add_label} title={add_label} className={ROW_ICON}>
            <Plus size={18} />
          </button>
        )}
        <button type="button" onClick={onRemove} aria-label={remove_label} title={remove_label} className={ROW_ICON}>
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  );
}

/**
 * The monday style sentence builder: "When <trigger>, and only if <conditions>, then <actions>".
 * Every underlined word opens its own picker. The + on the trigger line adds a condition, the + on
 * an action line adds another action after it.
 */
export default function AutomationBuilder({ context, initial_draft, mode, is_loading_boards, is_saving, save_error, onBack, onSave }: AutomationBuilderProps) {
  const [draft, setDraft] = useState<AutomationDraft>(initial_draft);
  const [has_tried_save, setHasTriedSave] = useState(false);

  const change = (patch: Partial<AutomationDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const problems = useMemo(() => draftProblems(draft, context), [draft, context]);

  const trigger_column = findColumn(context, draft.trigger_column_id);
  const is_subitem_trigger = draft.trigger_type === "subitem_created" || trigger_column?.scope === "subitem";
  const action_scopes: ("item" | "subitem")[] = is_subitem_trigger ? ["item", "subitem"] : ["item"];
  const has_trigger_item = draft.trigger_type !== "recurring";
  const can_have_conditions = draft.trigger_type !== null && draft.trigger_type !== "recurring";

  const updateCondition = (next: ConditionDraft) => change({ conditions: draft.conditions.map((condition) => (condition.key === next.key ? next : condition)) });
  const removeCondition = (key: string) => change({ conditions: draft.conditions.filter((condition) => condition.key !== key) });
  const addCondition = () => {
    if (draft.conditions.length < MAX_CONDITIONS) change({ conditions: [...draft.conditions, emptyCondition()] });
  };

  const updateAction = (next: ActionDraft) => change({ actions: draft.actions.map((action) => (action.key === next.key ? next : action)) });
  const removeAction = (key: string) => {
    const remaining = draft.actions.filter((action) => action.key !== key);
    change({ actions: remaining.length ? remaining : [emptyAction()] });
  };
  const addActionAfter = (key: string) => {
    if (draft.actions.length >= MAX_ACTIONS) return;
    const index = draft.actions.findIndex((action) => action.key === key);
    change({ actions: [...draft.actions.slice(0, index + 1), emptyAction(), ...draft.actions.slice(index + 1)] });
  };

  const resetTrigger = () => change({ trigger_type: null, trigger_column_id: null, trigger_value: null, trigger_config: {}, conditions: [] });

  const save = () => {
    setHasTriedSave(true);
    if (problems.length > 0) return;
    onSave(draftToDefinition(draft), {
      name: draft.name.trim() || null,
      description: draft.description.trim() || null,
      importance: draft.importance,
    });
  };

  let has_created_item = false;

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-none items-center justify-between">
        <button type="button" onClick={onBack} className="flex h-8 items-center gap-1 rounded-[6px] pl-1 pr-2.5 text-[14px] text-boardtree-text hover:bg-boardtree-hover">
          <ChevronLeft size={18} />
          Back
        </button>
        <span className="text-[12.5px] text-boardtree-text-faint">{mode === "edit" ? "Editing automation" : "Custom automation"}</span>
      </div>

      <div className="mx-auto w-full max-w-[920px] flex-1 px-2 pb-8 pt-10 sm:px-6">
        <SentenceLine
          onAdd={can_have_conditions && draft.conditions.length < MAX_CONDITIONS ? addCondition : undefined}
          add_label="Add a condition"
          onRemove={resetTrigger}
          remove_label="Clear the trigger"
        >
          <TriggerRow draft={draft} context={context} onChange={change} />
        </SentenceLine>

        {draft.conditions.map((condition, index) => (
          <SentenceLine key={condition.key} onRemove={() => removeCondition(condition.key)} remove_label="Remove this condition">
            <ConditionRow condition={condition} is_first={index === 0} scope={is_subitem_trigger ? "subitem" : "item"} context={context} onChange={updateCondition} />
          </SentenceLine>
        ))}

        <div className="my-3 text-[#00854d]" aria-hidden="true">
          <ArrowDown size={34} strokeWidth={1.6} />
        </div>

        {draft.actions.map((action, index) => {
          const only_itemless = draft.trigger_type === "recurring" && !has_created_item;
          if (action.type === "create_item") has_created_item = true;
          return (
            <div key={action.key} className={index > 0 ? "mt-2" : undefined}>
              <SentenceLine
                onAdd={draft.actions.length < MAX_ACTIONS && action.type ? () => addActionAfter(action.key) : undefined}
                add_label="Add another action"
                onRemove={() => removeAction(action.key)}
                remove_label="Remove this action"
              >
                <ActionRow
                  action={action}
                  context={context}
                  only_itemless={only_itemless}
                  scopes={action_scopes}
                  has_trigger_item={has_trigger_item}
                  is_loading_boards={is_loading_boards}
                  lead={index === 0 ? "Then" : "and"}
                  onChange={updateAction}
                />
              </SentenceLine>
            </div>
          );
        })}

        {draft.trigger_type && (
          <div className="mt-8 grid max-w-[640px] grid-cols-1 gap-3 sm:grid-cols-[1fr_170px]">
            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-boardtree-text-secondary">Name (optional)</span>
              <input
                value={draft.name}
                maxLength={255}
                onChange={(event) => change({ name: event.target.value })}
                placeholder="Automation name"
                className="h-9 w-full rounded-[6px] border border-boardtree-border bg-boardtree-surface px-3 text-[13.5px] text-boardtree-text outline-none placeholder:text-boardtree-text-faint focus:border-boardtree-accent"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-boardtree-text-secondary">Importance</span>
              <span className="relative block">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"><ImportanceIcon importance={draft.importance} /></span>
                <select
                  value={draft.importance}
                  onChange={(event) => change({ importance: event.target.value as BoardAutomationImportance })}
                  className="h-9 w-full appearance-none rounded-[6px] border border-boardtree-border bg-boardtree-surface pl-8 pr-3 text-[13.5px] text-boardtree-text outline-none focus:border-boardtree-accent"
                >
                  {(Object.keys(IMPORTANCE_LABELS) as BoardAutomationImportance[]).map((level) => (
                    <option key={level} value={level}>{IMPORTANCE_LABELS[level]}</option>
                  ))}
                </select>
              </span>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[12px] font-medium text-boardtree-text-secondary">Description (optional)</span>
              <input
                value={draft.description}
                maxLength={1000}
                onChange={(event) => change({ description: event.target.value })}
                placeholder="What this automation is for"
                className="h-9 w-full rounded-[6px] border border-boardtree-border bg-boardtree-surface px-3 text-[13.5px] text-boardtree-text outline-none placeholder:text-boardtree-text-faint focus:border-boardtree-accent"
              />
            </label>
          </div>
        )}

        {save_error && (
          <div role="alert" className="mt-5 max-w-[640px] rounded-[8px] border border-boardtree-danger/30 bg-boardtree-danger-hover px-3 py-2 text-[12.5px] text-boardtree-danger">
            {save_error}
          </div>
        )}

        {has_tried_save && problems.length > 0 && (
          <ul role="alert" className="mt-5 max-w-[640px] list-disc rounded-[8px] border border-boardtree-border-soft bg-boardtree-panel-alt py-2 pl-7 pr-3 text-[12.5px] text-boardtree-text-secondary">
            {problems.map((problem) => <li key={problem}>{problem}</li>)}
          </ul>
        )}

        <button
          type="button"
          onClick={save}
          disabled={is_saving || (has_tried_save && problems.length > 0)}
          className="mt-6 h-10 rounded-[4px] bg-boardtree-accent px-5 text-[14px] font-medium text-white hover:bg-boardtree-accent-hover disabled:opacity-50"
        >
          {is_saving ? "Saving..." : mode === "edit" ? "Save changes" : "Create automation"}
        </button>
      </div>
    </div>
  );
}
