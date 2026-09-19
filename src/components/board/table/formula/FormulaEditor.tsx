"use client";

import { useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type Ref } from "react";
import type { FormulaSourceColumn } from "../types";
import { referenceTextFor, type FormulaIssue } from "./formulaEngine";
import { FORMULA_FUNCTIONS, type FormulaFunction } from "./formulaFunctions";
import { tokenizeFormula, type FormulaToken } from "./formulaParser";

export interface FormulaEditorHandle {
  focus: () => void;
  /** Inserts a function call at the caret, wrapping the current selection as its first argument. */
  insertFunction: (name: string) => void;
  /** Inserts a column reference at the caret, replacing the current selection. */
  insertColumn: (source: FormulaSourceColumn) => void;
}

interface FormulaEditorProps {
  /** The expression as the user sees it, columns written as `{Title}`. */
  value: string;
  onChange: (next: string) => void;
  sources: FormulaSourceColumn[];
  /** Ranges to underline, from `validateFormula`. */
  issues: FormulaIssue[];
  /** Fired by Ctrl/Cmd + Enter. */
  onSubmit?: () => void;
  ref?: Ref<FormulaEditorHandle>;
}

type Suggestion =
  | { kind: "function"; label: string; detail: string; insert: FormulaFunction }
  | { kind: "column"; label: string; detail: string; insert: FormulaSourceColumn };

interface SuggestionState {
  items: Suggestion[];
  index: number;
  /** The source range the accepted suggestion replaces. */
  from: number;
  to: number;
}

const MAX_SUGGESTIONS = 8;

// Every layer of the editor shares this box model, so the transparent textarea
// sits exactly over the highlighted text.
const TEXT_LAYER = "whitespace-pre-wrap break-words px-3 py-2.5 font-mono text-[13px] leading-[20px]";

/** The class a token is painted with. `is_call` marks a name that opens a function call. */
function tokenClass(token: FormulaToken, is_call: boolean): string {
  switch (token.type) {
    case "number":
      return "text-[#c2410c] dark:text-[#fdba74]";
    case "string":
      return "text-[#15803d] dark:text-[#86efac]";
    case "column":
      return "rounded-[3px] bg-boardtree-accent-surface text-boardtree-accent";
    case "name":
      return is_call || /^(true|false)$/i.test(token.text) ? "text-[#9d50dd] dark:text-[#d8b4fe]" : "text-boardtree-danger";
    case "invalid":
      return "text-boardtree-danger";
    default:
      return "text-boardtree-text-muted";
  }
}

/** Finds what the user is typing at `caret`: a column name after an open brace, or the start of a function name. */
function suggestionsAt(text: string, caret: number, sources: FormulaSourceColumn[]): SuggestionState | null {
  const before = text.slice(0, caret);
  const tokens = tokenizeFormula(before);
  const last = tokens[tokens.length - 1];
  if (!last || last.end !== before.length) return null;

  if (last.type === "invalid" && last.text.startsWith("{")) {
    const typed = last.text.slice(1).toLowerCase();
    const items: Suggestion[] = sources
      .filter((source) => source.title.toLowerCase().includes(typed))
      .slice(0, MAX_SUGGESTIONS)
      .map((source) => ({ kind: "column", label: source.title, detail: source.kind.replace("_", " "), insert: source }));
    return items.length ? { items, index: 0, from: last.start, to: caret + (text[caret] === "}" ? 1 : 0) } : null;
  }

  if (last.type === "name") {
    const typed = last.text.toUpperCase();
    const items: Suggestion[] = FORMULA_FUNCTIONS.filter((fn) => fn.name.startsWith(typed))
      .slice(0, MAX_SUGGESTIONS)
      .map((fn) => ({ kind: "function", label: fn.name, detail: fn.syntax, insert: fn }));
    // Nothing left to complete once the exact name is typed and its call has begun.
    if (items.length === 0 || (items.length === 1 && items[0].label === typed && text[caret] === "(")) return null;
    return { items, index: 0, from: last.start, to: caret };
  }
  return null;
}

export default function FormulaEditor({ value, onChange, sources, issues, onSubmit, ref }: FormulaEditorProps) {
  const textarea_ref = useRef<HTMLTextAreaElement>(null);
  const pending_caret = useRef<number | null>(null);
  const [suggestion_state, setSuggestionState] = useState<SuggestionState | null>(null);

  const tokens = useMemo(() => {
    const all = tokenizeFormula(value);
    return all.map((token, index) => {
      const next = all.slice(index + 1).find((candidate) => candidate.type !== "space");
      const is_call = token.type === "name" && next?.type === "paren" && next.text === "(";
      const has_issue = issues.some((issue) => token.start < issue.end && token.end > issue.start);
      return { token, className: tokenClass(token, is_call) + (has_issue ? " underline decoration-wavy decoration-boardtree-danger underline-offset-2" : "") };
    });
  }, [value, issues]);

  // Restores the caret after a programmatic edit, once React has committed the new value.
  useLayoutEffect(() => {
    if (pending_caret.current === null || !textarea_ref.current) return;
    textarea_ref.current.setSelectionRange(pending_caret.current, pending_caret.current);
    pending_caret.current = null;
  }, [value]);

  const replaceRange = (from: number, to: number, text: string, caret_at: number) => {
    pending_caret.current = from + caret_at;
    onChange(value.slice(0, from) + text + value.slice(to));
    setSuggestionState(null);
    textarea_ref.current?.focus();
  };

  const selection = () => ({ from: textarea_ref.current?.selectionStart ?? value.length, to: textarea_ref.current?.selectionEnd ?? value.length });

  useImperativeHandle(ref, () => ({
    focus: () => textarea_ref.current?.focus(),
    insertFunction: (name) => {
      const { from, to } = selection();
      const selected = value.slice(from, to);
      const text = `${name}(${selected})`;
      replaceRange(from, to, text, selected ? text.length : name.length + 1);
    },
    insertColumn: (source) => {
      const { from, to } = selection();
      const text = referenceTextFor(source, sources);
      replaceRange(from, to, text, text.length);
    },
  }));

  const accept = (suggestion: Suggestion) => {
    if (!suggestion_state) return;
    const { from, to } = suggestion_state;
    if (suggestion.kind === "column") {
      const text = referenceTextFor(suggestion.insert, sources);
      replaceRange(from, to, text, text.length);
      return;
    }
    const has_call = value[to] === "(";
    const name = suggestion.insert.name;
    const text = has_call ? name : `${name}()`;
    // The caret lands inside the parentheses, unless the function takes no arguments.
    replaceRange(from, to, text, has_call || suggestion.insert.max_args > 0 ? (has_call ? name.length : name.length + 1) : text.length);
  };

  const refresh = (text: string, caret: number) => setSuggestionState(suggestionsAt(text, caret, sources));

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onSubmit?.();
      return;
    }
    if (!suggestion_state) return;

    const count = suggestion_state.items.length;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setSuggestionState({ ...suggestion_state, index: (suggestion_state.index + step + count) % count });
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      accept(suggestion_state.items[suggestion_state.index]);
    } else if (event.key === "Escape") {
      // Closes only the suggestions, not the whole dialog.
      event.preventDefault();
      event.stopPropagation();
      setSuggestionState(null);
    }
  };

  return (
    <div className="relative">
      <div className="relative min-h-[104px] rounded-[8px] border border-boardtree-border bg-boardtree-surface focus-within:border-boardtree-accent focus-within:ring-2 focus-within:ring-boardtree-accent-soft">
        {/* The highlighted copy defines the box height; the textarea floats over it with transparent text. A trailing space keeps a final empty line visible. */}
        <div aria-hidden="true" className={`pointer-events-none min-h-[104px] text-boardtree-text ${TEXT_LAYER}`}>
          {tokens.map(({ token, className }) => (
            <span key={token.start} className={className}>
              {token.text}
            </span>
          ))}
          {value.endsWith("\n") || value === "" ? " " : null}
        </div>
        <textarea
          ref={textarea_ref}
          autoFocus
          value={value}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          aria-label="Formula"
          aria-autocomplete="list"
          placeholder='Example: {Budget} - {Spent}, or IF({Status} = "Done", 1, 0)'
          onChange={(event) => {
            onChange(event.target.value);
            refresh(event.target.value, event.target.selectionStart);
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End") refresh(value, event.currentTarget.selectionStart);
          }}
          onClick={(event) => refresh(value, event.currentTarget.selectionStart)}
          onBlur={() => setSuggestionState(null)}
          className={`absolute inset-0 h-full w-full resize-none overflow-hidden bg-transparent text-transparent caret-[var(--color-boardtree-text)] outline-none placeholder:text-boardtree-text-faint ${TEXT_LAYER}`}
        />
      </div>

      {suggestion_state && (
        <ul role="listbox" className="absolute left-0 right-0 top-full z-20 mt-1 max-h-[220px] overflow-y-auto rounded-[8px] border border-boardtree-border bg-boardtree-surface py-1 shadow-[0_8px_24px_rgba(30,34,55,0.18)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
          {suggestion_state.items.map((item, index) => (
            <li
              key={`${item.kind}:${item.label}`}
              role="option"
              aria-selected={index === suggestion_state.index}
              // mousedown (not click) so the textarea keeps focus and its blur does not discard the list first.
              onMouseDown={(event) => {
                event.preventDefault();
                accept(item);
              }}
              onMouseEnter={() => setSuggestionState({ ...suggestion_state, index })}
              className={`flex cursor-pointer items-baseline gap-2 px-3 py-1.5 text-[12.5px] ${index === suggestion_state.index ? "bg-boardtree-selected" : ""}`}
            >
              <span className={`flex-none font-mono ${item.kind === "function" ? "text-[#9d50dd] dark:text-[#d8b4fe]" : "text-boardtree-accent"}`}>
                {item.kind === "column" ? `{${item.label}}` : item.label}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-boardtree-text-faint">{item.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
