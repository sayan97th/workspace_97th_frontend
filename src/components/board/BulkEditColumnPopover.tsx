"use client";
import React, { useState } from "react";
import BoardPopover from "./toolbar/BoardPopover";
import type { CellValue, ColumnDef, ColumnKind, PersonDef } from "./table/types";

export type BulkEditColumnPopoverProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  /** Every column on the current tab, filtered by the caller to the bulk-editable kinds this popover supports. */
  columns: ColumnDef[];
  people: PersonDef[];
  onSave: (column_id: string, value: CellValue) => void;
  onClose: () => void;
};

/** Kinds this popover can drive a value input for — richer kinds (files, dependency, formula, mirror, timeline, time_tracking, auto_number) need per-row context this bulk action doesn't have, so the column picker itself only ever offers these. */
export const BULK_EDITABLE_KINDS: ColumnKind[] = ["text", "longtext", "phone", "email", "number", "status", "label", "dropdown", "checkbox", "date", "people"];

const ROW = "flex h-9 w-full items-center gap-2.5 rounded-[6px] px-2.5 text-left text-[13px] text-boardtree-text hover:bg-boardtree-hover";

/**
 * Selection action bar's "Edit column" — picks one column (restricted to
 * {@link BULK_EDITABLE_KINDS}) and a value for it, then applies that value to
 * every currently-selected row in one request (`TableBoardView`'s
 * `handleBulkEditColumn` → `boardContentService.bulkSetColumnValue`).
 */
export default function BulkEditColumnPopover({ anchor_el, is_open, columns, people, onSave, onClose }: BulkEditColumnPopoverProps) {
  const [column, setColumn] = useState<ColumnDef | null>(null);

  if (!is_open) return null;

  return (
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={() => { setColumn(null); onClose(); }} align="start" width={260}>
      {!column ? (
        <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto p-1.5">
          {columns.length === 0 && <div className="px-2.5 py-2 text-[12.5px] text-boardtree-text-faint">No editable columns on this table.</div>}
          {columns.map((c) => (
            <button key={c.id} type="button" onClick={() => setColumn(c)} className={ROW}>
              <span className="flex-1 truncate">{c.title}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="p-2.5">
          <div className="mb-2 flex items-center gap-1.5 px-0.5">
            <button type="button" onClick={() => setColumn(null)} className="flex h-6 w-6 flex-none items-center justify-center rounded-[5px] text-boardtree-text-muted hover:bg-boardtree-hover">
              <svg viewBox="0 0 12 12" width="10" height="10"><path d="M7.5 3 L4.3 6 L7.5 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <span className="truncate text-[13px] font-semibold text-boardtree-text">{column.title}</span>
          </div>
          <BulkValueInput column={column} people={people} onSave={(value) => { onSave(column.id, value); setColumn(null); onClose(); }} />
        </div>
      )}
    </BoardPopover>
  );
}

function BulkValueInput({ column, people, onSave }: { column: ColumnDef; people: PersonDef[]; onSave: (value: CellValue) => void }) {
  const [text, setText] = useState("");
  const [multi, setMulti] = useState<string[]>([]);

  if (column.kind === "text" || column.kind === "longtext" || column.kind === "phone" || column.kind === "email") {
    return (
      <div className="flex items-center gap-2">
        {column.kind === "longtext" ? (
          <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={3} className="h-20 w-full resize-none rounded-[6px] border border-boardtree-border px-2.5 py-1.5 text-[13px] text-boardtree-text outline-none focus:border-boardtree-accent" />
        ) : (
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} className="h-9 w-full rounded-[6px] border border-boardtree-border px-2.5 text-[13px] text-boardtree-text outline-none focus:border-boardtree-accent" />
        )}
      </div>
    );
  }

  if (column.kind === "number") {
    return (
      <>
        <input autoFocus type="number" value={text} onChange={(e) => setText(e.target.value)} className="mb-2 h-9 w-full rounded-[6px] border border-boardtree-border px-2.5 text-[13px] text-boardtree-text outline-none focus:border-boardtree-accent" />
        <SaveButton onClick={() => onSave(text)} disabled={text.trim() === ""} />
      </>
    );
  }

  if (column.kind === "date") {
    return (
      <>
        <input autoFocus type="date" value={text} onChange={(e) => setText(e.target.value)} className="mb-2 h-9 w-full rounded-[6px] border border-boardtree-border px-2.5 text-[13px] text-boardtree-text outline-none focus:border-boardtree-accent" />
        <SaveButton onClick={() => onSave(text)} disabled={text.trim() === ""} />
      </>
    );
  }

  if (column.kind === "checkbox") {
    return (
      <div className="flex flex-col gap-0.5">
        <button type="button" onClick={() => onSave(true)} className={ROW}>Checked</button>
        <button type="button" onClick={() => onSave(false)} className={ROW}>Unchecked</button>
      </div>
    );
  }

  if (column.kind === "status" || column.kind === "label") {
    return (
      <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
        {(column.options ?? []).map((option) => (
          <button key={option.id} type="button" onClick={() => onSave(option.id)} className={ROW}>
            <span className="h-3 w-3 flex-none rounded-full" style={{ background: option.color }} />
            <span className="flex-1 truncate">{option.label || "(blank)"}</span>
          </button>
        ))}
      </div>
    );
  }

  if (column.kind === "dropdown") {
    return (
      <>
        <div className="mb-2 flex max-h-44 flex-col gap-0.5 overflow-y-auto">
          {(column.options ?? []).map((option) => {
            const is_on = multi.includes(option.id);
            return (
              <button key={option.id} type="button" onClick={() => setMulti((cur) => (is_on ? cur.filter((x) => x !== option.id) : [...cur, option.id]))} className={ROW}>
                <span className={`h-3.5 w-3.5 flex-none rounded-[3px] border-[1.5px] ${is_on ? "border-boardtree-accent bg-boardtree-accent" : "border-boardtree-border"}`} />
                <span className="flex-1 truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
        <SaveButton onClick={() => onSave(multi)} disabled={multi.length === 0} />
      </>
    );
  }

  if (column.kind === "people") {
    return (
      <>
        <div className="mb-2 flex max-h-44 flex-col gap-0.5 overflow-y-auto">
          {people.map((person) => {
            const is_on = multi.includes(person.id);
            return (
              <button key={person.id} type="button" onClick={() => setMulti((cur) => (is_on ? cur.filter((x) => x !== person.id) : [...cur, person.id]))} className={ROW}>
                <span className={`h-3.5 w-3.5 flex-none rounded-[3px] border-[1.5px] ${is_on ? "border-boardtree-accent bg-boardtree-accent" : "border-boardtree-border"}`} />
                <span className="flex-1 truncate">{person.name}</span>
              </button>
            );
          })}
        </div>
        <SaveButton onClick={() => onSave(multi)} disabled={multi.length === 0} />
      </>
    );
  }

  return null;
}

function SaveButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="flex h-8 w-full items-center justify-center rounded-[6px] bg-boardtree-accent text-[13px] font-medium text-white hover:bg-boardtree-accent-hover disabled:opacity-40">
      Apply to selection
    </button>
  );
}
