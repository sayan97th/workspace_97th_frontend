"use client";
import React from "react";
import type { BoardImportDuplicateMode } from "@/types/board-import";
import ImportSelect, { type ImportSelectOption } from "./ImportSelect";
import { CheckIcon, PlusIcon, RefreshIcon, XCircleIcon } from "./importIcons";

/** The duplicate modes that match imported rows against existing items by a column. */
export type MatchingDuplicateMode = Exclude<BoardImportDuplicateMode, "add">;

export type ImportHandleMatchesStepProps = {
  duplicate_mode: BoardImportDuplicateMode;
  onChangeDuplicateMode: (mode: BoardImportDuplicateMode) => void;
  /** The file column (source index) each matching mode compares, null until one is picked. */
  match_by: Record<MatchingDuplicateMode, number | null>;
  onChangeMatchBy: (mode: MatchingDuplicateMode, source_index: number) => void;
  /** Every board column, with the file column feeding it as the value. Columns nothing is mapped to come disabled. */
  match_options: ImportSelectOption[];
};

const CARDS: { id: BoardImportDuplicateMode; title: string; description: string; tone: "success" | "danger" | "info"; icon: React.ReactNode }[] = [
  {
    id: "add",
    title: "Add as new items",
    description: "Import all rows, even if they already exist on the board",
    tone: "success",
    icon: <PlusIcon size={16} />,
  },
  {
    id: "skip",
    title: "Skip",
    description: "Don't import rows that already exist on the board, matched by:",
    tone: "danger",
    icon: <XCircleIcon size={16} />,
  },
  {
    id: "update",
    title: "Update",
    description: "Overwrite existing items with imported data, matched by:",
    tone: "info",
    icon: <RefreshIcon size={16} />,
  },
];

/**
 * Step 3 ("Handle matches"), styled after monday.com's "Set duplicate
 * behavior": what happens when an imported row matches an item already on
 * the board. "Skip" and "Update" each need the column rows are matched by,
 * picked from the board's columns (only the ones a file column was mapped
 * to can be picked); "Import Now" stays disabled until there is one.
 */
const ImportHandleMatchesStep: React.FC<ImportHandleMatchesStepProps> = ({
  duplicate_mode,
  onChangeDuplicateMode,
  match_by,
  onChangeMatchBy,
  match_options,
}) => {
  return (
    <div className="iw-scroll">
      <div className="iw-matches">
        <h2 className="iw-step-title">Set duplicate behavior</h2>
        <p className="iw-step-subtitle">Set what happens when imported rows match existing items</p>

        <div className="iw-match-cards" role="radiogroup" aria-label="Duplicate behavior">
          {CARDS.map((card) => {
            const is_selected = duplicate_mode === card.id;
            return (
              <div
                key={card.id}
                role="radio"
                aria-checked={is_selected}
                tabIndex={is_selected ? 0 : -1}
                className="iw-match-card"
                data-selected={is_selected}
                onClick={() => onChangeDuplicateMode(card.id)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === " " || event.key === "Enter") {
                    event.preventDefault();
                    onChangeDuplicateMode(card.id);
                  }
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    const index = CARDS.findIndex((candidate) => candidate.id === card.id);
                    const next = CARDS[(index + (event.key === "ArrowDown" ? 1 : CARDS.length - 1)) % CARDS.length];
                    onChangeDuplicateMode(next.id);
                    (event.currentTarget.parentElement?.children[CARDS.indexOf(next)] as HTMLElement | undefined)?.focus();
                  }
                }}
              >
                <span className="iw-match-head" data-tone={card.tone}>
                  {card.icon}
                  {card.title}
                </span>
                <p className="iw-match-description">{card.description}</p>
                <span className="iw-radio" data-checked={is_selected} aria-hidden="true">
                  {is_selected && <CheckIcon size={12} />}
                </span>

                {card.id !== "add" && (
                  <ImportSelect
                    value={match_by[card.id] === null ? null : String(match_by[card.id])}
                    groups={[{ options: match_options }]}
                    onChange={(value) => {
                      onChangeMatchBy(card.id as MatchingDuplicateMode, Number(value));
                      onChangeDuplicateMode(card.id);
                    }}
                    aria_label={`${card.title} rows matched by`}
                    className="iw-match-select"
                    min_menu_width={260}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ImportHandleMatchesStep;
