"use client";

import { useEffect, useState } from "react";
import { boardContentService } from "@/services/board-content.service";
import { workspaceService } from "@/services/workspace.service";
import type { BoardColumnDto } from "@/types/board-content";
import type { WorkspaceContentItem } from "@/types/workspace";
import type { BoardTableActions } from "../useBoardTable";
import type { ColumnDef } from "../types";

interface ConfigEditorModalProps {
  kind: "formula" | "mirror" | "connect_board";
  column: ColumnDef;
  /** Every other column in this tab (both scopes' own list, shared across groups), for Formula's source-column picker and Mirror's connect-board-column picker. */
  sibling_columns: ColumnDef[];
  actions: BoardTableActions;
  onClose: () => void;
}

const OPERATIONS: { id: "sum" | "subtract" | "multiply" | "divide" | "concat"; label: string }[] = [
  { id: "sum", label: "Sum (+)" },
  { id: "subtract", label: "Subtract (-)" },
  { id: "multiply", label: "Multiply (x)" },
  { id: "divide", label: "Divide (/)" },
  { id: "concat", label: "Combine text" },
];

const MODAL_TITLE: Record<ConfigEditorModalProps["kind"], string> = {
  formula: "Configure formula",
  connect_board: "Configure linked board",
  mirror: "Configure mirror",
};

/** Shared chrome for the Formula/Connect-board/Mirror settings modals, dispatched by `kind` — mirrors `LabelEditorModal`'s own overlay/card layout. */
export default function ConfigEditorModal({ kind, column, sibling_columns, actions, onClose }: ConfigEditorModalProps) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(30,34,55,0.35)]" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[80vh] w-[420px] flex-col rounded-[14px] bg-boardtree-surface shadow-[0_24px_60px_rgba(30,34,55,0.30)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-boardtree-border-soft px-5 py-4">
          <div className="text-[15px] font-semibold text-boardtree-text">{MODAL_TITLE[kind]}</div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[6px] text-boardtree-text-muted hover:bg-boardtree-hover">
            <svg viewBox="0 0 14 14" width="12" height="12"><path d="M2.6 2.6 L11.4 11.4 M11.4 2.6 L2.6 11.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {kind === "formula" && <FormulaBody column={column} sibling_columns={sibling_columns} actions={actions} onClose={onClose} />}
          {kind === "connect_board" && <ConnectBoardBody column={column} actions={actions} onClose={onClose} />}
          {kind === "mirror" && <MirrorBody column={column} sibling_columns={sibling_columns} actions={actions} onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

const SAVE_BUTTON = "mt-4 flex h-9 w-full items-center justify-center rounded-[7px] bg-boardtree-accent text-[13px] font-medium text-white hover:bg-boardtree-accent-hover disabled:opacity-40";
const OPTION_ROW = "flex h-9 w-full items-center gap-2.5 rounded-[6px] px-2.5 text-left text-[13px] text-boardtree-text hover:bg-boardtree-hover";

function FormulaBody({ column, sibling_columns, actions, onClose }: { column: ColumnDef; sibling_columns: ColumnDef[]; actions: BoardTableActions; onClose: () => void }) {
  const [operation, setOperation] = useState(column.formula?.operation ?? "sum");
  const [source_ids, setSourceIds] = useState<string[]>(column.formula?.source_column_ids ?? []);
  // A formula never reads another computed column, to avoid a cycle.
  const candidates = sibling_columns.filter((c) => c.id !== column.id && c.kind !== "formula" && c.kind !== "mirror");

  const toggle = (id: string) => setSourceIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  return (
    <>
      <div className="mb-3 text-[12.5px] text-boardtree-text-muted">Computes a read-only value from other columns on the same row.</div>
      <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-boardtree-text-faint">Operation</div>
      <div className="mb-3 flex flex-col gap-0.5">
        {OPERATIONS.map((op) => (
          <button key={op.id} type="button" onClick={() => setOperation(op.id)} className={OPTION_ROW}>
            <span className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border-[1.5px] ${operation === op.id ? "border-boardtree-accent" : "border-boardtree-border"}`}>
              {operation === op.id && <span className="h-2 w-2 rounded-full bg-boardtree-accent" />}
            </span>
            <span className="flex-1">{op.label}</span>
          </button>
        ))}
      </div>
      <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-boardtree-text-faint">Source columns, in order</div>
      <div className="flex max-h-[180px] flex-col gap-0.5 overflow-y-auto">
        {candidates.map((c) => {
          const index = source_ids.indexOf(c.id);
          return (
            <button key={c.id} type="button" onClick={() => toggle(c.id)} className={OPTION_ROW}>
              <span className={`flex h-4 w-4 flex-none items-center justify-center rounded-[4px] border-[1.5px] ${index >= 0 ? "border-boardtree-accent bg-boardtree-accent" : "border-boardtree-border"}`}>
                {index >= 0 && <span className="text-[9px] font-bold text-white">{index + 1}</span>}
              </span>
              <span className="flex-1 truncate">{c.title}</span>
            </button>
          );
        })}
        {candidates.length === 0 && <div className="px-2.5 py-1.5 text-[12.5px] text-boardtree-text-faint">No other columns to compute from yet.</div>}
      </div>
      <button
        type="button"
        disabled={source_ids.length === 0}
        onClick={() => { actions.updateColumnFormula(column.id, { operation, source_column_ids: source_ids }); onClose(); }}
        className={SAVE_BUTTON}
      >
        Save
      </button>
    </>
  );
}

function ConnectBoardBody({ column, actions, onClose }: { column: ColumnDef; actions: BoardTableActions; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [boards, setBoards] = useState<WorkspaceContentItem[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [selected_id, setSelectedId] = useState(column.linked_board_id ?? null);

  useEffect(() => {
    workspaceService
      .getContentItems(1, 100, { asset_type: ["board"] })
      .then((page) => setBoards(page.data))
      .finally(() => setIsLoading(false));
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = boards.filter((b) => b.label.toLowerCase().includes(q));

  return (
    <>
      <div className="mb-3 text-[12.5px] text-boardtree-text-muted">Links this column's cells to one or more items on another board.</div>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search boards"
        className="mb-2 h-9 w-full rounded-[6px] border border-boardtree-border px-2.5 text-[13px] text-boardtree-text outline-none focus:border-boardtree-accent"
      />
      <div className="flex max-h-[220px] flex-col gap-0.5 overflow-y-auto">
        {filtered.map((board) => (
          <button key={board.id} type="button" onClick={() => setSelectedId(String(board.id))} className={OPTION_ROW}>
            <span className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border-[1.5px] ${selected_id === String(board.id) ? "border-boardtree-accent" : "border-boardtree-border"}`}>
              {selected_id === String(board.id) && <span className="h-2 w-2 rounded-full bg-boardtree-accent" />}
            </span>
            <span className="min-w-0 flex-1 truncate">{board.label}</span>
            {board.workspace && <span className="flex-none text-[11px] text-boardtree-text-faint">{board.workspace.name}</span>}
          </button>
        ))}
        {!is_loading && filtered.length === 0 && <div className="px-2.5 py-1.5 text-[12.5px] text-boardtree-text-faint">No boards found.</div>}
        {is_loading && <div className="px-2.5 py-1.5 text-[12.5px] text-boardtree-text-faint">Loading…</div>}
      </div>
      <button
        type="button"
        disabled={!selected_id}
        onClick={() => { if (selected_id) actions.updateColumnLinkedBoard(column.id, selected_id); onClose(); }}
        className={SAVE_BUTTON}
      >
        Save
      </button>
    </>
  );
}

function MirrorBody({ column, sibling_columns, actions, onClose }: { column: ColumnDef; sibling_columns: ColumnDef[]; actions: BoardTableActions; onClose: () => void }) {
  const connect_columns = sibling_columns.filter((c) => c.kind === "connect_board");
  const [source_column_id, setSourceColumnId] = useState(column.mirror?.source_column_id ?? connect_columns[0]?.id ?? "");
  const [mirrored_column_id, setMirroredColumnId] = useState(column.mirror?.mirrored_column_id ?? "");
  const [linked_columns, setLinkedColumns] = useState<BoardColumnDto[]>([]);
  const [is_loading, setIsLoading] = useState(false);

  const linked_board_id = connect_columns.find((c) => c.id === source_column_id)?.linked_board_id;

  useEffect(() => {
    if (!linked_board_id) {
      setLinkedColumns([]);
      return;
    }
    setIsLoading(true);
    boardContentService
      .getColumns(Number(linked_board_id))
      .then(setLinkedColumns)
      .finally(() => setIsLoading(false));
  }, [linked_board_id]);

  if (connect_columns.length === 0) {
    return <div className="text-[12.5px] text-boardtree-text-faint">Add a "Connect boards" column to this table first, then come back here to mirror one of its linked columns.</div>;
  }

  return (
    <>
      <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-boardtree-text-faint">Connect-board column</div>
      <div className="mb-3 flex flex-col gap-0.5">
        {connect_columns.map((c) => (
          <button key={c.id} type="button" onClick={() => { setSourceColumnId(c.id); setMirroredColumnId(""); }} className={OPTION_ROW}>
            <span className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border-[1.5px] ${source_column_id === c.id ? "border-boardtree-accent" : "border-boardtree-border"}`}>
              {source_column_id === c.id && <span className="h-2 w-2 rounded-full bg-boardtree-accent" />}
            </span>
            <span className="flex-1 truncate">{c.title}</span>
          </button>
        ))}
      </div>
      <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-boardtree-text-faint">Column to display</div>
      <div className="flex max-h-[180px] flex-col gap-0.5 overflow-y-auto">
        {linked_columns.map((c) => (
          <button key={c.id} type="button" onClick={() => setMirroredColumnId(String(c.id))} className={OPTION_ROW}>
            <span className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border-[1.5px] ${mirrored_column_id === String(c.id) ? "border-boardtree-accent" : "border-boardtree-border"}`}>
              {mirrored_column_id === String(c.id) && <span className="h-2 w-2 rounded-full bg-boardtree-accent" />}
            </span>
            <span className="flex-1 truncate">{c.label}</span>
          </button>
        ))}
        {!is_loading && linked_columns.length === 0 && <div className="px-2.5 py-1.5 text-[12.5px] text-boardtree-text-faint">No columns on the linked board yet.</div>}
        {is_loading && <div className="px-2.5 py-1.5 text-[12.5px] text-boardtree-text-faint">Loading…</div>}
      </div>
      <button
        type="button"
        disabled={!source_column_id || !mirrored_column_id}
        onClick={() => { actions.updateColumnMirror(column.id, { source_column_id, mirrored_column_id }); onClose(); }}
        className={SAVE_BUTTON}
      >
        Save
      </button>
    </>
  );
}
