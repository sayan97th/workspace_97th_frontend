"use client";
import { useState } from "react";
import AddColumnMenu from "../AddColumnMenu";
import type { AddableColumnType } from "../columnTypes";
import BoardValueCell, { type BoardCellOption, type BoardCellPerson, type BoardCellValue } from "../cells/BoardValueCell";
import type { BoardOptionActions } from "../cells/OptionPicker";
import { PlusIcon } from "@/icons/board-icons";
import type { TableBoardColumn } from "./types";

/** Fixed pixel width of the trailing "+" header button — every row needs a same-width blank filler after its own cells so columns still line up. */
export const ADD_COLUMN_BUTTON_WIDTH_PX = 42;

/** Everything a row needs to render/commit its dynamically-added columns' cells, threaded down from `useTableBoard` through the group table into each row. */
export type DynamicColumnsBag = {
  columns: TableBoardColumn[];
  people: BoardCellPerson[];
  onCommit: (node_id: string, column_id: string, value: BoardCellValue) => void;
  onAddOption: (column_id: string, option: { label: string; color: string }) => Promise<BoardCellOption | null>;
  makeOptionActions: (column_id: string) => BoardOptionActions;
};

export const computeExtraColumnsTemplate = (columns: TableBoardColumn[]): string =>
  columns.map((column) => `${column.width}px`).join(" ");

/**
 * The dynamic columns' header cells plus the trailing "+" button that opens
 * {@link AddColumnMenu} — appended after a group table's fixed header. Owns
 * its own popover anchor so each group can open its own menu instance.
 */
export const DynamicColumnHeaderCells: React.FC<{
  columns: TableBoardColumn[];
  onAddColumn: (type: AddableColumnType) => void;
  height_class?: string;
}> = ({ columns, onAddColumn, height_class = "h-[38px]" }) => {
  const [anchor_el, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <>
      {columns.length > 0 && (
        <div
          className="grid flex-none border-b border-[#e3e6ef]"
          style={{ gridTemplateColumns: computeExtraColumnsTemplate(columns) }}
        >
          {columns.map((column) => (
            <div
              key={column.id}
              className={`flex ${height_class} items-center justify-center border-r border-[#eceef5] px-2 text-[12.5px] font-medium text-[#6b7189]`}
            >
              <span className="truncate">{column.label}</span>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-label="Add column"
        style={{ width: ADD_COLUMN_BUTTON_WIDTH_PX }}
        className={`flex ${height_class} flex-none items-center justify-center border-b border-[#eceef5] text-[#a4aac2] hover:bg-[#f1f3f9] hover:text-[#4f6bed]`}
      >
        <PlusIcon size={13} />
      </button>
      <AddColumnMenu anchor_el={anchor_el} is_open={anchor_el !== null} onClose={() => setAnchorEl(null)} onSelectType={onAddColumn} />
    </>
  );
};

/** A row's cells for every dynamically-added column, typed per column `kind` via {@link BoardValueCell}. */
export const DynamicColumnCells: React.FC<{
  node_id: string;
  values: Record<string, BoardCellValue> | undefined;
  bag: DynamicColumnsBag;
  height_class?: string;
}> = ({ node_id, values, bag, height_class = "h-[42px]" }) => {
  if (bag.columns.length === 0) return null;
  return (
    <div className="grid flex-none border-b border-[#eceef5]" style={{ gridTemplateColumns: computeExtraColumnsTemplate(bag.columns) }}>
      {bag.columns.map((column) => (
        <div key={column.id} className={`${height_class} border-r border-[#eceef5] px-1.5`}>
          <BoardValueCell
            column={{ id: column.id, kind: column.kind, options: column.options }}
            value={values?.[column.id] ?? null}
            people={bag.people}
            onCommit={(value) => bag.onCommit(node_id, column.id, value)}
            onAddOption={column.options ? (option) => bag.onAddOption(column.id, option) : undefined}
            onEditOptions={column.options ? bag.makeOptionActions(column.id) : undefined}
          />
        </div>
      ))}
    </div>
  );
};

/** Blank space the width of the "+" header button, so a row without dynamic columns still lines up under a header that has one. */
export const AddColumnFiller: React.FC<{ height_class?: string }> = ({ height_class = "h-[42px]" }) => (
  <div className={height_class} style={{ width: ADD_COLUMN_BUTTON_WIDTH_PX }} />
);
