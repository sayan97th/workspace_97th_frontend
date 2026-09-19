"use client";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/icons/workspace-icons";
import { boardContentService } from "@/services/board-content.service";
import type { BoardItemMoveTargetDto } from "@/types/board-content";
import type { DrawerMoveGroupOption } from "./types";

export type MoveItemModalMode = "group" | "board";

export type MoveItemModalProps = {
  is_open: boolean;
  mode: MoveItemModalMode;
  item_title: string;
  /** The board the item currently lives on, only used to load the "Move to board" targets. */
  board_id: number | undefined;
  /** Tables of the current board, for "Move to group". */
  group_options: DrawerMoveGroupOption[];
  /** The item's current table, left out of the "Move to group" list. */
  current_group_id: string | null;
  onMoveToGroup: (group_id: string) => Promise<boolean>;
  onMoveToBoard: (target_board_id: number, target_group_id: number) => Promise<boolean>;
  onClose: () => void;
};

const SELECT_CLASS_NAME =
  "w-full rounded-lg border border-shell-border-strong bg-shell-bg px-3.5 py-2.5 text-[13.5px] text-shell-text outline-none focus:border-brand-500 disabled:cursor-default disabled:opacity-60";

/**
 * Item drawer's "Move to" dialogs. In `"group"` mode it picks another table of
 * the same board; in `"board"` mode it picks another board of the workspace
 * (loaded from `GET /boards/{id}/move-targets`) and then one of that board's
 * tables. Stays open with an inline error when the move fails, and closes
 * itself on success.
 */
const MoveItemModal: React.FC<MoveItemModalProps> = ({
  is_open,
  mode,
  item_title,
  board_id,
  group_options,
  current_group_id,
  onMoveToGroup,
  onMoveToBoard,
  onClose,
}) => {
  const [board_targets, setBoardTargets] = useState<BoardItemMoveTargetDto[]>([]);
  const [is_loading_targets, setIsLoadingTargets] = useState(false);
  const [selected_board_id, setSelectedBoardId] = useState("");
  const [selected_group_id, setSelectedGroupId] = useState("");
  const [is_submitting, setIsSubmitting] = useState(false);
  const [error_message, setErrorMessage] = useState<string | null>(null);

  const other_groups = useMemo(
    () => group_options.filter((group) => group.id !== current_group_id),
    [group_options, current_group_id]
  );

  const selected_board = board_targets.find((target) => String(target.id) === selected_board_id) ?? null;
  const available_groups: DrawerMoveGroupOption[] =
    mode === "group"
      ? other_groups
      : (selected_board?.groups ?? []).map((group) => ({ id: String(group.id), label: group.name }));

  useEffect(() => {
    if (!is_open) return;
    setIsSubmitting(false);
    setErrorMessage(null);
    setSelectedBoardId("");
    setSelectedGroupId(mode === "group" ? (other_groups[0]?.id ?? "") : "");

    if (mode !== "board" || board_id === undefined) return;
    let is_cancelled = false;
    setIsLoadingTargets(true);
    boardContentService
      .getItemMoveTargets(board_id)
      .then((targets) => {
        if (is_cancelled) return;
        setBoardTargets(targets);
        setSelectedBoardId(targets[0] ? String(targets[0].id) : "");
        setSelectedGroupId(targets[0]?.groups[0] ? String(targets[0].groups[0].id) : "");
      })
      .catch(() => {
        if (!is_cancelled) setErrorMessage("Couldn't load the boards. Please try again.");
      })
      .finally(() => {
        if (!is_cancelled) setIsLoadingTargets(false);
      });
    return () => {
      is_cancelled = true;
    };
    // `other_groups` is intentionally read only at open time: re-seeding the picker mid-dialog would discard the viewer's own choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is_open, mode, board_id]);

  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !is_submitting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, is_submitting, onClose]);

  if (!is_open) return null;

  const handleBoardChange = (next_board_id: string) => {
    setSelectedBoardId(next_board_id);
    const next_board = board_targets.find((target) => String(target.id) === next_board_id);
    setSelectedGroupId(next_board?.groups[0] ? String(next_board.groups[0].id) : "");
  };

  const handleSubmit = async () => {
    if (!selected_group_id) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    const did_move =
      mode === "group"
        ? await onMoveToGroup(selected_group_id)
        : await onMoveToBoard(Number(selected_board_id), Number(selected_group_id));
    setIsSubmitting(false);
    if (did_move) onClose();
    else setErrorMessage("Couldn't move this item. Please try again.");
  };

  const title = mode === "group" ? "Move to group" : "Move to board";
  const is_empty = mode === "group" ? other_groups.length === 0 : !is_loading_targets && board_targets.length === 0;
  const empty_message =
    mode === "group"
      ? "There are no other groups on this board to move this item to."
      : "There are no other boards in this workspace you can move this item to.";

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[420] flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-[#060e0e]/[0.68]"
        onClick={() => !is_submitting && onClose()}
        aria-hidden="true"
      />

      <div className="relative z-[421] w-[440px] max-w-full overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-2xl">
        <div className="flex items-center justify-between border-b border-shell-border px-[22px] py-4">
          <span className="text-base font-semibold tracking-[-0.01em]">{title}</span>
          <button
            type="button"
            onClick={onClose}
            disabled={is_submitting}
            aria-label="Close"
            className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-[22px] py-5">
          <p className="truncate text-[13px] text-shell-text-muted">
            Item: <span className="font-semibold text-shell-text-secondary">{item_title}</span>
          </p>

          {is_loading_targets && <p className="text-[13px] text-shell-text-faint">Loading boards…</p>}

          {is_empty && !error_message && <p className="text-[13.5px] text-shell-text-secondary">{empty_message}</p>}

          {!is_empty && !is_loading_targets && (
            <>
              {mode === "board" && (
                <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-shell-text-muted">
                  Board
                  <select
                    value={selected_board_id}
                    onChange={(event) => handleBoardChange(event.target.value)}
                    disabled={is_submitting}
                    className={SELECT_CLASS_NAME}
                  >
                    {board_targets.map((target) => (
                      <option key={target.id} value={target.id}>
                        {target.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-shell-text-muted">
                Group
                <select
                  value={selected_group_id}
                  onChange={(event) => setSelectedGroupId(event.target.value)}
                  disabled={is_submitting}
                  className={SELECT_CLASS_NAME}
                >
                  {available_groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.label}
                    </option>
                  ))}
                </select>
              </label>
              {mode === "board" && (
                <p className="text-[12.5px] leading-relaxed text-shell-text-faint">
                  Updates, files and subitems move with the item. Column values are kept only where the other board has
                  a column with the same name and type.
                </p>
              )}
            </>
          )}

          {error_message && (
            <div className="rounded-[10px] border border-[#e2445c] bg-[rgba(226,68,92,0.12)] px-3.5 py-2.5 text-[12.5px] font-semibold text-[#e2445c]">
              {error_message}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-shell-border px-[22px] py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={is_submitting}
            className="rounded-lg px-3.5 py-2.5 text-[13.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={is_submitting || is_loading_targets || is_empty || !selected_group_id}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-default disabled:opacity-50"
          >
            {is_submitting ? "Moving…" : "Move"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MoveItemModal;
