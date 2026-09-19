"use client";

import { useMemo, useState } from "react";
import type { FormulaSourceColumn } from "../types";
import { NAME_COLUMN_ID, evaluateExample } from "./formulaEngine";
import { FORMULA_FUNCTIONS, FORMULA_FUNCTION_CATEGORIES, type FormulaFunction } from "./formulaFunctions";

interface FormulaLibraryPanelProps {
  sources: FormulaSourceColumn[];
  onInsertFunction: (name: string) => void;
  onInsertColumn: (source: FormulaSourceColumn) => void;
}

type LibraryTab = "columns" | "functions";

const KIND_LABEL: Record<string, string> = {
  longtext: "Long text",
  auto_number: "Item ID",
  people: "People (count)",
  vote: "Votes (count)",
};

const kindLabel = (source: FormulaSourceColumn) =>
  source.id === NAME_COLUMN_ID ? "Item name" : (KIND_LABEL[source.kind] ?? source.kind.charAt(0).toUpperCase() + source.kind.slice(1).replace("_", " "));

const ROW = "flex w-full items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-left text-[12.5px] text-boardtree-text hover:bg-boardtree-hover focus-visible:bg-boardtree-hover focus-visible:outline-none";

/** The dialog's right hand reference: the columns a formula can read and every function, each inserted at the editor's caret on click. */
export default function FormulaLibraryPanel({ sources, onInsertFunction, onInsertColumn }: FormulaLibraryPanelProps) {
  const [tab, setTab] = useState<LibraryTab>("functions");
  const [query, setQuery] = useState("");
  const [focused_name, setFocusedName] = useState<string>(FORMULA_FUNCTIONS[0].name);

  const q = query.trim().toLowerCase();
  const filtered_sources = sources.filter((source) => source.title.toLowerCase().includes(q));
  const filtered_functions = useMemo(
    () => FORMULA_FUNCTIONS.filter((fn) => !q || fn.name.toLowerCase().includes(q) || fn.description.toLowerCase().includes(q)),
    [q]
  );
  const focused: FormulaFunction | undefined = FORMULA_FUNCTIONS.find((fn) => fn.name === focused_name);
  const example_result = useMemo(() => (focused ? evaluateExample(focused.example) : ""), [focused]);

  return (
    <div className="flex max-h-[440px] min-h-0 flex-col md:max-h-none">
      <div role="tablist" className="mb-2 flex flex-none gap-1 rounded-[8px] bg-boardtree-hover p-0.5">
        {(["functions", "columns"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`h-7 flex-1 rounded-[6px] text-[12.5px] font-medium capitalize ${tab === id ? "bg-boardtree-surface text-boardtree-text shadow-sm" : "text-boardtree-text-muted hover:text-boardtree-text"}`}
          >
            {id}
          </button>
        ))}
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={tab === "functions" ? "Search functions" : "Search columns"}
        aria-label={tab === "functions" ? "Search functions" : "Search columns"}
        className="mb-2 h-8 w-full flex-none rounded-[6px] border border-boardtree-border bg-transparent px-2.5 text-[12.5px] text-boardtree-text outline-none placeholder:text-boardtree-text-faint focus:border-boardtree-accent"
      />

      <div className="min-h-[160px] flex-1 overflow-y-auto pr-0.5">
        {tab === "columns" && (
          <>
            {filtered_sources.map((source) => (
              <button key={source.id} type="button" onClick={() => onInsertColumn(source)} className={ROW}>
                <span className="min-w-0 flex-1 truncate">{source.title}</span>
                <span className="flex-none text-[11px] text-boardtree-text-faint">{kindLabel(source)}</span>
              </button>
            ))}
            {filtered_sources.length === 0 && <div className="px-2.5 py-2 text-[12.5px] text-boardtree-text-faint">No matching columns. Formulas can read number, text, status, date, checkbox and similar columns.</div>}
          </>
        )}

        {tab === "functions" &&
          FORMULA_FUNCTION_CATEGORIES.map((category) => {
            const in_category = filtered_functions.filter((fn) => fn.category === category);
            if (in_category.length === 0) return null;
            return (
              <div key={category} className="mb-1.5">
                <div className="px-2.5 pb-0.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-boardtree-text-faint">{category}</div>
                {in_category.map((fn) => (
                  <button
                    key={fn.name}
                    type="button"
                    onClick={() => onInsertFunction(fn.name)}
                    onMouseEnter={() => setFocusedName(fn.name)}
                    onFocus={() => setFocusedName(fn.name)}
                    className={`${ROW} font-mono text-[12px] ${focused_name === fn.name ? "bg-boardtree-hover" : ""}`}
                  >
                    {fn.name}
                  </button>
                ))}
              </div>
            );
          })}
        {tab === "functions" && filtered_functions.length === 0 && <div className="px-2.5 py-2 text-[12.5px] text-boardtree-text-faint">No matching functions.</div>}
      </div>

      {tab === "functions" && focused && (
        <div className="mt-2 flex-none rounded-[8px] border border-boardtree-border-soft bg-boardtree-panel-alt p-3 text-[12px] leading-[17px]">
          <div className="break-words font-mono text-[12px] text-boardtree-text">{focused.syntax}</div>
          <p className="mt-1.5 text-boardtree-text-secondary">{focused.description}</p>
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-boardtree-text-faint">Example</div>
          <div className="break-words font-mono text-boardtree-text-secondary">{focused.example}</div>
          <div className="font-mono text-boardtree-accent">= {example_result}</div>
        </div>
      )}
    </div>
  );
}
