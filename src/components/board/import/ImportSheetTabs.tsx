"use client";
import React, { useRef } from "react";
import type { BoardImportSheet } from "@/types/board-import";
import { ImageIcon, SheetIcon, Spinner } from "./importIcons";

export type ImportSheetTabsProps = {
  sheets: BoardImportSheet[];
  sheet_index: number;
  /** The sheet being read right now, it shows a spinner until its columns arrive. */
  loading_index: number | null;
  onChange: (sheet_index: number) => void;
};

/**
 * A workbook's sheets as tabs above the "Map columns" card, like the sheet
 * tabs at the bottom of a spreadsheet: picking one reads that sheet instead.
 * Each tab says how many rows (and pictures) the sheet holds, an empty sheet
 * stays selectable but is muted. Arrow keys move between tabs.
 */
const ImportSheetTabs: React.FC<ImportSheetTabsProps> = ({ sheets, sheet_index, loading_index, onChange }) => {
  const tab_refs = useRef<(HTMLButtonElement | null)[]>([]);

  if (sheets.length < 2) return null;

  const focusTab = (position: number) => {
    const next = (position + sheets.length) % sheets.length;
    tab_refs.current[next]?.focus();
  };

  return (
    <div className="iw-sheets">
      <span className="iw-sheets-label">Sheet</span>
      <div className="iw-sheet-tabs" role="tablist" aria-label="Sheets in this file">
        {sheets.map((sheet, position) => {
          const is_selected = sheet.index === sheet_index;
          const is_loading = loading_index === sheet.index;
          return (
            <button
              key={sheet.index}
              ref={(node) => {
                tab_refs.current[position] = node;
              }}
              type="button"
              role="tab"
              aria-selected={is_selected}
              tabIndex={is_selected ? 0 : -1}
              className="iw-sheet-tab"
              data-empty={sheet.row_count === 0}
              disabled={loading_index !== null && !is_loading}
              onClick={() => !is_selected && onChange(sheet.index)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") focusTab(position + 1);
                if (event.key === "ArrowLeft") focusTab(position - 1);
              }}
            >
              {is_loading ? <Spinner /> : <SheetIcon size={14} />}
              <span className="iw-sheet-tab-name">{sheet.name}</span>
              <span className="iw-sheet-tab-count">
                {sheet.row_count === 0 ? "Empty" : `${sheet.row_count} row${sheet.row_count === 1 ? "" : "s"}`}
              </span>
              {sheet.image_count > 0 && (
                <span className="iw-sheet-tab-count" aria-label={`${sheet.image_count} images`}>
                  <ImageIcon size={12} />
                  {sheet.image_count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ImportSheetTabs;
