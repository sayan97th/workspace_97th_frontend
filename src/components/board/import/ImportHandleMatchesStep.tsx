"use client";
import React from "react";
import type { BoardImportDuplicateMode } from "@/types/board-import";

export type ImportHandleMatchesStepProps = {
  duplicate_mode: BoardImportDuplicateMode;
  onChangeDuplicateMode: (mode: BoardImportDuplicateMode) => void;
  match_source_index: number | null;
  onChangeMatchSourceIndex: (index: number) => void;
  /** Every column actually feeding the import (name/mapped/created) — the only ones a row can be matched by. */
  matchable_columns: { source_index: number; label: string }[];
};

const CARDS: { id: BoardImportDuplicateMode; icon: React.ReactNode; title: string; description: string }[] = [
  {
    id: "add",
    title: "Add as new items",
    description: "Import all rows, even if they already exist on the board",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "skip",
    title: "Skip",
    description: "Don't import rows that already exist on the board, matched by:",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 8l8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "update",
    title: "Update",
    description: "Overwrite existing items with imported data, matched by:",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 12a8 8 0 0 1 13.66-5.66L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.66 5.66L4 16M4 20v-4h4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

/**
 * Step 3 ("Handle matches") — how an incoming row that matches an existing
 * item on the target table is handled. "Skip"/"Update" both need a column to
 * match rows by, defaulting to whichever column feeds the item's name.
 */
const ImportHandleMatchesStep: React.FC<ImportHandleMatchesStepProps> = ({
  duplicate_mode,
  onChangeDuplicateMode,
  match_source_index,
  onChangeMatchSourceIndex,
  matchable_columns,
}) => {
  return (
    <div className="flex flex-1 flex-col items-center px-8 py-10">
      <div className="w-full max-w-[640px] text-center">
        <h2 className="text-[19px] font-semibold text-shell-text">Set duplicate behavior</h2>
        <p className="mt-1.5 text-[13.5px] text-shell-text-secondary">Set what happens when imported rows match existing items</p>
      </div>

      <div className="mt-7 flex w-full max-w-[640px] flex-col gap-3">
        {CARDS.map((card) => {
          const is_selected = duplicate_mode === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onChangeDuplicateMode(card.id)}
              className={`flex flex-col gap-3 rounded-xl border px-5 py-4 text-left transition-colors ${
                is_selected ? "border-brand-500 bg-brand-50/40 dark:bg-brand-500/10" : "border-shell-border-strong hover:bg-shell-hover"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className={card.id === "skip" ? "mt-0.5 text-error-500" : card.id === "add" ? "mt-0.5 text-success-500" : "mt-0.5 text-shell-text-secondary"}>
                    {card.icon}
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold text-shell-text">{card.title}</p>
                    <p className="mt-0.5 text-[12.5px] text-shell-text-secondary">{card.description}</p>
                  </div>
                </div>
                <span
                  className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${
                    is_selected ? "border-brand-500 bg-brand-500" : "border-shell-border-strong"
                  }`}
                >
                  {is_selected && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              </div>

              {card.id !== "add" && is_selected && (
                <select
                  value={match_source_index ?? ""}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => onChangeMatchSourceIndex(Number(event.target.value))}
                  className="w-[220px] rounded-lg border border-shell-border-strong bg-shell-bg px-3 py-2 text-[13px] font-medium text-shell-text outline-none focus:border-brand-500"
                >
                  {matchable_columns.map((column) => (
                    <option key={column.source_index} value={column.source_index}>
                      {column.label}
                    </option>
                  ))}
                </select>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ImportHandleMatchesStep;
