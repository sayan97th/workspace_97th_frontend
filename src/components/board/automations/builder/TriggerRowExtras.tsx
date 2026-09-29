"use client";
import React, { useState } from "react";
import type { BoardAutomationChangeMatch } from "@/types/board-automation";
import type { ColumnKind } from "../../table/types";
import { COMMON_FILE_EXTENSIONS, type AutomationBuilderContext, type AutomationColumn } from "./automationCatalog";
import { MiniAvatar, PopoverFooter, POPOVER_INPUT, POPOVER_LABEL, POPOVER_SECONDARY, type PickerEntry } from "./builderUi";
import { MultiPick } from "./valueEditors";

/**
 * The editors of the triggers that read a column by its type: what a "column changes" trigger
 * waits for, which files "file is uploaded" watches, and what "done" means for "item becomes overdue".
 */

type MatchOperator = { id: string; label: string; needs: "none" | "text" | "number" | "range" | "date" | "picks" };

const TEXT_KINDS: ColumnKind[] = ["text", "longtext", "email", "phone", "link"];
const NUMBER_KINDS: ColumnKind[] = ["number", "rating", "progress"];
const LIST_KINDS: ColumnKind[] = ["dropdown", "tags", "people", "vote"];

/** What a "column changes" trigger can wait for on a column of this kind, empty when only "any change" makes sense. */
export function matchOperatorsFor(kind: ColumnKind): MatchOperator[] {
  if (TEXT_KINDS.includes(kind)) {
    return [
      { id: "is", label: "Becomes exactly", needs: "text" },
      { id: "contains", label: "Contains", needs: "text" },
      { id: "not_contains", label: "Does not contain", needs: "text" },
      { id: "starts_with", label: "Starts with", needs: "text" },
      { id: "ends_with", label: "Ends with", needs: "text" },
      { id: "is_not_empty", label: "Gets any value", needs: "none" },
      { id: "is_empty", label: "Is cleared", needs: "none" },
    ];
  }
  if (NUMBER_KINDS.includes(kind)) {
    return [
      { id: "equals", label: "Becomes exactly", needs: "number" },
      { id: "greater_than", label: "Is more than", needs: "number" },
      { id: "less_than", label: "Is less than", needs: "number" },
      { id: "between", label: "Is between", needs: "range" },
      { id: "is_empty", label: "Is cleared", needs: "none" },
    ];
  }
  if (LIST_KINDS.includes(kind)) {
    return [
      { id: "added", label: "Gets one of these added", needs: "picks" },
      { id: "removed", label: "Loses one of these", needs: "picks" },
      { id: "holds", label: "Holds one of these", needs: "picks" },
      { id: "is_empty", label: "Is cleared", needs: "none" },
    ];
  }
  if (kind === "checkbox") return [{ id: "is_checked", label: "Is checked", needs: "none" }, { id: "is_unchecked", label: "Is unchecked", needs: "none" }];
  if (kind === "date") {
    return [
      { id: "is", label: "Becomes", needs: "date" },
      { id: "before", label: "Is before", needs: "date" },
      { id: "after", label: "Is after", needs: "date" },
      { id: "is_empty", label: "Is cleared", needs: "none" },
    ];
  }
  if (kind === "status" || kind === "label") return [{ id: "is", label: "Becomes one of", needs: "picks" }, { id: "is_not", label: "Becomes anything but", needs: "picks" }];
  return [];
}

/** The option or people entries a "picks" operator chooses from. */
function pickEntries(context: AutomationBuilderContext, column: AutomationColumn): PickerEntry<string>[] {
  if (column.kind === "people" || column.kind === "vote") {
    return context.people.map((person) => ({ id: person.id, label: person.name, leading: <MiniAvatar initials={person.initials} color={person.color} /> }));
  }
  return (column.options ?? []).map((option) => ({ id: option.id, label: option.label, color: option.color }));
}

/** What a "column changes" trigger waits for, per column type. `onApply(null)` goes back to any change. */
export function ChangeMatchEditor({ context, column, match, onApply }: { context: AutomationBuilderContext; column: AutomationColumn; match: BoardAutomationChangeMatch | null | undefined; onApply: (match: BoardAutomationChangeMatch | null) => void }) {
  const operators = matchOperatorsFor(column.kind);
  const [operator_id, setOperatorId] = useState(match?.operator && operators.some((operator) => operator.id === match.operator) ? match.operator : operators[0]?.id ?? "");
  const [value, setValue] = useState(match?.value ?? "");
  const [from, setFrom] = useState(match?.values?.[0] ?? "");
  const [to, setTo] = useState(match?.values?.[1] ?? "");
  const operator = operators.find((entry) => entry.id === operator_id);

  if (!operator) {
    return <div className="px-2 py-3 text-[12.5px] text-boardtree-text-muted">A {column.kind.replace("_", " ")} column has no single value to wait for, the trigger fires on any change.</div>;
  }

  const anyChange = match?.operator ? <button type="button" onClick={() => onApply(null)} className={POPOVER_SECONDARY}>Any change</button> : undefined;
  const can_apply =
    operator.needs === "none" || operator.needs === "picks"
      ? true
      : operator.needs === "range"
        ? from !== "" && to !== "" && Number.isFinite(Number(from)) && Number.isFinite(Number(to))
        : value.trim() !== "" && (operator.needs !== "number" || Number.isFinite(Number(value)));

  return (
    <>
      <div className={POPOVER_LABEL}>The new value</div>
      <select value={operator_id} onChange={(event) => setOperatorId(event.target.value)} aria-label="How the value changes" className={`${POPOVER_INPUT} mb-2`}>
        {operators.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
      </select>
      {operator.needs === "picks" ? (
        <>
          <div className="mb-1 text-[11.5px] text-boardtree-text-faint">{operator.id === "is" || operator.id === "is_not" ? "Pick at least one." : "Pick none to accept any."}</div>
          <MultiPick
            key={operator.id}
            entries={pickEntries(context, column)}
            initial={match?.operator === operator.id ? match.values ?? [] : []}
            allow_empty={operator.id !== "is" && operator.id !== "is_not"}
            placeholder="Search"
            onApply={(values) => onApply({ operator: operator.id, values })}
          />
          {anyChange && <div className="mt-1">{anyChange}</div>}
        </>
      ) : (
        <>
          {(operator.needs === "text" || operator.needs === "number" || operator.needs === "date") && (
            <input
              autoFocus
              type={operator.needs === "number" ? "number" : operator.needs === "date" ? "date" : "text"}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              aria-label="Value"
              placeholder={operator.needs === "text" ? "Type a value" : undefined}
              className={POPOVER_INPUT}
            />
          )}
          {operator.needs === "range" && (
            <div className="flex items-center gap-2">
              <input type="number" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From" className={`${POPOVER_INPUT} flex-1`} />
              <span className="text-[12.5px] text-boardtree-text-secondary">and</span>
              <input type="number" value={to} onChange={(event) => setTo(event.target.value)} aria-label="To" className={`${POPOVER_INPUT} flex-1`} />
            </div>
          )}
          {operator.needs === "text" && <div className="mt-1.5 text-[11.5px] text-boardtree-text-faint">Matched without case.</div>}
          <PopoverFooter
            is_disabled={!can_apply}
            extra={anyChange}
            onDone={() => onApply(operator.needs === "range" ? { operator: operator.id, values: [from, to] } : operator.needs === "none" ? { operator: operator.id } : { operator: operator.id, value: value.trim() })}
          />
        </>
      )}
    </>
  );
}

/** The file types "file is uploaded" watches, empty for any file. */
export function ExtensionsEditor({ extensions, onApply }: { extensions: string[]; onApply: (extensions: string[]) => void }) {
  const [picked, setPicked] = useState<string[]>(extensions);
  const [custom, setCustom] = useState("");
  const options = Array.from(new Set([...COMMON_FILE_EXTENSIONS, ...picked]));
  const toggle = (extension: string) => setPicked((current) => (current.includes(extension) ? current.filter((entry) => entry !== extension) : [...current, extension]));
  const addCustom = () => {
    const extension = custom.trim().replace(/^\./, "").toLowerCase();
    if (/^[a-z0-9]{1,11}$/.test(extension) && !picked.includes(extension)) setPicked((current) => [...current, extension]);
    setCustom("");
  };

  return (
    <>
      <div className={POPOVER_LABEL}>File types</div>
      <div role="group" aria-label="File types" className="flex flex-wrap gap-1">
        {options.map((extension) => (
          <button
            key={extension}
            type="button"
            aria-pressed={picked.includes(extension)}
            onClick={() => toggle(extension)}
            className={`h-7 rounded-[6px] border px-2 text-[12px] ${picked.includes(extension) ? "border-boardtree-accent bg-boardtree-accent-surface text-boardtree-accent" : "border-boardtree-border text-boardtree-text-secondary hover:bg-boardtree-hover"}`}
          >
            .{extension}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <input
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustom();
            }
          }}
          placeholder="Another type, e.g. psd"
          aria-label="Another file type"
          className={`${POPOVER_INPUT} flex-1`}
        />
        <button type="button" onClick={addCustom} className={POPOVER_SECONDARY}>Add</button>
      </div>
      <div className="mt-1.5 text-[11.5px] text-boardtree-text-faint">Pick none to fire on any file or link added.</div>
      <PopoverFooter onDone={() => onApply(picked.slice(0, 20))} extra={picked.length ? <button type="button" onClick={() => onApply([])} className={POPOVER_SECONDARY}>Any file</button> : undefined} />
    </>
  );
}

/** Most keywords one "update contains a keyword" trigger waits for, mirrors the API. */
const MAX_KEYWORDS = 20;

/** The words "update contains a keyword" waits for, one is enough, and whether replies count. */
export function KeywordsEditor({ keywords, include_replies, onApply }: { keywords: string[]; include_replies: boolean; onApply: (keywords: string[], include_replies: boolean) => void }) {
  const [words, setWords] = useState<string[]>(keywords.filter((keyword) => keyword.trim() !== ""));
  const [draft, setDraft] = useState("");
  const [replies, setReplies] = useState(include_replies);

  const add = () => {
    const entries = draft.split(",").map((entry) => entry.trim()).filter((entry) => entry !== "" && entry.length <= 60);
    setWords((current) => Array.from(new Set([...current, ...entries])).slice(0, MAX_KEYWORDS));
    setDraft("");
  };

  return (
    <>
      <div className={POPOVER_LABEL}>Words to look for</div>
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={draft}
          maxLength={200}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder="urgent, blocked"
          aria-label="Keyword"
          className={`${POPOVER_INPUT} flex-1`}
        />
        <button type="button" onClick={add} className={POPOVER_SECONDARY}>Add</button>
      </div>
      {words.length > 0 && (
        <div role="list" aria-label="Keywords" className="mt-2 flex flex-wrap gap-1">
          {words.map((word) => (
            <span key={word} role="listitem" className="flex h-7 items-center gap-1 rounded-full border border-boardtree-border px-2 text-[12px] text-boardtree-text">
              {word}
              <button type="button" onClick={() => setWords((current) => current.filter((entry) => entry !== word))} aria-label={`Remove ${word}`} className="text-boardtree-text-faint hover:text-boardtree-danger">
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="mt-1.5 text-[11.5px] text-boardtree-text-faint">Matched without case anywhere in the text, one word is enough.</div>
      <label className="mt-2.5 flex items-center gap-2 text-[12.5px] text-boardtree-text-secondary">
        <input type="checkbox" checked={replies} onChange={(event) => setReplies(event.target.checked)} className="accent-boardtree-accent" />
        Replies count too
      </label>
      <PopoverFooter is_disabled={words.length === 0 && draft.trim() === ""} onDone={() => {
        const pending = draft.split(",").map((entry) => entry.trim()).filter((entry) => entry !== "" && entry.length <= 60);
        onApply(Array.from(new Set([...words, ...pending])).slice(0, MAX_KEYWORDS), replies);
      }} />
    </>
  );
}

/** The status column and labels that mean an item is done, for "item becomes overdue". */
export function DoneStatusEditor({ context, status_column_id, done_values, onApply }: { context: AutomationBuilderContext; status_column_id: number | null | undefined; done_values: string[]; onApply: (status_column_id: number | null, done_values: string[]) => void }) {
  const status_columns = context.columns.filter((column) => column.scope === "item" && (column.kind === "status" || column.kind === "label"));
  const [column_id, setColumnId] = useState(status_column_id != null ? String(status_column_id) : status_columns[0]?.id ?? "");
  const column = status_columns.find((entry) => entry.id === column_id);

  return (
    <>
      <div className="mb-2 text-[12px] leading-snug text-boardtree-text-secondary">An item is overdue once its date has passed. Choose what done means, so finished items are left alone.</div>
      {status_columns.length === 0 ? (
        <div className="px-2 py-2 text-[12.5px] text-boardtree-text-faint">Add a Status column to tell done items apart. Until then every item with a passed date counts.</div>
      ) : (
        <>
          <div className={POPOVER_LABEL}>Status column</div>
          <select value={column_id} onChange={(event) => setColumnId(event.target.value)} aria-label="Status column" className={`${POPOVER_INPUT} mb-2`}>
            {status_columns.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
          </select>
          <div className={POPOVER_LABEL}>Labels that mean done</div>
          <MultiPick
            key={column_id}
            entries={(column?.options ?? []).map((option) => ({ id: option.id, label: option.label, color: option.color }))}
            initial={String(status_column_id ?? "") === column_id ? done_values : []}
            placeholder="Search labels"
            onApply={(values) => onApply(Number(column_id), values)}
          />
        </>
      )}
      {status_column_id != null && (
        <button type="button" onClick={() => onApply(null, [])} className={`${POPOVER_SECONDARY} mt-1`}>
          Any item with a passed date
        </button>
      )}
    </>
  );
}

/** The first status column and its label that reads as done, what a new overdue trigger starts with. */
export function defaultDoneStatus(context: AutomationBuilderContext): { status_column_id: number; done_values: string[] } | null {
  const status = context.columns.find((column) => column.scope === "item" && column.kind === "status");
  const done = status?.options?.find((option) => /done|complete|finished/i.test(option.label));
  return status && done ? { status_column_id: Number(status.id), done_values: [done.id] } : null;
}
