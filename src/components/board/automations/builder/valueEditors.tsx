"use client";
import React, { useRef, useState } from "react";
import type { BoardAutomationCondition } from "@/types/board-automation";
import { BOARD_FILTER_DATE_PRESETS, BOARD_FILTER_OPERATORS, getDefaultOperator, isValuelessOperator } from "../../toolbar/filterEngine";
import type { BoardFilterFieldKind, BoardFilterOperator } from "../../toolbar/types";
import type { ColumnKind } from "../../table/types";
import { ANY_CHANGE_ONLY_KINDS, CONDITION_KIND_BY_COLUMN, MESSAGE_TOKENS, PAYLOAD_TOKEN_HINT, VIRTUAL_CONDITION_FIELDS, type AutomationBuilderContext, type AutomationColumn } from "./automationCatalog";
import { columnTokensFromDisplay, columnTokensToDisplay } from "./automationSentence";
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_PATTERN = /^https?:\/\/\S+$/i;

/** Start and end dates, for a timeline. */
function TimelineInput({ value, onApply }: { value: unknown; onApply: (value: { start: string; end: string }) => void }) {
  const range = (value && typeof value === "object" ? value : {}) as { start?: string; end?: string };
  const [start, setStart] = useState(range.start ?? "");
  const [end, setEnd] = useState(range.end ?? "");
  const is_valid = start !== "" && end !== "" && start <= end;
  return (
    <>
      <div className={POPOVER_LABEL}>Starts</div>
      <input type="date" value={start} onChange={(event) => setStart(event.target.value)} aria-label="Start date" className={`${POPOVER_INPUT} mb-2`} />
      <div className={POPOVER_LABEL}>Ends</div>
      <input type="date" value={end} min={start || undefined} onChange={(event) => setEnd(event.target.value)} aria-label="End date" className={POPOVER_INPUT} />
      {start !== "" && end !== "" && start > end && <div className="mt-1.5 text-[11.5px] text-boardtree-danger">The end must come after the start.</div>}
      <PopoverFooter onDone={() => onApply({ start, end })} is_disabled={!is_valid} />
    </>
  );
}

/** Five clickable stars, like the Rating cell. */
function RatingInput({ value, onApply }: { value: unknown; onApply: (value: number) => void }) {
  const current = Number(value) || 0;
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? current;
  return (
    <div className="flex items-center gap-1 px-1 py-1.5" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map((stars) => (
        <button
          key={stars}
          type="button"
          role="radio"
          aria-checked={current === stars}
          aria-label={`${stars} ${stars === 1 ? "star" : "stars"}`}
          onMouseEnter={() => setHovered(stars)}
          onClick={() => onApply(stars)}
          className={`text-[22px] leading-none transition-colors ${stars <= shown ? "text-[#fdab3d]" : "text-boardtree-border"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/** A 0 to 100 slider with its number, like the Progress cell. */
function ProgressInput({ value, onApply }: { value: unknown; onApply: (value: number) => void }) {
  const [draft, setDraft] = useState(Math.max(0, Math.min(100, Number(value) || 0)));
  return (
    <>
      <div className={POPOVER_LABEL}>Progress</div>
      <div className="flex items-center gap-2">
        <input type="range" min={0} max={100} step={5} value={draft} onChange={(event) => setDraft(Number(event.target.value))} aria-label="Progress" className="flex-1 accent-boardtree-accent" />
        <input type="number" min={0} max={100} value={draft} onChange={(event) => setDraft(Math.max(0, Math.min(100, Number(event.target.value) || 0)))} aria-label="Progress percent" className={`${POPOVER_INPUT} w-16`} />
        <span className="text-[12.5px] text-boardtree-text-secondary">%</span>
      </div>
      <PopoverFooter onDone={() => onApply(draft)} />
    </>
  );
}

/** A URL and the text it shows, like the Link cell. */
function LinkInput({ value, onApply }: { value: unknown; onApply: (value: { url: string; text: string }) => void }) {
  const link = (value && typeof value === "object" ? value : {}) as { url?: string; text?: string };
  const [url, setUrl] = useState(link.url ?? "");
  const [text, setText] = useState(link.text ?? "");
  const is_valid = URL_PATTERN.test(url.trim());
  return (
    <>
      <div className={POPOVER_LABEL}>Web address</div>
      <input autoFocus type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" aria-label="Web address" className={`${POPOVER_INPUT} mb-2`} />
      <div className={POPOVER_LABEL}>Text to display</div>
      <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Optional" aria-label="Text to display" className={POPOVER_INPUT} />
      {url.trim() !== "" && !is_valid && <div className="mt-1.5 text-[11.5px] text-boardtree-danger">Start the address with http:// or https://.</div>}
      <PopoverFooter onDone={() => onApply({ url: url.trim(), text: text.trim() })} is_disabled={!is_valid} />
    </>
  );
}

/** A text value checked against a pattern, for Email and Phone. */
function PatternInput({ kind, initial, onApply }: { kind: "email" | "phone"; initial: string; onApply: (value: string) => void }) {
  const [draft, setDraft] = useState(initial);
  const text = draft.trim();
  const is_valid = kind === "email" ? EMAIL_PATTERN.test(text) : /^[+\d][\d\s().-]{3,}$/.test(text);
  return (
    <>
      <div className={POPOVER_LABEL}>{kind === "email" ? "Email address" : "Phone number"}</div>
      <input
        autoFocus
        type={kind === "email" ? "email" : "tel"}
        value={draft}
        placeholder={kind === "email" ? "name@company.com" : "+1 555 010 0000"}
        aria-label={kind === "email" ? "Email address" : "Phone number"}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && is_valid) {
            event.preventDefault();
            onApply(text);
          }
        }}
        className={POPOVER_INPUT}
      />
      {text !== "" && !is_valid && <div className="mt-1.5 text-[11.5px] text-boardtree-danger">{kind === "email" ? "Enter a valid email address." : "Enter a valid phone number."}</div>}
      <PopoverFooter onDone={() => onApply(text)} is_disabled={!is_valid} />
    </>
  );
}

/** A multi line text, for Long text, and one task per line for a Checklist. */
function LinesInput({ label, initial, placeholder, onApply }: { label: string; initial: string; placeholder: string; onApply: (value: string) => void }) {
  const [draft, setDraft] = useState(initial);
  return (
    <>
      <div className={POPOVER_LABEL}>{label}</div>
      <textarea
        autoFocus
        rows={5}
        value={draft}
        placeholder={placeholder}
        aria-label={label}
        onChange={(event) => setDraft(event.target.value)}
        className="w-full resize-none rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2.5 py-2 text-[13px] text-boardtree-text outline-none placeholder:text-boardtree-text-faint focus:border-boardtree-accent"
      />
      <PopoverFooter onDone={() => onApply(draft)} is_disabled={draft.trim() === ""} />
    </>
  );
}

/** Shown in a trigger for kinds that have no single value to wait for. */
function AnyChangeNote({ column }: { column: AutomationColumn }) {
  return <div className="px-2 py-3 text-[12.5px] text-boardtree-text-muted">A {column.kind.replace("_", " ")} column has no single value to wait for, the trigger fires on any change.</div>;
}

/** Picks a value for one column, in the shape that column's cells store it. */
export function ColumnValueEditor({ context, column, value, mode, onApply }: ColumnValueEditorProps) {
  const option_entries = (column.options ?? []).map((option): PickerEntry<string> => ({ id: option.id, label: option.label, color: option.color }));
  const people_entries = context.people.map((person): PickerEntry<string> => ({ id: person.id, label: person.name, leading: <MiniAvatar initials={person.initials} color={person.color} /> }));

  if (mode === "match" && ANY_CHANGE_ONLY_KINDS.includes(column.kind)) return <AnyChangeNote column={column} />;

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
    case "vote":
      return mode === "match"
        ? <PickerList sections={[{ entries: people_entries }]} selected={toIdList(value)} onPick={(id) => onApply([id])} placeholder="Search people" />
        : <MultiPick entries={people_entries} initial={toIdList(value)} onApply={onApply} placeholder="Search people" />;
    case "timeline":
      return <TimelineInput value={value} onApply={onApply} />;
    case "rating":
      return <RatingInput value={value} onApply={onApply} />;
    case "progress":
      return <ProgressInput value={value} onApply={onApply} />;
    case "link":
      return mode === "match"
        ? <SingleInput type="text" initial={typeof value === "string" ? value : ""} onApply={onApply} placeholder="Address or text" label="Link address or text" />
        : <LinkInput value={value} onApply={onApply} />;
    case "email":
    case "phone":
      return <PatternInput kind={column.kind} initial={typeof value === "string" ? value : ""} onApply={onApply} />;
    case "longtext":
      return mode === "match"
        ? <SingleInput type="text" initial={value == null ? "" : String(value)} onApply={onApply} placeholder="Type a value" label="Value" />
        : <LinesInput label="Text" initial={value == null ? "" : String(value)} placeholder="Write the text" onApply={onApply} />;
    case "checklist":
      return (
        <LinesInput
          label="One task per line"
          initial={Array.isArray(value) ? value.map((task) => (task as { text?: string }).text ?? "").join("\n") : ""}
          placeholder={"Review\nApprove\nPublish"}
          onApply={(text) => onApply(text.split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 50).map((line, index) => ({ id: `task_${Date.now().toString(36)}_${index}`, text: line, is_done: false })))}
        />
      );
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
      return <SingleInput type="number" initial={value == null ? "" : String(value)} onApply={(text) => onApply(Number(text))} placeholder="0" label="Number" />;
    default:
      return <SingleInput type="text" initial={value == null ? "" : String(value)} onApply={onApply} placeholder="Type a value" label="Value" />;
  }
}

// ── Messages ──────────────────────────────────────────────────────────────────

/** What each built-in token reads as in the preview. */
const TOKEN_PREVIEWS: Record<string, string> = {
  "{item_name}": "Website redesign",
  "{board_name}": "Marketing",
  "{actor_name}": "Ada Lovelace",
  "{column_name}": "Status",
  "{new_value}": "Done",
  "{old_value}": "Working on it",
  "{update_text}": "Looks good to me",
  "{automation_name}": "My automation",
};

/** The message with its tokens replaced by sample values, so the user sees roughly what people will read. */
function previewMessage(template: string, context: AutomationBuilderContext | undefined): string {
  const today = new Date();
  const samples: Record<string, string> = {
    ...TOKEN_PREVIEWS,
    "{date}": today.toISOString().slice(0, 10),
    "{week}": "42",
    "{month}": today.toLocaleString("en-US", { month: "long", year: "numeric" }),
  };
  return template
    .replace(/\{#([^{}]+)\}/g, (match, title: string) => {
      const column = context?.columns.find((entry) => entry.title.trim().toLowerCase() === title.trim().toLowerCase());
      return column ? `[${column.title}]` : match;
    })
    .replace(/\{payload\.([^{}]+)\}/g, (_match, path: string) => `[${path}]`)
    .replace(/\{[a-z_]+\}/g, (match) => samples[match] ?? match);
}

/**
 * A message template with clickable tokens, and an email subject when asked for. Any column of
 * the table can be inserted: it shows as `{#Status}` while editing and is saved as `{column:12}`,
 * so renaming the column never breaks the message.
 */
export function MessageEditor({ context, message, subject, with_subject = false, is_required = false, with_payload = false, onApply }: {
  context?: AutomationBuilderContext;
  message: string;
  subject?: string;
  with_subject?: boolean;
  is_required?: boolean;
  /** A webhook trigger: offers `{payload.field}` for the values of the JSON it receives. */
  with_payload?: boolean;
  onApply: (message: string, subject: string) => void;
}) {
  const toDisplay = (text: string) => (context ? columnTokensToDisplay(text, context) : text);
  const fromDisplay = (text: string) => (context ? columnTokensFromDisplay(text, context) : text);
  const [draft, setDraft] = useState(toDisplay(message));
  const [subject_draft, setSubjectDraft] = useState(toDisplay(subject ?? ""));
  const [is_column_list_open, setIsColumnListOpen] = useState(false);
  const textarea_ref = useRef<HTMLTextAreaElement | null>(null);
  const token_columns = (context?.columns ?? []).filter((column) => column.kind !== "button" && column.kind !== "formula");
  const preview = draft.trim() ? previewMessage(draft, context) : "";

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
        {with_payload && (
          <button type="button" onClick={() => insertToken("{payload.}")} title={PAYLOAD_TOKEN_HINT} className="rounded-full border border-dashed border-boardtree-border px-2 py-0.5 text-[11.5px] text-boardtree-text-secondary hover:border-boardtree-accent hover:text-boardtree-accent">
            Webhook field
          </button>
        )}
        {token_columns.length > 0 && (
          <button
            type="button"
            onClick={() => setIsColumnListOpen((open) => !open)}
            aria-expanded={is_column_list_open}
            className="rounded-full border border-dashed border-boardtree-accent/60 px-2 py-0.5 text-[11.5px] text-boardtree-accent hover:bg-boardtree-accent-surface"
          >
            + Column value
          </button>
        )}
      </div>
      {is_column_list_open && (
        <div className="mt-1.5 rounded-[6px] border border-boardtree-border-soft p-1">
          <PickerList
            sections={[{ entries: token_columns.map((column) => ({ id: column.id, label: column.scope === "subitem" ? `subitem ${column.title}` : column.title, hint: column.kind.replace("_", " ") })) }]}
            selected={null}
            max_height={150}
            placeholder="Search columns"
            onPick={(id) => {
              const column = token_columns.find((entry) => entry.id === id);
              if (column) insertToken(`{#${column.title}}`);
              setIsColumnListOpen(false);
            }}
          />
        </div>
      )}
      {with_payload && <div className="mt-1.5 text-[11.5px] text-boardtree-text-faint">Type the field after <code>payload.</code>, for example {"{payload.email}"} or {"{payload.contact.name}"}.</div>}
      {preview && (
        <div className="mt-2 rounded-[6px] bg-boardtree-panel-alt px-2.5 py-2">
          <div className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-boardtree-text-faint">Preview</div>
          <div className="whitespace-pre-wrap break-words text-[12.5px] text-boardtree-text-secondary">{preview}</div>
        </div>
      )}
      <PopoverFooter onDone={() => onApply(fromDisplay(draft), fromDisplay(subject_draft))} is_disabled={is_required && draft.trim() === ""} />
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
