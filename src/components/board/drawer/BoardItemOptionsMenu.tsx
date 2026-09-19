"use client";
import React, { useRef, useState } from "react";
import AnchoredMenu, { type AnchoredMenuItem } from "@/components/ui/dropdown/AnchoredMenu";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { DownloadIcon } from "@/icons/board-icons";
import { ArchiveIcon, ChevronRightIcon, DeleteIcon, LinkIcon, MoreDotsIcon, MoveToIcon } from "@/icons/workspace-icons";
import MoveItemModal, { type MoveItemModalMode } from "./MoveItemModal";
import type { BoardItemDrawerApi } from "./types";

export type BoardItemOptionsMenuProps<TRow> = {
  drawer: BoardItemDrawerApi<TRow>;
  /** Closes the drawer after an action removes the open item from the board (archive, delete, move to board). */
  onItemRemoved: () => void;
};

/**
 * The item drawer header's "…" menu: Export updates to Excel, Move to (group
 * or board), Copy item link, Archive and Delete. Each row only shows up when
 * the drawer's caller has wired the matching capability (see
 * {@link BoardItemDrawerConfig}), so a local-only board such as Client Hub,
 * or a subitem, simply gets a shorter menu, and renders nothing at all when
 * no row applies.
 */
function BoardItemOptionsMenu<TRow>({ drawer, onItemRemoved }: BoardItemOptionsMenuProps<TRow>) {
  const [is_menu_open, setIsMenuOpen] = useState(false);
  const [move_mode, setMoveMode] = useState<MoveItemModalMode | null>(null);
  const [is_archive_confirm_open, setIsArchiveConfirmOpen] = useState(false);
  const [is_delete_confirm_open, setIsDeleteConfirmOpen] = useState(false);
  const button_ref = useRef<HTMLButtonElement>(null);

  const is_api_backed = drawer.board_id !== undefined;
  const can_move_to_group = drawer.is_top_level_row && !!drawer.onMoveItemToGroup && !!drawer.move_group_options?.length;
  const can_move_to_board = drawer.is_top_level_row && is_api_backed && !!drawer.onMoveItemToBoard;
  const can_archive = drawer.is_top_level_row && !!drawer.onArchiveItem;
  const can_delete = !!drawer.onDeleteItem;

  const move_submenu: AnchoredMenuItem[] = [
    ...(can_move_to_group
      ? [{ key: "move-to-group", label: "Move to group", icon: <MoveToIcon size={14} />, onClick: () => setMoveMode("group") }]
      : []),
    ...(can_move_to_board
      ? [{ key: "move-to-board", label: "Move to board", icon: <MoveToIcon size={14} />, onClick: () => setMoveMode("board") }]
      : []),
  ];

  const items: AnchoredMenuItem[] = [
    ...(is_api_backed
      ? [
          {
            key: "export-updates",
            label: "Export updates to Excel",
            icon: <DownloadIcon size={14} />,
            onClick: () => void drawer.exportUpdates(),
          },
        ]
      : []),
    ...(move_submenu.length > 0
      ? [
          {
            key: "move-to",
            label: "Move to",
            icon: <MoveToIcon size={14} />,
            onClick: () => {},
            submenu: move_submenu,
            trailing: <ChevronRightIcon size={11} className="text-shell-text-muted" />,
          },
        ]
      : []),
    ...(is_api_backed
      ? [{ key: "copy-item-link", label: "Copy item link", icon: <LinkIcon size={14} />, onClick: () => void drawer.copyItemLink() }]
      : []),
    ...(can_archive
      ? [{ key: "archive", label: "Archive", icon: <ArchiveIcon size={14} />, onClick: () => setIsArchiveConfirmOpen(true) }]
      : []),
    ...(can_delete
      ? [
          {
            key: "delete",
            label: "Delete",
            icon: <DeleteIcon size={14} />,
            onClick: () => setIsDeleteConfirmOpen(true),
            danger: true,
          },
        ]
      : []),
  ];

  if (items.length === 0) return null;

  // A failed request throws so `ConfirmActionModal` keeps itself open and
  // shows the message inline; on success it closes itself.
  const confirmRemoval = async (runAction: () => Promise<boolean>, failure_message: string) => {
    if (!(await runAction())) throw new Error(failure_message);
    onItemRemoved();
  };

  return (
    <>
      <button
        ref={button_ref}
        type="button"
        onClick={() => setIsMenuOpen((is_open) => !is_open)}
        aria-label="Item options"
        aria-haspopup="menu"
        aria-expanded={is_menu_open}
        className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
      >
        <MoreDotsIcon size={18} />
      </button>

      <AnchoredMenu
        anchor_el={button_ref.current}
        is_open={is_menu_open}
        onClose={() => setIsMenuOpen(false)}
        items={items}
        width={240}
        align="end"
      />

      <MoveItemModal
        is_open={move_mode !== null}
        mode={move_mode ?? "group"}
        item_title={drawer.open_row_title}
        board_id={drawer.board_id}
        group_options={drawer.move_group_options ?? []}
        current_group_id={drawer.current_group_id}
        onMoveToGroup={drawer.moveItemToGroup}
        onMoveToBoard={async (target_board_id, target_group_id) => {
          const did_move = await drawer.moveItemToBoard(target_board_id, target_group_id);
          if (did_move) onItemRemoved();
          return did_move;
        }}
        onClose={() => setMoveMode(null)}
      />

      <ConfirmActionModal
        is_open={is_archive_confirm_open}
        title="Archive item"
        description="This item and its subitems will be hidden from the board. You can restore it later from the board's archive."
        confirm_label="Archive"
        onClose={() => setIsArchiveConfirmOpen(false)}
        onConfirm={() => confirmRemoval(drawer.archiveItem, "Couldn't archive this item. Please try again.")}
      />

      <ConfirmActionModal
        is_open={is_delete_confirm_open}
        title="Delete item"
        description="Are you sure you want to delete this item? Its subitems will be deleted too."
        confirm_label="Delete"
        variant="danger"
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => confirmRemoval(drawer.deleteItem, "Couldn't delete this item. Please try again.")}
      />
    </>
  );
}

export default BoardItemOptionsMenu;
