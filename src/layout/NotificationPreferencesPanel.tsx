"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import { boardMuteService, type MutedBoardDto, type MutedItemDto } from "@/services/board-mute.service";
import { CloseIcon } from "@/icons/workspace-icons";

export type NotificationPreferencesPanelProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
};

/**
 * Small popover opened from the bell drawer's "..." button, lists boards
 * (see `App\Models\BoardNotificationMute`) and items (see
 * `App\Models\BoardItemNotificationMute`) the current user has muted, each
 * with a one-click unmute, and links out to the full per-type notification
 * preferences already built at Profile > Notifications (this panel doesn't
 * duplicate that toggle list, only the board-mute half that has no UI yet).
 */
const NotificationPreferencesPanel: React.FC<NotificationPreferencesPanelProps> = ({ anchor_el, is_open, onClose }) => {
  const [muted_boards, setMutedBoards] = useState<MutedBoardDto[]>([]);
  const [muted_items, setMutedItems] = useState<MutedItemDto[]>([]);
  const [is_loading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!is_open) return;
    setIsLoading(true);
    Promise.all([
      boardMuteService.listMutedBoards().catch((): MutedBoardDto[] => []),
      boardMuteService.listMutedItems().catch((): MutedItemDto[] => []),
    ])
      .then(([boards, items]) => {
        setMutedBoards(boards);
        setMutedItems(items);
      })
      .finally(() => setIsLoading(false));
  }, [is_open]);

  const unmute = (board_id: number) => {
    setMutedBoards((current) => current.filter((board) => board.board_id !== board_id));
    boardMuteService.unmuteBoard(board_id).catch(() => {});
  };

  const unmuteItem = (item: MutedItemDto) => {
    setMutedItems((current) => current.filter((entry) => entry.board_item_id !== item.board_item_id));
    boardMuteService.unmuteItem(item.board_id, item.board_item_id).catch(() => {});
  };

  return (
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} width={280} align="end">
      <div className="p-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[13px] font-bold text-shell-text">Notification settings</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded text-shell-text-muted hover:bg-shell-hover"
            aria-label="Close"
          >
            <CloseIcon size={12} />
          </button>
        </div>

        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-shell-text-faint">Muted boards</div>
        {is_loading && <p className="py-2 text-[12.5px] text-shell-text-muted">Loading…</p>}
        {!is_loading && muted_boards.length === 0 && (
          <p className="py-2 text-[12.5px] text-shell-text-muted">
            You haven&apos;t muted any boards. Mute one from its Board Discussion panel.
          </p>
        )}
        {!is_loading && muted_boards.length > 0 && (
          <ul className="flex flex-col gap-1">
            {muted_boards.map((board) => (
              <li key={board.board_id} className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1.5 hover:bg-shell-hover">
                <span className="truncate text-[12.5px] text-shell-text-secondary">{board.board_name}</span>
                <button
                  type="button"
                  onClick={() => unmute(board.board_id)}
                  className="flex-none text-[11.5px] font-semibold text-[#7fb2ff] hover:text-[#9cc4ff]"
                >
                  Unmute
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-shell-text-faint">Muted items</div>
        {!is_loading && muted_items.length === 0 && (
          <p className="py-2 text-[12.5px] text-shell-text-muted">
            You haven&apos;t muted any items. Use &quot;Mute this item&quot; in a notification&apos;s menu.
          </p>
        )}
        {!is_loading && muted_items.length > 0 && (
          <ul className="shell-scrollbar flex max-h-[180px] flex-col gap-1 overflow-y-auto">
            {muted_items.map((item) => (
              <li key={item.board_item_id} className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1.5 hover:bg-shell-hover">
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] text-shell-text-secondary">{item.item_name}</span>
                  <span className="block truncate text-[11px] text-shell-text-faint">{item.board_name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => unmuteItem(item)}
                  className="flex-none text-[11.5px] font-semibold text-[#7fb2ff] hover:text-[#9cc4ff]"
                >
                  Unmute
                </button>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/profile?section=notifications"
          onClick={onClose}
          className="mt-3 block rounded-lg border border-shell-border px-3 py-2 text-center text-[12.5px] font-semibold text-shell-text-secondary hover:bg-shell-hover"
        >
          Notification preferences
        </Link>
      </div>
    </BoardPopover>
  );
};

export default NotificationPreferencesPanel;
