"use client";
import React, { useRef, useState } from "react";
import type { BoardAutomationCondition } from "@/types/board-automation";
import { BOARD_FILTER_DATE_PRESETS, BOARD_FILTER_OPERATORS, getDefaultOperator, isValuelessOperator } from "../../toolbar/filterEngine";
import type { BoardFilterFieldKind, BoardFilterOperator } from "../../toolbar/types";
import type { ColumnKind } from "../../table/types";
import { CONDITION_KIND_BY_COLUMN, MESSAGE_TOKENS, VIRTUAL_CONDITION_FIELDS, type AutomationBuilderContext, type AutomationColumn } from "./automationCatalog";
import { MiniAvatar, PickerList, PopoverFooter, POPOVER_INPUT, POPOVER_LABEL, type PickerEntry } from "./builderUi";

/**
 * The editors inside the builder's token popovers. What a value editor offers depends on the
 * column's kind, so a Status column shows its labels, a People column its people, a Date column
 * a date field and so on, and it writes the value the same way that column's cells store it.
 */

// ── Pickers ───────────────────────────────────────────────────────────────────

export function ColumnPicker({ context, kinds, scopes = ["item"], selected, onPick, empty_text }: {
  context: AutomationBuilderContext;
  kinds: ColumnKind[];
  scopes?: ("item" | "subitem")[];
  selected: string | null;
  onPick: (column_id: string) => void;
  empty_text?: string;
}) {
  const sections = scopes.map((scope) => ({
    title: scopes.length > 1 ? (scope === "item" ? "Item columns" : "Subitem columns") : undefined,
    entries: context.columns
      .filter((column) => column.scope === scope && kinds.includes(column.kind))
      .map((column): PickerEntry<string> => ({ id: column.id, label: column.title, hint: column.kind === "longtext" ? "long text" : column.kind.replace("_", " ") })),
  }));
  const has_any = sections.some((section) => section.entries.length > 0);

  if (!has_any) return <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">{empty_text ?? "This table has no column of the right kind yet."}</div>;
  return <PickerList sections={sections} selected={selected} onPick={onPick} placeholder="Search columns" />;
}

export function PersonPicker({ context, selected, onPick, extra_entries = [] }: {
  context: AutomationBuilderContext;
  selected: string | string[] | null;
  onPick: (person_id: string) => void;
  /** Options listed before the people, such as "Anyone". */
  extra_entries?: PickerEntry<string>[];
}) {
  const people = context.people.map((person): PickerEntry<string> => ({ id: person.id, label: person.name, leading: <MiniAvatar initials={person.initials} color={person.color} /> }));
  return <PickerList sections={[...(extra_entries.length ? [{ entries: extra_entries }] : []), { title: extra_entries.length ? "People" : undefined, entries: people }]} selected={selected} onPick={onPick} placeholder="Search people" />;
}

export function GroupPicker({ groups, selected, onPick, extra_entries = [] }: {
  groups: { id: string; label: string; color?: string }[];
  selected: string | null;
  onPick: (group_id: string) => void;
  extra_entries?: PickerEntry<string>[];
}) {
  return (
    <PickerList
      sections={[...(extra_entries.length ? [{ entries: extra_entries }] : []), { entries: groups.map((group) => ({ id: group.id, label: group.label, color: group.color })) }]}
      selected={selected}
      onPick={onPick}
      placeholder="Search groups"
    />
  );
}

// ── Column values ─────────────────────────────────────────────────────────────

const toIdList = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : value == null || value === "" ? [] : [String(value)]);

/** Toggles ids in a list and applies them with Done, for the multi value kinds. */
function MultiPick({ entries, initial, onApply, placeholder }: { entries: PickerEntry<string>[]; initial: string[]; onApply: (ids: string[]) => void; placeholder: string }) {
  const [ids, setIds] = useState<string[]>(initial);
  return (
    <>
      <PickerList sections={[{ entries }]} selected={ids} placeholder={placeholder} onPick={(id) => setIds((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]))} />
      <PopoverFooter onDone={() => onApply(ids)} is_disabled={ids.length === 0} />
    </>
  );
}

/** A single input applied with Done or Enter, for text, number and date values. */
function SingleInput({ type, initial, onApply, placeholder, label }: { type: "text" | "number" | "date"; initial: string; onApply: (value: string) => void; placeholder: string; label: string }) {
  const [draft, setDraft] = useState(initial);
  const can_apply = draft.trim() !== "" && (type !== "number" || Number.isFinite(Number(draft)));
  return (
    <>
      <div className={POPOVER_LABEL}>{label}</div>
      <input
        autoFocus
        type={type}
        value={draft}
        placeholder={placeholder}
        aria-label={label}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && can_apply) {
            event.preventDefault();
            onApply(draft);
          }
        }}
        className={POPOVER_INPUT}
      />
      <PopoverFooter onDone={() => onApply(draft)} is_disabled={!can_apply} />
    </>
  );
}

export type ColumnValueEditorProps = {
  context: AutomationBuilderContext;
  column: AutomationColumn;
  value: unknown;
  /** `set`: the value an action writes, multi value kinds take several. `match`: the one value a trigger waits for. */
  mode: "set" | "match";
  onApply: (value: unknown) => void;
};

/** Picks a value for one column, in the shape that column's cells store it. */
export function ColumnValueEditor({ context, column, value, mode, onApply }: ColumnValueEditorProps) {
  const option_entries = (column.options ?? []).map((option): PickerEntry<string> => ({ id: option.id, label: option.label, color: option.color }));
  const people_entries = context.people.map((person): PickerEntry<string> => ({ id: person.id, label: person.name, leading: <MiniAvatar initials={person.initials} color={person.color} /> }));

  switch (column.kind) {
    case "status":
    case "label":
      return <PickerList sections={[{ entries: option_entries }]} selected={value == null ? null : String(value)} onPick={onApply} placeholder="Search labels" />;
    case "dropdown":
    case "tags":
      return mode === "match"
        ? <PickerList sections={[{ entries: option_entries }]} selected={toIdList(value)} onPick={(id) => onApply([id])} placeholder="Search options" />
        : <MultiPick entries={option_entries} initial={toIdList(value)} onApply={onApply} placeholder="Search options" />;
    case "people":
      return mode === "match"
        ? <PickerList sections={[{ entries: people_entries }]} selected={toIdList(value)} onPick={(id) => onApply([id])} placeholder="Search people" />
        : <MultiPick entries={people_entries} initial={toIdList(value)} onApply={onApply} placeholder="Search people" />;
    case "checkbox":
      return (
        <PickerList
          is_searchable={false}
          sections={[{ entries: [{ id: "checked", label: "Checked" }, { id: "unchecked", label: "Unchecked" }] }]}
          selected={value === true ? "checked" : value === false ? "unchecked" : null}
          onPick={(id) => onApply(id === "checked")}
        />
      );
    case "date":
      return <SingleInput type="date" initial={typeof value === "string" ? value.slice(0, 10) : ""} onApply={onApply} placeholder="YYYY-MM-DD" label="Date" />;
    case "number":
    case "rating":
    case "progress":
      return <SingleInput type="number" initial={value == null ? "" : String(value)} onApply={(text) => onApply(Number(text))} placeholder="0" label="Number" />;
    default:
      return <SingleInput type="text" initial={value == null ? "" : String(value)} onApply={onApply} placeholder="Type a value" label="Value" />;
  }
}

// ── Messages ──────────────────────────────────────────────────────────────────

/** A message template with clickable tokens, and an email subject when asked for. */
export function MessageEditor({ message, subject, with_subject = false, is_required = false, onApply }: {
  message: string;
  subject?: string;
  with_subject?: boolean;
  is_required?: boolean;
  onApply: (message: string, subject: string) => void;
}) {
  const [draft, setDraft] = useState(message);
  const [subject_draft, setSubjectDraft] = useState(subject ?? "");
  const textarea_ref = useRef<HTMLTextAreaElement | null>(null);

  const insertToken = (token: string) => {
    const element = textarea_ref.current;
    const start = element?.selectionStart ?? draft.length;
    const end = element?.selectionEnd ?? draft.length;
    setDraft(`${draft.slice(0, start)}${token}${draft.slice(end)}`);
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <>
      {with_subject && (
        <>
          <div className={POPOVER_LABEL}>Subject</div>
          <input value={subject_draft} maxLength={150} onChange={(event) => setSubjectDraft(event.target.value)} placeholder='Update on "{item_name}"' aria-label="Email subject" className={`${POPOVER_INPUT} mb-2`} />
        </>
      )}
      <div className={POPOVER_LABEL}>Message</div>
      <textarea
        ref={textarea_ref}
        autoFocus
        rows={4}
        maxLength={is_required ? 2000 : 1000}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={is_required ? "Write the update" : "Leave empty to use the default message"}
        aria-label="Message"
        className="w-full resize-none rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2.5 py-2 text-[13px] text-boardtree-text outline-none placeholder:text-boardtree-text-faint focus:border-boardtree-accent"
      />
      <div className="mt-1.5 flex flex-wrap gap-1">
        {MESSAGE_TOKENS.map((item) => (
          <button key={item.token} type="button" onClick={() => insertToken(item.token)} title={item.token} className="rounded-full border border-boardtree-border px-2 py-0.5 text-[11.5px] text-boardtree-text-secondary hover:border-boardtree-accent hover:text-boardtree-accent">
            {item.label}
          </button>
        ))}
      </div>
      <PopoverFooter onDone={() => onApply(draft, subject_draft)} is_disabled={is_required && draft.trim() === ""} />
    </>
  );
}

// ── Conditions ────────────────────────────────────────────────────────────────

/** The filter family of a condition field, a column or one of the item details. */
export function conditionKind(context: AutomationBuilderContext, field_id: string): BoardFilterFieldKind | null {
  const virtual = VIRTUAL_CONDITION_FIELDS.find((field) => field.id === field_id);
  if (virtual) return virtual.kind;
  const column = context.columns.find((entry) => entry.id === field_id);
  return column ? CONDITION_KIND_BY_COLUMN[column.kind] ?? null : null;
}

export function ConditionFieldPicker({ context, scope, selected, onPick }: { context: AutomationBuilderContext; scope: "item" | "subitem"; selected: string; onPick: (field_id: string) => void }) {
  const columns = context.columns
    .filter((column) => column.scope === scope && CONDITION_KIND_BY_COLUMN[column.kind])
    .map((column): PickerEntry<string> => ({ id: column.id, label: column.title }));
  const details = VIRTUAL_CONDITION_FIELDS.filter((field) => scope === "item" || field.id === "name").map((field): PickerEntry<string> => ({ id: field.id, label: field.label }));
  return <PickerList sections={[{ title: "Columns", entries: columns }, { title: "Item details", entries: details }]} selected={selected || null} onPick={onPick} placeholder="Search columns" />;
}

export function ConditionOperatorPicker({ kind, selected, onPick }: { kind: BoardFilterFieldKind; selected: string; onPick: (operator: BoardFilterOperator) => void }) {
  return (
    <PickerList
      is_searchable={false}
      sections={[{ entries: BOARD_FILTER_OPERATORS[kind].map((operator) => ({ id: operator.id, label: operator.label })) }]}
      selected={(selected || null) as BoardFilterOperator | null}
      onPick={onPick}
    />
  );
}

/** The value side of a condition, shaped like the board's Advanced filter values. */
export function ConditionValueEditor({ context, condition, kind, onApply }: {
  context: AutomationBuilderContext;
  condition: BoardAutomationCondition;
  kind: BoardFilterFieldKind;
  onApply: (next: Pick<BoardAutomationCondition, "value" | "values">) => void;
}) {
  const column = context.columns.find((entry) => entry.id === condition.column_id);
  const [from, setFrom] = useState(condition.values[0] ?? "");
  const [to, setTo] = useState(condition.values[1] ?? "");

  if (kind === "option" || kind === "people" || kind === "group") {
    const entries: PickerEntry<string>[] =
      kind === "group"
        ? context.groups.map((group) => ({ id: group.id, label: group.label }))
        : kind === "people"
          ? context.people.map((person) => ({ id: person.id, label: person.name, leading: <MiniAvatar initials={person.initials} color={person.color} /> }))
          : (column?.options ?? []).map((option) => ({ id: option.id, label: option.label, color: option.color }));
    return <MultiPick entries={entries} initial={condition.values} onApply={(values) => onApply({ value: "", values })} placeholder="Search" />;
  }

  if (condition.condition === "between") {
    const input_type = kind === "date" ? "date" : "number";
    return (
      <>
        <div className={POPOVER_LABEL}>From</div>
        <input type={input_type} value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From" className={`${POPOVER_INPUT} mb-2`} />
        <div className={POPOVER_LABEL}>To</div>
        <input type={input_type} value={to} onChange={(event) => setTo(event.target.value)} aria-label="To" className={POPOVER_INPUT} />
        <PopoverFooter onDone={() => onApply({ value: "", values: [from, to] })} is_disabled={!from || !to} />
      </>
    );
  }

  if (kind === "date") {
    return (
      <>
        <PickerList
          is_searchable={false}
          max_height={200}
          sections={[{ title: "Relative dates", entries: BOARD_FILTER_DATE_PRESETS.map((preset) => ({ id: preset.id, label: preset.label })) }]}
          selected={condition.value || null}
          onPick={(id) => onApply({ value: id, values: [] })}
        />
        <div className="mt-2 border-t border-boardtree-border-soft pt-2">
          <SingleInput type="date" initial={/^\d{4}-\d{2}-\d{2}$/.test(condition.value) ? condition.value : ""} onApply={(value) => onApply({ value, values: [] })} placeholder="YYYY-MM-DD" label="Exact date" />
        </div>
      </>
    );
  }

  return (
    <SingleInput
      type={kind === "number" ? "number" : "text"}
      initial={condition.value}
      onApply={(value) => onApply({ value, values: [] })}
      placeholder={kind === "number" ? "0" : "Type a value"}
      label="Value"
    />
  );
}

/** The operator a condition starts with once its field is picked. */
export const defaultConditionOperator = (kind: BoardFilterFieldKind): BoardFilterOperator => getDefaultOperator(kind);

export const conditionNeedsValue = (operator: string): boolean => operator !== "" && !isValuelessOperator(operator as BoardFilterOperator);
