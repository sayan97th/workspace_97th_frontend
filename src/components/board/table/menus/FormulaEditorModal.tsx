"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { BoardTableActions } from "../useBoardTable";
import type { CellValue, ColumnDef } from "../types";
import FormulaEditor, { type FormulaEditorHandle } from "../formula/FormulaEditor";
import FormulaLibraryPanel from "../formula/FormulaLibraryPanel";
import { inferFormulaType, runFormula, toDisplayExpression, toStoredExpression, validateFormula } from "../formula/formulaEngine";
import type { FormulaValueType } from "../formula/formulaValues";

/** One row of the board the dialog can preview the formula against. */
export interface FormulaPreviewRow {
  id: string;
  name: string;
  values: Record<string, CellValue>;
}

interface FormulaEditorModalProps {
  column: ColumnDef;
  /** The first rows of the same scope as the column (items, or subitems for a subitem column). */
  preview_rows: FormulaPreviewRow[];
  actions: BoardTableActions;
  onClose: () => void;
}

/** Same limit the API enforces on the saved expression. */
const MAX_EXPRESSION_LENGTH = 2000;
const PREVIEW_ROW_LIMIT = 8;

const TYPE_LABEL: Record<FormulaValueType, string> = {
  number: "a number",
  text: "text",
  boolean: "TRUE or FALSE",
  date: "a date",
  unknown: "a value that depends on each row",
};

/**
 * The Formula column's editor, modeled on monday.com's: a highlighted
 * expression box with autocomplete, a function and column reference to click
 * from, and a live preview computed on the board's own rows. Saved expressions
 * reference columns by id, so renaming a column later never breaks them.
 */
export default function FormulaEditorModal({ column, preview_rows, actions, onClose }: FormulaEditorModalProps) {
  const title_id = useId();
  const editor_ref = useRef<FormulaEditorHandle>(null);
  const sources = useMemo(() => column.formula_sources ?? [], [column.formula_sources]);
  const initial_expression = useMemo(() => toDisplayExpression(column.formula?.expression ?? "", sources), [column.formula?.expression, sources]);
  const [expression, setExpression] = useState(initial_expression);

  const is_empty = expression.trim() === "";
  const is_dirty = expression !== initial_expression;
  const issues = useMemo(() => (is_empty ? [] : validateFormula(expression, sources)), [expression, is_empty, sources]);
  const { stored } = useMemo(() => toStoredExpression(expression, sources), [expression, sources]);
  const is_too_long = stored.length > MAX_EXPRESSION_LENGTH;
  const is_valid = !is_empty && issues.length === 0 && !is_too_long;
  const result_type = useMemo(() => (is_valid ? inferFormulaType(stored, sources) : "unknown"), [is_valid, stored, sources]);

  const preview = useMemo(
    () =>
      is_valid
        ? preview_rows.slice(0, PREVIEW_ROW_LIMIT).map((row) => ({ row, outcome: runFormula(stored, { sources, values: row.values, item_name: row.name }) }))
        : [],
    [is_valid, preview_rows, stored, sources]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const save = () => {
    if (!is_valid || !is_dirty) return;
    actions.updateColumnFormula(column.id, { expression: stored });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(30,34,55,0.35)] p-4"
      // A backdrop click never throws away an edit in progress.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !is_dirty) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={title_id} className="flex max-h-[90vh] w-[900px] max-w-full flex-col rounded-[14px] bg-boardtree-surface shadow-[0_24px_60px_rgba(30,34,55,0.30)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-boardtree-border-soft px-5 py-4">
          <div>
            <div id={title_id} className="text-[15px] font-semibold text-boardtree-text">Formula for {column.title}</div>
            <div className="mt-0.5 text-[12.5px] text-boardtree-text-muted">Calculate a value from the other columns of the same row.</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-7 w-7 items-center justify-center rounded-[6px] text-boardtree-text-muted hover:bg-boardtree-hover">
            <svg viewBox="0 0 14 14" width="12" height="12"><path d="M2.6 2.6 L11.4 11.4 M11.4 2.6 L2.6 11.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 py-4 md:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <FormulaEditor ref={editor_ref} value={expression} onChange={setExpression} sources={sources} issues={issues} onSubmit={save} />

            <div className="mt-2 min-h-[20px] text-[12.5px]" role="status" aria-live="polite">
              {is_empty ? (
                <span className="text-boardtree-text-muted">Type a formula, or pick columns and functions from the list. Type <span className="font-mono">{"{"}</span> to search columns.</span>
              ) : issues.length > 0 ? (
                <span className="text-boardtree-danger">{issues[0].message}</span>
              ) : is_too_long ? (
                <span className="text-boardtree-danger">This formula is too long. The limit is {MAX_EXPRESSION_LENGTH} characters.</span>
              ) : (
                <span className="text-boardtree-text-muted">This formula returns {TYPE_LABEL[result_type]}.</span>
              )}
            </div>

            <div className="mb-1.5 mt-4 text-[12px] font-semibold uppercase tracking-wide text-boardtree-text-faint">Preview</div>
            <div className="overflow-hidden rounded-[8px] border border-boardtree-border-soft">
              {preview_rows.length === 0 && <div className="px-3 py-3 text-[12.5px] text-boardtree-text-faint">Add an item to this board to preview the result on real data.</div>}
              {preview_rows.length > 0 && !is_valid && <div className="px-3 py-3 text-[12.5px] text-boardtree-text-faint">The preview appears once the formula is valid.</div>}
              {preview.map(({ row, outcome }) => (
                <div key={row.id} className="flex items-center gap-3 border-b border-boardtree-border-soft px-3 py-2 text-[12.5px] last:border-b-0">
                  <span className="min-w-0 flex-1 truncate text-boardtree-text-secondary" title={row.name}>{row.name || "Untitled"}</span>
                  {outcome.ok ? (
                    <span className="max-w-[55%] flex-none truncate font-mono text-boardtree-text" title={outcome.text}>{outcome.text || "(blank)"}</span>
                  ) : (
                    <span className="flex-none font-mono text-boardtree-danger" title={outcome.message}>{outcome.code}</span>
                  )}
                </div>
              ))}
            </div>
            {is_valid && preview_rows.length > PREVIEW_ROW_LIMIT && <div className="mt-1.5 text-[11.5px] text-boardtree-text-faint">Showing the first {PREVIEW_ROW_LIMIT} rows.</div>}
          </div>

          <FormulaLibraryPanel
            sources={sources}
            onInsertFunction={(name) => editor_ref.current?.insertFunction(name)}
            onInsertColumn={(source) => editor_ref.current?.insertColumn(source)}
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-boardtree-border-soft px-5 py-3">
          <span className="text-[11.5px] text-boardtree-text-faint">Ctrl + Enter to save</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-[7px] px-4 text-[13px] font-medium text-boardtree-text-secondary hover:bg-boardtree-hover">Cancel</button>
            <button type="button" disabled={!is_valid || !is_dirty} onClick={save} className="h-9 rounded-[7px] bg-boardtree-accent px-5 text-[13px] font-medium text-white hover:bg-boardtree-accent-hover disabled:opacity-40">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
