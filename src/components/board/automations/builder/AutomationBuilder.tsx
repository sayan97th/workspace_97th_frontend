"use client";
import React, { useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, Check, ChevronLeft, Copy, CornerDownRight, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { BoardAutomationDefinition, BoardAutomationDto, BoardAutomationFailureAlert, BoardAutomationImportance, BoardAutomationTestResult } from "@/types/board-automation";
import { FAILURE_ALERT_LABELS, IMPORTANCE_LABELS, type AutomationBuilderContext, type NamedOption } from "./automationCatalog";
import { findColumn } from "./automationSentence";
import {
  MAX_CONDITION_GROUPS,
  MAX_CONDITIONS,
  allConditions,
  draftProblems,
  draftToDefinition,
  emptyAction,
  emptyCondition,
  emptyConditionGroup,
  hasNoElseBranch,
  isItemlessTrigger,
  type ActionDraft,
  type AutomationDraft,
  type ConditionDraft,
  type ConditionGroupDraft,
} from "./builderDraft";
import { PickerList, Token } from "./builderUi";
import ActionRow from "./ActionRow";
import ConditionRow from "./ConditionRow";
import TestRunPanel from "./TestRunPanel";
import TriggerRow from "./TriggerRow";
import { ImportanceIcon } from "./ImportanceIcon";

export type AutomationBuilderSaveMeta = { name: string | null; description: string | null; importance: BoardAutomationImportance; failure_alert: BoardAutomationFailureAlert };

export type AutomationBuilderProps = {
  context: AutomationBuilderContext;
  initial_draft: AutomationDraft;
  mode: "create" | "edit";
  is_loading_boards: boolean;
  is_saving: boolean;
  save_error: string | null;
  onBack: () => void;
  onSave: (definition: BoardAutomationDefinition, meta: AutomationBuilderSaveMeta) => void;
  /** The saved automation while editing, for its webhook URL and what it lost. */
  automation?: BoardAutomationDto | null;
  /** Items of this table a test run can use. */
  test_items?: NamedOption[];
  onTestRun?: (definition: BoardAutomationDefinition, item_id: number | null, payload: Record<string, unknown> | null) => Promise<BoardAutomationTestResult>;
  onRegenerateWebhook?: () => Promise<void>;
  /** Shown above the sentence, e.g. which columns a template still needs. */
  notice?: React.ReactNode;
};

/** The URL a webhook automation listens on, with copy and replace. */
function WebhookUrlBox({ url, onRegenerate }: { url: string | null | undefined; onRegenerate?: () => Promise<void> }) {
  const [is_copied, setIsCopied] = useState(false);
  const [is_replacing, setIsReplacing] = useState(false);

  if (!url) {
    return (
      <div className="mb-6 max-w-[720px] rounded-[10px] border border-dashed border-boardtree-border px-4 py-3 text-[12.5px] text-boardtree-text-secondary">
        The webhook URL appears here once the automation is saved. Any service that can send JSON (a form tool, a payment provider, Zapier, Make) posts to it, and the actions read its fields as {"{payload.field}"}.
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1600);
    } catch {
      setIsCopied(false);
    }
  };

  return (
    <div className="mb-6 max-w-[720px] rounded-[10px] border border-boardtree-border-soft bg-boardtree-panel-alt px-4 py-3">
      <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-boardtree-text-faint">Webhook URL</div>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2.5 py-1.5 text-[12.5px] text-boardtree-text">{url}</code>
        <button type="button" onClick={() => void copy()} aria-label="Copy webhook URL" className="flex h-8 items-center gap-1 rounded-[6px] border border-boardtree-border px-2.5 text-[12.5px] text-boardtree-text hover:bg-boardtree-hover">
          {is_copied ? <Check size={14} /> : <Copy size={14} />}
          {is_copied ? "Copied" : "Copy"}
        </button>
        {onRegenerate && (
          <button
            type="button"
            disabled={is_replacing}
            onClick={async () => {
              setIsReplacing(true);
              try {
                await onRegenerate();
              } finally {
                setIsReplacing(false);
              }
            }}
            title="Replace the URL, the current one stops working"
            aria-label="Replace webhook URL"
            className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-boardtree-border text-boardtree-text-secondary hover:bg-boardtree-hover disabled:opacity-40"
          >
            <RefreshCw size={14} className={is_replacing ? "animate-spin" : undefined} />
          </button>
        )}
      </div>
      <div className="mt-1.5 text-[11.5px] text-boardtree-text-faint">Keep it private, anyone with the URL can run this automation. POST a JSON body, up to 64 KB.</div>
    </div>
  );
}

const MAX_ACTIONS = 10;

/** "and" or "or" between conditions, itself a token that flips how they combine. */
function JoinerToken({ value, onChange, label }: { value: "and" | "or"; onChange: (value: "and" | "or") => void; label: string }) {
  return (
    <Token label={value} aria_label={label} popover_width={260}>
      {(close) => (
        <PickerList
          is_searchable={false}
          sections={[{ entries: [{ id: "and", label: "and, every condition must match" }, { id: "or", label: "or, one condition is enough" }] }]}
          selected={value}
          onPick={(id) => {
            onChange(id === "or" ? "or" : "and");
            close();
          }}
        />
      )}
    </Token>
  );
}

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
export default function AutomationBuilder({
  context,
  initial_draft,
  mode,
  is_loading_boards,
  is_saving,
  save_error,
  onBack,
  onSave,
  automation = null,
  test_items = [],
  onTestRun,
  onRegenerateWebhook,
  notice,
}: AutomationBuilderProps) {
  const [draft, setDraft] = useState<AutomationDraft>(initial_draft);
  const [has_tried_save, setHasTriedSave] = useState(false);

  const change = (patch: Partial<AutomationDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const problems = useMemo(() => draftProblems(draft, context), [draft, context]);

  const trigger_column = findColumn(context, draft.trigger_column_id);
  // An "all subitems" trigger runs on the parent item, so its actions write item columns.
  const is_subitem_trigger = draft.trigger_type === "subitem_created" || (trigger_column?.scope === "subitem" && draft.trigger_type !== "all_subitems_status");
  const action_scopes: ("item" | "subitem")[] = is_subitem_trigger ? ["item", "subitem"] : ["item"];
  const is_itemless = isItemlessTrigger(draft.trigger_type);
  const is_webhook = draft.trigger_type === "webhook_received";
  const has_trigger_item = !is_itemless;
  const can_have_conditions = draft.trigger_type !== null && !is_itemless;
  // What the saved automation lost is worth a warning only until the sentence is edited.
  const server_problems = automation !== null && draft === initial_draft ? automation.problems ?? [] : [];

  const condition_count = allConditions(draft).length;
  const can_add_condition = condition_count < MAX_CONDITIONS;
  const updateCondition = (next: ConditionDraft) => change({ conditions: draft.conditions.map((condition) => (condition.key === next.key ? next : condition)) });
  const removeCondition = (key: string) => change({ conditions: draft.conditions.filter((condition) => condition.key !== key) });
  const addCondition = () => {
    if (can_add_condition) change({ conditions: [...draft.conditions, emptyCondition()] });
  };

  const updateGroup = (key: string, patch: Partial<ConditionGroupDraft>) =>
    change({ condition_groups: draft.condition_groups.map((group) => (group.key === key ? { ...group, ...patch } : group)) });
  const removeGroup = (key: string) => change({ condition_groups: draft.condition_groups.filter((group) => group.key !== key) });
  const addGroup = () => {
    if (can_add_condition && draft.condition_groups.length < MAX_CONDITION_GROUPS) change({ condition_groups: [...draft.condition_groups, emptyConditionGroup()] });
  };

  /** Edits one branch, "Then" (`actions`) or "Otherwise" (`else_actions`). */
  const branchApi = (branch: "actions" | "else_actions") => {
    const list = draft[branch];
    return {
      update: (next: ActionDraft) => change({ [branch]: list.map((action) => (action.key === next.key ? next : action)) }),
      remove: (key: string) => {
        const remaining = list.filter((action) => action.key !== key);
        change({ [branch]: branch === "actions" && remaining.length === 0 ? [emptyAction()] : remaining });
      },
      addAfter: (key: string) => {
        if (list.length >= MAX_ACTIONS) return;
        const index = list.findIndex((action) => action.key === key);
        change({ [branch]: [...list.slice(0, index + 1), emptyAction(), ...list.slice(index + 1)] });
      },
    };
  };

  const resetTrigger = () => change({ trigger_type: null, trigger_column_id: null, trigger_value: null, trigger_config: {}, conditions: [], condition_groups: [], else_actions: [] });

  const save = () => {
    setHasTriedSave(true);
    if (problems.length > 0) return;
    onSave(draftToDefinition(draft), {
      name: draft.name.trim() || null,
      description: draft.description.trim() || null,
      importance: draft.importance,
      failure_alert: draft.failure_alert,
    });
  };

  const can_have_else = !hasNoElseBranch(draft.trigger_type) && condition_count > 0;
  const condition_scope = is_subitem_trigger ? "subitem" : "item";

  const renderBranch = (branch: "actions" | "else_actions") => {
    const api = branchApi(branch);
    let has_created_item = false;
    return draft[branch].map((action, index) => {
      const only_itemless = branch === "actions" && is_itemless && !has_created_item;
      if (action.type === "create_item") has_created_item = true;
      return (
        <div key={action.key} className={index > 0 ? "mt-2" : undefined}>
          <SentenceLine
            onAdd={draft[branch].length < MAX_ACTIONS && action.type ? () => api.addAfter(action.key) : undefined}
            add_label="Add another action"
            onRemove={() => api.remove(action.key)}
            remove_label="Remove this action"
          >
            <ActionRow
              action={action}
              context={context}
              only_itemless={only_itemless}
              scopes={action_scopes}
              has_trigger_item={has_trigger_item}
              is_loading_boards={is_loading_boards}
              lead={index > 0 ? "and" : branch === "else_actions" ? "Otherwise" : "Then"}
              is_webhook={is_webhook}
              onChange={api.update}
            />
          </SentenceLine>
        </div>
      );
    });
  };

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
        {notice}

        {automation?.paused_reason && !automation.is_enabled && (
          <div role="status" className="mb-6 flex max-w-[720px] items-start gap-2.5 rounded-[10px] border border-boardtree-danger/30 bg-boardtree-danger-hover px-4 py-3 text-[13px] text-boardtree-text">
            <AlertTriangle size={16} className="mt-0.5 flex-none text-boardtree-danger" />
            <span>
              <strong className="font-semibold">This automation was paused.</strong> {automation.paused_reason} Choose the parts in red again and save to turn it back on.
            </span>
          </div>
        )}
        {server_problems.length > 0 && !automation?.paused_reason && (
          <div role="status" className="mb-6 flex max-w-[720px] items-start gap-2.5 rounded-[10px] border border-boardtree-danger/30 bg-boardtree-danger-hover px-4 py-3 text-[13px] text-boardtree-text">
            <AlertTriangle size={16} className="mt-0.5 flex-none text-boardtree-danger" />
            <span>{server_problems.map((problem) => problem.message).join(" ")}</span>
          </div>
        )}

        {is_webhook && <WebhookUrlBox url={automation?.webhook_url} onRegenerate={onRegenerateWebhook} />}

        <SentenceLine
          onAdd={can_have_conditions && can_add_condition ? addCondition : undefined}
          add_label="Add a condition"
          onRemove={resetTrigger}
          remove_label="Clear the trigger"
        >
          <TriggerRow draft={draft} context={context} onChange={change} is_loading_boards={is_loading_boards} />
        </SentenceLine>

        {draft.conditions.map((condition, index) => (
          <SentenceLine key={condition.key} onRemove={() => removeCondition(condition.key)} remove_label="Remove this condition">
            <ConditionRow
              condition={condition}
              is_first={index === 0}
              lead={index === 0 ? undefined : <><JoinerToken value={draft.condition_operator} onChange={(condition_operator) => change({ condition_operator })} label="How the conditions combine" />{" "}</>}
              scope={condition_scope}
              context={context}
              onChange={updateCondition}
            />
          </SentenceLine>
        ))}

        {draft.condition_groups.map((group, group_index) => {
          const is_first_clause = draft.conditions.length === 0 && group_index === 0;
          return (
            <div key={group.key} className="my-2 rounded-[10px] border border-dashed border-boardtree-border py-1.5 pl-4 pr-1" role="group" aria-label={`Condition group ${group_index + 1}`}>
              <div className="flex items-center justify-between text-[12px] text-boardtree-text-faint">
                <span>
                  {is_first_clause ? "And only if all of this group matches" : <><JoinerToken value={draft.condition_operator} onChange={(condition_operator) => change({ condition_operator })} label="How the conditions combine" /> this group matches</>}
                </span>
                <span className="flex items-center gap-1">
                  {can_add_condition && (
                    <button type="button" onClick={() => updateGroup(group.key, { rules: [...group.rules, emptyCondition()] })} className="rounded-[6px] px-2 py-1 text-[12px] text-boardtree-accent hover:bg-boardtree-hover">
                      + Condition
                    </button>
                  )}
                  <button type="button" onClick={() => removeGroup(group.key)} aria-label="Remove this group" title="Remove this group" className={ROW_ICON}>
                    <Trash2 size={15} />
                  </button>
                </span>
              </div>
              {group.rules.map((rule, rule_index) => (
                <SentenceLine
                  key={rule.key}
                  onRemove={() => {
                    const remaining = group.rules.filter((entry) => entry.key !== rule.key);
                    if (remaining.length === 0) removeGroup(group.key);
                    else updateGroup(group.key, { rules: remaining });
                  }}
                  remove_label="Remove this condition"
                >
                  <ConditionRow
                    condition={rule}
                    is_first={false}
                    lead={rule_index === 0 ? <span className="text-boardtree-text">if </span> : <><JoinerToken value={group.join_operator} onChange={(join_operator) => updateGroup(group.key, { join_operator })} label="How this group's conditions combine" />{" "}</>}
                    scope={condition_scope}
                    context={context}
                    onChange={(next) => updateGroup(group.key, { rules: group.rules.map((entry) => (entry.key === next.key ? next : entry)) })}
                  />
                </SentenceLine>
              ))}
            </div>
          );
        })}

        {can_have_conditions && can_add_condition && draft.condition_groups.length < MAX_CONDITION_GROUPS && (
          <button type="button" onClick={addGroup} className="mt-1 rounded-[6px] px-2 py-1 text-[12.5px] text-boardtree-text-secondary hover:bg-boardtree-hover hover:text-boardtree-accent">
            + Add a condition group
          </button>
        )}

        <div className="my-3 text-[#00854d]" aria-hidden="true">
          <ArrowDown size={34} strokeWidth={1.6} />
        </div>

        {renderBranch("actions")}

        {can_have_else && (
          <div className="mt-6 border-t border-dashed border-boardtree-border-soft pt-4">
            <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-boardtree-text-faint">
              <CornerDownRight size={14} />
              When the item does not meet the conditions
            </div>
            {draft.else_actions.length === 0 ? (
              <button type="button" onClick={() => change({ else_actions: [emptyAction()] })} className="rounded-[6px] px-2 py-1 text-[13px] text-boardtree-accent hover:bg-boardtree-hover">
                + Add &quot;otherwise&quot; actions
              </button>
            ) : (
              renderBranch("else_actions")
            )}
          </div>
        )}

        {draft.trigger_type && (
          <div className="mt-8 grid max-w-[820px] grid-cols-1 gap-3 sm:grid-cols-[1fr_170px_250px]">
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
            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-boardtree-text-secondary">When a run fails</span>
              <select
                value={draft.failure_alert}
                onChange={(event) => change({ failure_alert: event.target.value as BoardAutomationFailureAlert })}
                className="h-9 w-full rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2.5 text-[13.5px] text-boardtree-text outline-none focus:border-boardtree-accent"
              >
                {(Object.keys(FAILURE_ALERT_LABELS) as BoardAutomationFailureAlert[]).map((alert) => (
                  <option key={alert} value={alert}>{FAILURE_ALERT_LABELS[alert]}</option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-3">
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

        {onTestRun && draft.trigger_type && (
          <TestRunPanel
            context={context}
            items={test_items}
            conditions={draft.conditions}
            groups={draft.condition_groups}
            is_itemless={is_itemless}
            is_webhook={is_webhook}
            problems={problems}
            onRun={(item_id, payload) => onTestRun(draftToDefinition(draft), item_id, payload)}
          />
        )}
      </div>
    </div>
  );
}
