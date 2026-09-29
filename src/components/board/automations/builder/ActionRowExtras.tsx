"use client";
import React, { useState } from "react";
import type { BoardAutomationActionParams } from "@/types/board-automation";
import type { ColumnKind } from "../../table/types";
import { MAX_WAIT_DAYS, SETTABLE_KINDS, type ActionPickerId, type AutomationBuilderContext } from "./automationCatalog";
import { columnLabel, findColumn, rotationLabel, valueLabel, waitLabel } from "./automationSentence";
import type { ActionDraft } from "./builderDraft";
import { MiniAvatar, PickerList, PopoverFooter, POPOVER_INPUT, POPOVER_LABEL, Segmented, Token } from "./builderUi";
import { ColumnPicker, ColumnValueEditor, PersonPicker } from "./valueEditors";

/**
 * The sentences of the flow actions: wait, shift dependent items, assign in turn, set every
 * subitem or the parent, add checklist tasks. `ActionRow` hands each one its verb token.
 */

export const EXTRA_ACTION_IDS: ActionPickerId[] = ["wait", "shift_dependents", "assign_round_robin", "set_subitems_value", "set_parent_value", "add_checklist_items"];

const Words = ({ children }: { children: React.ReactNode }) => <span className="text-boardtree-text">{children}</span>;

export type ExtraActionRowProps = {
  action: ActionDraft;
  context: AutomationBuilderContext;
  lead: "Then" | "and" | "Otherwise";
  /** The action's verb, which swaps the whole action when picked again. */
  renderSwitch: (label: string) => React.ReactNode;
  onPatch: (next: BoardAutomationActionParams) => void;
};

const WAIT_MAX: Record<"minutes" | "hours" | "days", number> = { minutes: MAX_WAIT_DAYS * 1440, hours: MAX_WAIT_DAYS * 24, days: MAX_WAIT_DAYS };

function WaitEditor({ params, onApply }: { params: BoardAutomationActionParams; onApply: (patch: BoardAutomationActionParams) => void }) {
  const initial_unit = params.unit === "minutes" || params.unit === "hours" ? params.unit : "days";
  const [amount, setAmount] = useState(String(params.amount ?? 1));
  const [unit, setUnit] = useState<"minutes" | "hours" | "days">(initial_unit);
  const [recheck, setRecheck] = useState(Boolean(params.recheck_conditions));
  const number = Math.round(Number(amount));
  const is_valid = Number.isFinite(number) && number >= 1 && number <= WAIT_MAX[unit];

  return (
    <>
      <div className={POPOVER_LABEL}>Wait for</div>
      <div className="flex items-center gap-2">
        <input autoFocus type="number" min={1} max={WAIT_MAX[unit]} value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="How long" className={`${POPOVER_INPUT} w-20`} />
        <select value={unit} onChange={(event) => setUnit(event.target.value as "minutes" | "hours" | "days")} aria-label="Unit" className={`${POPOVER_INPUT} flex-1`}>
          <option value="minutes">minutes</option>
          <option value="hours">hours</option>
          <option value="days">days</option>
        </select>
      </div>
      {!is_valid && amount.trim() !== "" && <div className="mt-1.5 text-[11.5px] text-boardtree-danger">Wait between 1 {unit.slice(0, -1)} and {MAX_WAIT_DAYS} days.</div>}
      <label className="mt-2.5 flex items-start gap-2 text-[12.5px] text-boardtree-text-secondary">
        <input type="checkbox" checked={recheck} onChange={(event) => setRecheck(event.target.checked)} className="mt-0.5 accent-boardtree-accent" />
        <span>Check the conditions again after waiting, and stop if the item no longer meets them</span>
      </label>
      <PopoverFooter is_disabled={!is_valid} onDone={() => onApply({ amount: number, unit, recheck_conditions: recheck })} />
    </>
  );
}

/** The people an "assign in turn" action rotates through, picked in order. */
function RotationEditor({ context, params, onApply }: { context: AutomationBuilderContext; params: BoardAutomationActionParams; onApply: (patch: BoardAutomationActionParams) => void }) {
  const [ids, setIds] = useState<string[]>((params.user_ids ?? []).map(String));
  const [strategy, setStrategy] = useState<"rotation" | "least_busy">(params.strategy === "least_busy" ? "least_busy" : "rotation");
  const toggle = (id: string) => setIds((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));

  return (
    <>
      <div className="mb-2">
        <Segmented label="How" options={[{ id: "rotation", label: "In turn" }, { id: "least_busy", label: "Fewest items" }]} value={strategy} onChange={setStrategy} />
      </div>
      <div className="mb-1.5 text-[11.5px] leading-snug text-boardtree-text-faint">
        {strategy === "rotation" ? "Each new item goes to the next person, in the order picked." : "Each new item goes to whoever holds the fewest open items in the column."}
      </div>
      <PickerList
        sections={[{ entries: context.people.map((person) => ({ id: person.id, label: person.name, hint: ids.includes(person.id) ? `#${ids.indexOf(person.id) + 1}` : undefined, leading: <MiniAvatar initials={person.initials} color={person.color} /> })) }]}
        selected={ids}
        onPick={toggle}
        placeholder="Search people"
        max_height={220}
      />
      <PopoverFooter is_disabled={ids.length === 0} onDone={() => onApply({ user_ids: ids.map(Number), strategy })} />
    </>
  );
}

function TasksEditor({ tasks, onApply }: { tasks: string[]; onApply: (tasks: string[]) => void }) {
  const [draft, setDraft] = useState(tasks.join("\n"));
  const parsed = draft.split("\n").map((line) => line.trim()).filter(Boolean);
  return (
    <>
      <div className={POPOVER_LABEL}>One task per line</div>
      <textarea
        autoFocus
        rows={5}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={"Review the brief\nBook the kickoff\nShare the plan"}
        aria-label="Checklist tasks"
        className="w-full resize-none rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2.5 py-2 text-[13px] text-boardtree-text outline-none placeholder:text-boardtree-text-faint focus:border-boardtree-accent"
      />
      <div className="mt-1 text-[11.5px] text-boardtree-text-faint">Tasks the checklist already has are skipped.</div>
      <PopoverFooter is_disabled={parsed.length === 0} onDone={() => onApply(parsed.slice(0, 20))} />
    </>
  );
}

/** A column token limited to one scope and some kinds, for the cascade actions. */
function ScopedColumnToken({ context, column_id, kinds, scope, fallback, onPick }: { context: AutomationBuilderContext; column_id: number | undefined; kinds: ColumnKind[]; scope: "item" | "subitem"; fallback: string; onPick: (column_id: string) => void }) {
  const column = findColumn(context, column_id);
  const is_invalid = column_id != null && !column;
  return (
    <Token label={is_invalid ? "deleted column" : columnLabel(context, column_id, fallback)} is_placeholder={!column} is_invalid={is_invalid} aria_label="Choose a column">
      {(close) => (
        <ColumnPicker
          context={context}
          kinds={kinds}
          scopes={[scope]}
          selected={column_id != null ? String(column_id) : null}
          empty_text={scope === "subitem" ? "Add a subitem column of the right kind first." : undefined}
          onPick={(id) => {
            onPick(id);
            close();
          }}
        />
      )}
    </Token>
  );
}

/** "to <value>" for an action writing one column, shaped by that column's kind. */
function ValueToken({ context, params, onPatch }: { context: AutomationBuilderContext; params: BoardAutomationActionParams; onPatch: (next: BoardAutomationActionParams) => void }) {
  const column = findColumn(context, params.target_column_id);
  const is_blank = params.value === undefined || params.value === null || params.value === "";
  return (
    <Token label={valueLabel(context, column, params.value)} is_placeholder={is_blank} disabled={!column} aria_label="Value">
      {(close) => (column ? <ColumnValueEditor context={context} column={column} value={params.value} mode="set" onApply={(value) => { onPatch({ value }); close(); }} /> : null)}
    </Token>
  );
}

export default function ActionRowExtras({ action, context, lead, renderSwitch, onPatch }: ExtraActionRowProps) {
  const params = action.params;

  switch (action.picker_id) {
    case "wait":
      return (
        <>
          <Words>{lead} </Words>{renderSwitch("wait")}{" "}
          <Token label={waitLabel(params)} aria_label="How long to wait" popover_width={300}>
            {(close) => <WaitEditor params={params} onApply={(next) => { onPatch(next); close(); }} />}
          </Token>
          <Words>{params.recheck_conditions ? ", check the conditions again," : ","} then continue</Words>
        </>
      );
    case "shift_dependents": {
      const dependency_columns = context.columns.filter((column) => column.scope === "item" && column.kind === "dependency");
      return (
        <>
          <Words>{lead} </Words>{renderSwitch("shift")}{" "}
          <ScopedColumnToken context={context} column_id={params.target_column_id} kinds={["date", "timeline"]} scope="item" fallback="dates" onPick={(id) => onPatch({ target_column_id: Number(id) })} />{" "}
          <Words>of the items that depend on it in </Words>
          <Token
            label={params.dependency_column_id && !findColumn(context, params.dependency_column_id) ? "deleted column" : columnLabel(context, params.dependency_column_id, "dependency")}
            is_placeholder={!params.dependency_column_id}
            is_invalid={Boolean(params.dependency_column_id) && !findColumn(context, params.dependency_column_id)}
            aria_label="Dependency column"
          >
            {(close) =>
              dependency_columns.length === 0 ? (
                <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">Add a Dependency column to this table first, it says which items depend on which.</div>
              ) : (
                <PickerList sections={[{ entries: dependency_columns.map((column) => ({ id: column.id, label: column.title })) }]} selected={params.dependency_column_id ? String(params.dependency_column_id) : null} onPick={(id) => { onPatch({ dependency_column_id: Number(id) }); close(); }} placeholder="Search columns" />
              )
            }
          </Token>
          <Words>, </Words>
          <Token label={params.mode === "flexible" ? "only when they would overlap" : "keeping the gap"} aria_label="How dependent items move" popover_width={300}>
            {(close) => (
              <>
                <PickerList
                  is_searchable={false}
                  sections={[{ entries: [
                    { id: "strict", label: "Keep the gap", hint: "strict" },
                    { id: "flexible", label: "Only when they would overlap", hint: "flexible" },
                  ] }]}
                  selected={params.mode === "flexible" ? "flexible" : "strict"}
                  onPick={(id) => { onPatch({ mode: id === "flexible" ? "flexible" : "strict" }); close(); }}
                />
                <div className="mt-1.5 px-2 text-[11.5px] leading-snug text-boardtree-text-faint">
                  Keep the gap moves them as far as this date just moved, pair it with a date changes trigger on the same column. Otherwise an item is only pushed to start the day after this one ends.
                </div>
              </>
            )}
          </Token>
          <Words>, </Words>
          <Token label={params.use_working_days ? "counting working days" : "counting every day"} aria_label="Working days" popover_width={260}>
            {(close) => (
              <PickerList is_searchable={false} sections={[{ entries: [{ id: "all", label: "Count every day" }, { id: "working", label: "Count working days only" }] }]} selected={params.use_working_days ? "working" : "all"} onPick={(id) => { onPatch({ use_working_days: id === "working" }); close(); }} />
            )}
          </Token>
        </>
      );
    }
    case "assign_round_robin":
      return (
        <>
          <Words>{lead} </Words>{renderSwitch("assign")}{" "}
          <Token label={rotationLabel(context, params)} is_placeholder={!params.user_ids?.length} aria_label="People to rotate" popover_width={320}>
            {(close) => <RotationEditor context={context} params={params} onApply={(next) => { onPatch(next); close(); }} />}
          </Token>{" "}
          <Words>{params.strategy === "least_busy" ? "by workload in " : "in turn in "}</Words>
          <ScopedColumnToken context={context} column_id={params.target_column_id} kinds={["people"]} scope="item" fallback="people" onPick={(id) => onPatch({ target_column_id: Number(id) })} />{" "}
          <Token label={params.replace ? "replacing others" : "keeping others"} aria_label="Existing assignees" popover_width={240}>
            {(close) => (
              <PickerList is_searchable={false} sections={[{ entries: [{ id: "keep", label: "Keep the people already assigned" }, { id: "replace", label: "Replace them" }] }]} selected={params.replace ? "replace" : "keep"} onPick={(id) => { onPatch({ replace: id === "replace" }); close(); }} />
            )}
          </Token>
        </>
      );
    case "set_subitems_value":
      return (
        <>
          <Words>{lead} </Words>{renderSwitch("set")}{" "}
          <ScopedColumnToken context={context} column_id={params.target_column_id} kinds={SETTABLE_KINDS} scope="subitem" fallback="a subitem column" onPick={(id) => onPatch({ target_column_id: Number(id), value: undefined })} />{" "}
          <Words>of every subitem to </Words>
          <ValueToken context={context} params={params} onPatch={onPatch} />
        </>
      );
    case "set_parent_value":
      return (
        <>
          <Words>{lead} </Words>{renderSwitch("set")} <Words>the parent item&apos;s </Words>
          <ScopedColumnToken context={context} column_id={params.target_column_id} kinds={SETTABLE_KINDS} scope="item" fallback="column" onPick={(id) => onPatch({ target_column_id: Number(id), value: undefined })} />{" "}
          <Words>to </Words>
          <ValueToken context={context} params={params} onPatch={onPatch} />
        </>
      );
    case "add_checklist_items": {
      const tasks = (params.tasks ?? []).filter((task) => task.trim());
      return (
        <>
          <Words>{lead} </Words>{renderSwitch("add")}{" "}
          <Token label={tasks.length ? (tasks.length === 1 ? `"${tasks[0]}"` : `${tasks.length} tasks`) : "tasks"} is_placeholder={!tasks.length} aria_label="Checklist tasks" popover_width={320}>
            {(close) => <TasksEditor tasks={params.tasks ?? []} onApply={(next) => { onPatch({ tasks: next }); close(); }} />}
          </Token>{" "}
          <Words>to </Words>
          <ScopedColumnToken context={context} column_id={params.target_column_id} kinds={["checklist"]} scope="item" fallback="checklist" onPick={(id) => onPatch({ target_column_id: Number(id) })} />
        </>
      );
    }
    default:
      return null;
  }
}

/** Who "send an email" reaches: a person, the people of a People column, the address in an Email column, and typed addresses. */
export function EmailRecipientEditor({ params, context, has_trigger_item, onApply }: { params: BoardAutomationActionParams; context: AutomationBuilderContext; has_trigger_item: boolean; onApply: (patch: BoardAutomationActionParams) => void }) {
  const [mode, setMode] = useState<"person" | "column" | "email_column">(params.email_column_id && has_trigger_item ? "email_column" : params.notify_from_people_column_id && has_trigger_item ? "column" : "person");
  const [addresses, setAddresses] = useState((params.email_addresses ?? []).join(", "));
  const parsed = addresses.split(/[\s,;]+/).map((entry) => entry.trim()).filter(Boolean);
  const invalid = parsed.filter((entry) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry));
  const email_columns = context.columns.filter((column) => column.kind === "email");
  const [draft, setDraft] = useState<BoardAutomationActionParams>({
    notify_user_id: params.notify_user_id,
    notify_from_people_column_id: params.notify_from_people_column_id,
    email_column_id: params.email_column_id ?? null,
  });

  const options = [
    { id: "person" as const, label: "A person" },
    ...(has_trigger_item ? [{ id: "column" as const, label: "People column" }, { id: "email_column" as const, label: "Email column" }] : []),
  ];

  return (
    <>
      <div className="mb-2">
        <Segmented label="Who" options={options} value={mode} onChange={setMode} />
      </div>
      {mode === "person" && (
        <PersonPicker
          context={context}
          selected={draft.notify_user_id ? String(draft.notify_user_id) : "__none__"}
          extra_entries={[{ id: "__none__", label: "Nobody from the board" }]}
          onPick={(id) => setDraft((current) => ({ ...current, notify_user_id: id === "__none__" ? undefined : Number(id), notify_from_people_column_id: undefined }))}
        />
      )}
      {mode === "column" && (
        <ColumnPicker
          context={context}
          kinds={["people"]}
          selected={draft.notify_from_people_column_id ? String(draft.notify_from_people_column_id) : null}
          onPick={(id) => setDraft((current) => ({ ...current, notify_from_people_column_id: Number(id), notify_user_id: undefined }))}
          empty_text="Add a People column to this table first."
        />
      )}
      {mode === "email_column" &&
        (email_columns.length === 0 ? (
          <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">Add an Email column to this table first.</div>
        ) : (
          <PickerList
            sections={[{ entries: [{ id: "__none__", label: "No email column" }] }, { title: "Email columns", entries: email_columns.map((column) => ({ id: column.id, label: column.title })) }]}
            selected={draft.email_column_id ? String(draft.email_column_id) : "__none__"}
            onPick={(id) => setDraft((current) => ({ ...current, email_column_id: id === "__none__" ? null : Number(id) }))}
            placeholder="Search columns"
          />
        ))}
      <div className={`${POPOVER_LABEL} mt-2.5`}>Also send to these addresses</div>
      <input value={addresses} onChange={(event) => setAddresses(event.target.value)} placeholder="client@example.com, boss@example.com" aria-label="Email addresses" className={POPOVER_INPUT} />
      {invalid.length > 0 && <div className="mt-1.5 text-[11.5px] text-boardtree-danger">Check {invalid.join(", ")}.</div>}
      <div className="mt-1 text-[11.5px] text-boardtree-text-faint">Up to 10, separated by commas. People outside the account get the email too.</div>
      <PopoverFooter
        is_disabled={invalid.length > 0 || parsed.length > 10 || (!draft.notify_user_id && !draft.notify_from_people_column_id && !draft.email_column_id && parsed.length === 0)}
        onDone={() => onApply({ ...draft, email_addresses: parsed })}
      />
    </>
  );
}

