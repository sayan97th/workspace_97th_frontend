"use client";

import { useEffect, useRef, useState } from "react";
import type { CellValue, ColumnDef } from "../types";
import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import { highlightSearchMatches } from "../searchHighlight";
import ExpandingCellEditor from "./ExpandingCellEditor";

interface ExpandableTextCellProps {
  node_id: string;
  column: ColumnDef;
  value: CellValue;
  state: BoardTableState;
  actions: BoardTableActions;
}

/** Line clamp per "Item height" preset, so taller rows show more of a long value before it is opened. */
const LINE_CLAMP_CLASS: Record<BoardTableState["row_height"], string> = {
  single: "line-clamp-1",
  double: "line-clamp-2",
  triple: "line-clamp-3",
  quad: "line-clamp-4",
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

/**
 * Text, Email and Long Text cell. At rest it shows the value clamped to the row
 * height (with search matches highlighted). Clicking it, or pressing Enter/F2
 * on the active cell, opens `ExpandingCellEditor` over the cell, which grows to
 * show the whole value while typing, like Google Sheets. The draft is saved once
 * on commit (one PATCH and one undo step) instead of on every keystroke, and
 * Escape throws it away.
 */
export default function ExpandableTextCell({ node_id, column, value, state, actions }: ExpandableTextCellProps) {
  const text = typeof value === "string" ? value : "";
  const is_long_text = column.kind === "longtext";
  const is_active = state.active_cell?.node_id === node_id && state.active_cell?.column_id === column.id;

  const cell_ref = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const is_editing = draft !== null;

  // Unmount (row filtered out, board switched) while editing still saves the draft, like a blur would.
  const pending_ref = useRef<{ draft: string | null; text: string }>({ draft: null, text });
  pending_ref.current = { draft, text };
  useEffect(
    () => () => {
      const { draft: last_draft, text: last_text } = pending_ref.current;
      if (last_draft !== null && last_draft !== last_text) actions.setCellValue(node_id, column.id, last_draft);
    },
    // Runs once, on unmount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const openEditor = () => setDraft(text);

  const commit = () => {
    const next_value = column.kind === "email" ? (draft ?? "").trim() : draft ?? "";
    pending_ref.current.draft = null;
    setDraft(null);
    if (next_value !== text) actions.setCellValue(node_id, column.id, next_value);
  };

  // Enter or F2 on the active cell opens the editor, like a spreadsheet.
  useEffect(() => {
    if (!is_active || is_editing) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== "F2") return;
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      event.preventDefault();
      setDraft(text);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_active, is_editing, text]);

  const clamp_class = is_long_text ? LINE_CLAMP_CLASS[state.row_height] : state.row_height === "single" ? "truncate" : LINE_CLAMP_CLASS[state.row_height];

  return (
    <div ref={cell_ref} className="relative flex h-full w-full min-w-0">
      <button
        type="button"
        onClick={openEditor}
        title={text || undefined}
        aria-label={`Edit ${column.title}`}
        className={`flex h-full w-full min-w-0 items-center px-3 text-left font-[inherit] text-board-cell text-boardtree-text ${
          is_editing ? "invisible" : ""
        }`}
      >
        {text ? (
          <span className={`min-w-0 ${is_long_text || state.row_height !== "single" ? "whitespace-pre-wrap break-words" : ""} ${clamp_class}`}>
            {highlightSearchMatches(text, state.search_query)}
          </span>
        ) : is_long_text ? (
          <span className="truncate text-boardtree-text-faint">Add text</span>
        ) : null}
      </button>
      {is_editing && (
        <ExpandingCellEditor
          anchor_ref={cell_ref}
          value={draft}
          onChange={setDraft}
          onCommit={commit}
          onCancel={() => setDraft(null)}
          allow_line_breaks={column.kind !== "email"}
          placeholder={is_long_text ? "Add text" : undefined}
          max_width={is_long_text ? 520 : 480}
          max_height={is_long_text ? 360 : 240}
          aria_label={column.title}
        />
      )}
    </div>
  );
}
