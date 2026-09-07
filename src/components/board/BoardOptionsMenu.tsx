"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AnchoredMenu, { type AnchoredMenuItem } from "@/components/ui/dropdown/AnchoredMenu";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import {
  ActivityLogIcon,
  ConvertProjectIcon,
  FeedbackIcon,
  FullscreenIcon,
  ImportIcon,
  PowerUpsIcon,
  ReportIcon,
  SettingsGearIcon,
} from "@/icons/board-options-icons";
import {
  ArchiveIcon,
  BellIcon,
  DeleteIcon,
  DuplicateIcon,
  MoreDotsIcon,
  PermissionsIcon,
  RenameIcon,
  WorkspaceTypeIcon,
} from "@/icons/workspace-icons";
import { CommentIcon, DownloadIcon } from "@/icons/board-icons";
import { RestoreIcon } from "@/icons/trash-icons";
import { boardOptionsService } from "@/services/board-options.service";
import type { BoardAccessEntry } from "@/types/board-invitation";
import type { BoardImportCommitResponse } from "@/types/board-import";
import type { BoardType } from "@/types/workspace";
import BoardActivityLogDrawer from "./BoardActivityLogDrawer";
import BoardPermissionsModal from "./BoardPermissionsModal";
import BoardTrashModal from "./BoardTrashModal";
import GiveFeedbackModal from "./GiveFeedbackModal";
import ImportItemsModal from "./import/ImportItemsModal";
import RenameBoardModal from "./RenameBoardModal";

export type BoardOptionsMenuProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;

  board_id: number;
  board_label: string;
  board_type: BoardType;
  /** Whether this board is currently archived — swaps "Archive board" for "Restore from archive". */
  is_archived: boolean;
  /** Whether the current user may archive/delete this board or change its settings — the board's creator, its workspace owner, or an admin. */
  can_manage: boolean;
  /** Scopes "Export board to Excel" to the tab currently open; omitted exports the primary tab. */
  view_id?: number | null;

  access: BoardAccessEntry[];
  onAccessChange: (access: BoardAccessEntry[]) => void;

  /** Opens the board-wide discussion drawer — the "Discussion" row mirrors the header's own comment-icon button. */
  onBoardUpdatesClick?: () => void;
  /** Opens the existing board-type picker, shared by "Settings" and "Permissions". */
  onChangeBoardTypeClick: () => void;
  onRename: (label: string) => Promise<void>;
  /** Duplicates the whole board (every tab, its columns/groups/items) and navigates to the copy. */
  onDuplicate: () => Promise<void>;
  /** "More actions" > "Import items" — fired once a bulk import has actually written rows, so the caller can refresh its columns/groups/items. */
  onImportItems: (result: BoardImportCommitResponse) => void;
  /** Archives the board in place — the board stays open, its menu just flips to "Restore from archive". */
  onArchive: () => Promise<void>;
  /** Un-archives the board in place, from either "Restore from archive" or the trash panel's Archive tab. */
  onUnarchive: () => Promise<void>;
  /** Soft-deletes the board and navigates away — there's no "are you sure" past this dialog's own confirm step. */
  onDelete: () => Promise<void>;
};

type ConfirmKind = "archive" | "delete" | null;

/**
 * The board header's "..." options menu — every row from the approved
 * design except the AI-powered ones (out of scope here). Built on the generic
 * {@link AnchoredMenu} primitive, the same way {@link WorkspaceOptionsMenu}
 * is, and owns every one of its own sub-panels (rename/permissions/activity
 * log/trash/feedback/confirm dialogs) the same self-contained way
 * {@link BoardHeader} already owns its "Board info" popover — the caller
 * only ever supplies raw board data and a handful of mutation callbacks.
 */
const BoardOptionsMenu: React.FC<BoardOptionsMenuProps> = ({
  anchor_el,
  is_open,
  onClose,
  board_id,
  board_label,
  board_type,
  is_archived,
  can_manage,
  view_id,
  access,
  onAccessChange,
  onBoardUpdatesClick,
  onChangeBoardTypeClick,
  onRename,
  onDuplicate,
  onArchive,
  onUnarchive,
  onDelete,
  onImportItems,
}) => {
  const [is_rename_open, setIsRenameOpen] = useState(false);
  const [is_permissions_open, setIsPermissionsOpen] = useState(false);
  const [is_activity_log_open, setIsActivityLogOpen] = useState(false);
  const [is_trash_open, setIsTrashOpen] = useState(false);
  const [is_feedback_open, setIsFeedbackOpen] = useState(false);
  const [is_import_open, setIsImportOpen] = useState(false);
  const [confirm_kind, setConfirmKind] = useState<ConfirmKind>(null);
  const [is_duplicating, setIsDuplicating] = useState(false);
  const [is_fullscreen, setIsFullscreen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  };

  const handleExport = async () => {
    const blob = await boardOptionsService.exportToExcel(board_id, view_id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${board_label.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_export.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      await onDuplicate();
    } finally {
      setIsDuplicating(false);
    }
  };

  const items: AnchoredMenuItem[] = [
    { key: "convert-project", label: "Convert board to project", icon: <ConvertProjectIcon />, onClick: () => { }, disabled: true },
    { key: "activity-log", label: "Activity log", icon: <ActivityLogIcon />, onClick: () => setIsActivityLogOpen(true) },
    ...(onBoardUpdatesClick
      ? ([{ key: "discussion", label: "Discussion", icon: <CommentIcon />, onClick: onBoardUpdatesClick }] satisfies AnchoredMenuItem[])
      : []),
    {
      key: "notifications",
      label: "Notifications",
      icon: <BellIcon />,
      onClick: () => router.push("/profile?section=notifications"),
    },
    { key: "permissions", label: "Permissions", icon: <PermissionsIcon />, onClick: () => setIsPermissionsOpen(true) },
    {
      key: "settings",
      label: "Settings",
      icon: <SettingsGearIcon />,
      onClick: () => { },
      submenu: [
        { key: "rename-board", label: "Rename board", icon: <RenameIcon />, onClick: () => setIsRenameOpen(true) },
        { key: "change-board-type", label: "Change board type", icon: <WorkspaceTypeIcon />, onClick: onChangeBoardTypeClick },
      ],
    },
    {
      key: "more-actions",
      label: "More actions",
      icon: <MoreDotsIcon />,
      onClick: () => { },
      submenu: [
        { key: "save-template", label: "Save as a template", icon: <ReportIcon />, onClick: () => { }, disabled: true },
        { key: "build-report", label: "Build a report from board", icon: <ReportIcon />, onClick: () => { }, disabled: true },
        { key: "export-excel", label: "Export board to Excel", icon: <DownloadIcon />, onClick: () => void handleExport() },
        { key: "import-items", label: "Import items", icon: <ImportIcon />, onClick: () => setIsImportOpen(true) },
        {
          key: "duplicate-board",
          label: is_duplicating ? "Duplicating…" : "Duplicate board",
          icon: <DuplicateIcon />,
          onClick: () => void handleDuplicate(),
          disabled: is_duplicating,
        },
        { key: "full-screen", label: is_fullscreen ? "Exit full screen" : "Full screen", icon: <FullscreenIcon />, onClick: handleToggleFullscreen },
      ],
    },
    {
      key: "archive-board",
      label: is_archived ? "Restore from archive" : "Archive board",
      icon: <ArchiveIcon />,
      onClick: () => (is_archived ? void onUnarchive() : setConfirmKind("archive")),
      disabled: !can_manage,
    },
    {
      key: "delete-board",
      label: "Delete board",
      icon: <DeleteIcon />,
      onClick: () => setConfirmKind("delete"),
      disabled: !can_manage,
      danger: true,
    },
    { key: "view-trash", label: "View archive / trash", icon: <RestoreIcon />, onClick: () => setIsTrashOpen(true) },
    { key: "give-feedback", label: "Give feedback", icon: <FeedbackIcon />, onClick: () => setIsFeedbackOpen(true) },
  ];

  return (
    <>
      <AnchoredMenu anchor_el={anchor_el} is_open={is_open} onClose={onClose} items={items} width={240} align="end" />

      <RenameBoardModal is_open={is_rename_open} initial_label={board_label} onSubmit={onRename} onClose={() => setIsRenameOpen(false)} />

      <BoardPermissionsModal
        is_open={is_permissions_open}
        onClose={() => setIsPermissionsOpen(false)}
        board_id={board_id}
        board_type={board_type}
        can_manage={can_manage}
        access={access}
        onAccessChange={onAccessChange}
        onChangeBoardTypeClick={() => {
          setIsPermissionsOpen(false);
          onChangeBoardTypeClick();
        }}
      />

      <BoardActivityLogDrawer board_id={board_id} is_open={is_activity_log_open} onClose={() => setIsActivityLogOpen(false)} />

      <BoardTrashModal board_id={board_id} is_open={is_trash_open} onClose={() => setIsTrashOpen(false)} />

      <GiveFeedbackModal
        is_open={is_feedback_open}
        onClose={() => setIsFeedbackOpen(false)}
        onSubmit={(message) => boardOptionsService.submitFeedback(message, board_id)}
      />

      <ImportItemsModal
        is_open={is_import_open}
        onClose={() => setIsImportOpen(false)}
        board_id={board_id}
        view_id={view_id ?? null}
        onImported={onImportItems}
      />

      <ConfirmActionModal
        is_open={confirm_kind === "archive"}
        title="Archive this board?"
        description={`"${board_label}" will be hidden from the sidebar. You can bring it back anytime from "View archive / trash".`}
        confirm_label="Archive board"
        onConfirm={onArchive}
        onClose={() => setConfirmKind(null)}
      />

      <ConfirmActionModal
        is_open={confirm_kind === "delete"}
        title="Delete this board?"
        description={`"${board_label}" and everything on it will be moved to the trash. You can still restore it from there.`}
        confirm_label="Delete board"
        danger
        onConfirm={onDelete}
        onClose={() => setConfirmKind(null)}
      />
    </>
  );
};

export default BoardOptionsMenu;
