"use client";
import React, { useEffect, useState } from "react";
import { CopyPlus, Power, PowerOff, Trash2, X } from "lucide-react";
import type { BoardAutomationBulkAction, BoardAutomationCopyResult } from "@/types/board-automation";
import { boardContentService } from "@/services/board-content.service";
import { PickerList } from "../../automations/builder/builderUi";
import { useOutsideClick } from "../../table/useOutsideClick";

export type BulkActionBarProps = {
  board_id: number;
  selected_count: number;
  is_busy: boolean;
  onBulk: (action: BoardAutomationBulkAction) => void;
  onCopy: (target_board_id: number) => Promise<BoardAutomationCopyResult | null>;
  onClear: () => void;
};

const BAR_BUTTON = "flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-[12.5px] text-boardtree-text hover:bg-boardtree-hover disabled:opacity-40";

/** The boards of the workspace automations can be copied to, loaded once the picker opens. */
function CopyTargetPicker({ board_id, onPick }: { board_id: number; onPick: (target_board_id: number) => void }) {
  const [boards, setBoards] = useState<{ id: string; label: string }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    boardContentService
      .getItemMoveTargets(board_id)
      .then((targets) => {
        if (!cancelled) setBoards(targets.map((target) => ({ id: String(target.id), label: target.label })));
      })
      .catch(() => {
        if (!cancelled) setBoards([]);
      });
    return () => {
      cancelled = true;
    };
  }, [board_id]);

  if (boards === null) return <div className="px-2 py-3 text-[12.5px] text-boardtree-text-faint">Loading boards...</div>;
  return <PickerList sections={[{ entries: boards }]} selected={null} onPick={(id) => onPick(Number(id))} placeholder="Search boards" empty_text="There is no other board you can edit." />;
}

/**
 * Shown while automations are selected in Manage: turn them on or off, copy them to another
 * board, or delete them, like monday's bulk actions.
 */
export default function BulkActionBar({ board_id, selected_count, is_busy, onBulk, onCopy, onClear }: BulkActionBarProps) {
  const [is_copy_open, setIsCopyOpen] = useState(false);
  const [is_confirming_delete, setIsConfirmingDelete] = useState(false);
  const [copy_result, setCopyResult] = useState<BoardAutomationCopyResult | null>(null);
  const copy_ref = useOutsideClick<HTMLDivElement>(is_copy_open, () => setIsCopyOpen(false));

  const unmapped = copy_result?.data.flatMap((entry) => entry.unmapped) ?? [];

  return (
    <div className="mb-3">
      <div role="toolbar" aria-label="Selected automations" className="flex flex-wrap items-center gap-1 rounded-[8px] border border-boardtree-accent/40 bg-boardtree-accent-surface px-2 py-1.5">
        <span className="mr-2 px-1 text-[13px] font-medium text-boardtree-text">{selected_count} selected</span>
        <button type="button" disabled={is_busy} onClick={() => onBulk("enable")} className={BAR_BUTTON}>
          <Power size={14} />
          Turn on
        </button>
        <button type="button" disabled={is_busy} onClick={() => onBulk("disable")} className={BAR_BUTTON}>
          <PowerOff size={14} />
          Turn off
        </button>
        <div ref={copy_ref} className="relative">
          <button type="button" disabled={is_busy} onClick={() => setIsCopyOpen((open) => !open)} aria-haspopup="dialog" aria-expanded={is_copy_open} className={BAR_BUTTON}>
            <CopyPlus size={14} />
            Copy to board
          </button>
          {is_copy_open && (
            <div role="dialog" aria-label="Copy to another board" className="absolute left-0 top-full z-30 mt-1 w-[280px] rounded-[8px] border border-boardtree-border bg-boardtree-surface p-2 shadow-[0_10px_28px_rgba(30,34,55,0.18)]">
              <div className="mb-1.5 px-1 text-[11.5px] leading-snug text-boardtree-text-faint">Columns, labels and groups are matched by name. The copies start turned off.</div>
              <CopyTargetPicker
                board_id={board_id}
                onPick={async (target_board_id) => {
                  setIsCopyOpen(false);
                  setCopyResult(await onCopy(target_board_id));
                }}
              />
            </div>
          )}
        </div>
        {is_confirming_delete ? (
          <span className="flex items-center gap-1.5">
            <span className="text-[12.5px] text-boardtree-danger">Delete {selected_count}?</span>
            <button type="button" disabled={is_busy} onClick={() => { setIsConfirmingDelete(false); onBulk("delete"); }} className="h-7 rounded-[6px] bg-boardtree-danger px-2.5 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-40">
              Delete
            </button>
            <button type="button" onClick={() => setIsConfirmingDelete(false)} className="h-7 rounded-[6px] px-2 text-[12px] text-boardtree-text-secondary hover:bg-boardtree-hover">
              Cancel
            </button>
          </span>
        ) : (
          <button type="button" disabled={is_busy} onClick={() => setIsConfirmingDelete(true)} className={`${BAR_BUTTON} text-boardtree-danger`}>
            <Trash2 size={14} />
            Delete
          </button>
        )}
        <button type="button" onClick={onClear} aria-label="Clear selection" className="ml-auto flex h-8 w-8 items-center justify-center rounded-[6px] text-boardtree-text-muted hover:bg-boardtree-hover">
          <X size={15} />
        </button>
      </div>

      {copy_result && (
        <div role="status" className="mt-2 rounded-[8px] border border-boardtree-border-soft bg-boardtree-surface px-3 py-2 text-[12.5px] text-boardtree-text-secondary">
          <div className="flex items-start justify-between gap-2">
            <span>{copy_result.message}</span>
            <button type="button" onClick={() => setCopyResult(null)} aria-label="Dismiss" className="flex-none text-boardtree-text-muted hover:text-boardtree-text">
              <X size={14} />
            </button>
          </div>
          {unmapped.length > 0 && (
            <div className="mt-1 text-boardtree-text-muted">
              Nothing matched {Array.from(new Set(unmapped)).slice(0, 6).join(", ")}{unmapped.length > 6 ? ", and more" : ""}. Choose those again on &quot;{copy_result.target_board.label}&quot; before turning the copies on.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
