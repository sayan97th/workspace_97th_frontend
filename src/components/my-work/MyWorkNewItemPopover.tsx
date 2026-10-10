"use client";
import React, { useEffect, useMemo, useState } from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import { fmtDateShort } from "@/components/board/table/dateUtils";
import { getApiErrorMessage } from "@/lib/api-error";
import { personalService } from "@/services/personal.service";
import type { CreateMyWorkItemPayload, MyWorkBoardDto } from "@/types/personal";

export type MyWorkNewItemTarget = {
  anchor_el: HTMLElement;
  /** Due date of the section the item was added from. */
  date: string | null;
  /** Board to preselect, the section's own board in Board view. */
  board_id: number | null;
};

type MyWorkNewItemPopoverProps = {
  target: MyWorkNewItemTarget | null;
  /** Board the user created their last item on, preselected when the section has none. */
  last_board_id: number | null;
  onClose: () => void;
  onCreate: (payload: CreateMyWorkItemPayload) => Promise<boolean>;
};

/** Boards only change when the user creates or joins one, so one load per page visit is enough. */
let boards_cache: MyWorkBoardDto[] | null = null;

/**
 * "New item" and "+ Add item": names the item and picks the board it goes on.
 * The API assigns it to the user and gives it the section's due date, so it
 * shows up in the section it was added from.
 */
const MyWorkNewItemPopover: React.FC<MyWorkNewItemPopoverProps> = ({ target, last_board_id, onClose, onCreate }) => {
  const [boards, setBoards] = useState<MyWorkBoardDto[] | null>(boards_cache);
  const [load_error, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [board_id, setBoardId] = useState<number | null>(null);
  const [is_saving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!target || boards_cache) return;
    let is_current = true;
    personalService
      .getMyWorkBoards()
      .then((result) => {
        boards_cache = result;
        if (is_current) setBoards(result);
      })
      .catch((error) => {
        if (is_current) setLoadError(getApiErrorMessage(error, "We couldn't load your boards."));
      });
    return () => {
      is_current = false;
    };
  }, [target]);

  // A fresh form each time the popover opens.
  useEffect(() => {
    if (target) {
      setName("");
      setBoardId(null);
    }
  }, [target]);

  const selected_board_id = useMemo(() => {
    const candidates = [board_id, target?.board_id ?? null, last_board_id];
    return candidates.find((id) => id !== null && boards?.some((board) => board.id === id)) ?? boards?.[0]?.id ?? null;
  }, [board_id, target, last_board_id, boards]);

  const boards_by_workspace = useMemo(() => {
    const grouped = new Map<string, MyWorkBoardDto[]>();
    for (const board of boards ?? []) {
      const workspace_name = board.workspace?.name ?? "Other boards";
      grouped.set(workspace_name, [...(grouped.get(workspace_name) ?? []), board]);
    }
    return [...grouped.entries()];
  }, [boards]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed_name = name.trim();
    if (!trimmed_name || selected_board_id === null || is_saving) return;

    setIsSaving(true);
    const is_created = await onCreate({ board_id: selected_board_id, name: trimmed_name, date: target?.date ?? null });
    setIsSaving(false);
    if (is_created) onClose();
  };

  const field_class =
    "h-9 w-full rounded border border-[var(--mw-control-border)] bg-transparent px-3 text-board-cell text-[var(--mw-text)] outline-none transition-colors hover:border-[var(--mw-text)] focus:border-[var(--mw-accent)]";

  return (
    <BoardPopover anchor_el={target?.anchor_el ?? null} is_open={target !== null} onClose={onClose} width={320} align="start">
      <form onSubmit={submit} className="my-work-theme flex flex-col gap-3 rounded-lg p-4" aria-label="Create a new item">
        <div>
          <h2 className="text-board-nav font-semibold">New item</h2>
          <p className="text-board-caption text-[var(--mw-text-secondary)]">
            {target?.date ? `Assigned to you and due ${fmtDateShort(target.date)}.` : "Assigned to you, without a date."}
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-board-caption text-[var(--mw-text-secondary)]">Item name</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={255}
            placeholder="What needs to be done?"
            className={field_class}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-board-caption text-[var(--mw-text-secondary)]">Board</span>
          {load_error ? (
            <span className="text-board-caption text-[#d83a52]">{load_error}</span>
          ) : boards === null ? (
            <span className="text-board-caption text-[var(--mw-text-faint)]">Loading boards...</span>
          ) : boards.length === 0 ? (
            <span className="text-board-caption text-[var(--mw-text-faint)]">You can't add items to any board yet.</span>
          ) : (
            <select value={selected_board_id ?? ""} onChange={(event) => setBoardId(Number(event.target.value))} className={field_class}>
              {boards_by_workspace.map(([workspace_name, workspace_boards]) => (
                <optgroup key={workspace_name} label={workspace_name}>
                  {workspace_boards.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="my-work-ghost-button text-board-cell">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || selected_board_id === null || is_saving}
            className="my-work-primary-button text-board-cell"
          >
            {is_saving ? "Creating..." : "Create item"}
          </button>
        </div>
      </form>
    </BoardPopover>
  );
};

export default MyWorkNewItemPopover;
