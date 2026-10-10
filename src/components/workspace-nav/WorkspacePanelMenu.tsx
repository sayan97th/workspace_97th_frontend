"use client";
import React from "react";
import ActionMenu, { type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import {
  ArchiveIcon,
  ArrowRightIcon,
  BrowseAllIcon,
  DeleteIcon,
  EditWorkspaceIcon,
  MagicWandIcon,
  ManageWorkspaceIcon,
  PencilIcon,
  PlusIcon,
  RenameIcon,
  WorkspaceTypeIcon,
} from "@/icons/workspace-icons";

/** Sidebar level actions that don't need the workspace's own dialogs (navigation, other workspaces, archive and trash). */
export type WorkspacePanelActions = {
  /** Opens Manage Workspace; the row is disabled when omitted (e.g. while the tree is still loading). */
  onManage?: () => void;
  onAddWorkspace: () => void;
  onBrowseAll: () => void;
  onOpenArchive: () => void;
  onOpenTrash: () => void;
};

export type WorkspacePanelMenuProps = WorkspacePanelActions & {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  /** Owner only rows (Edit workspace, Delete workspace) stay visible but disabled for everyone else. */
  can_manage: boolean;
  onEdit: () => void;
  onRename: () => void;
  onChangeType: () => void;
  onDelete: () => void;
};

const OWNER_ONLY_REASON = "Only workspace owners can do this";
const NOT_AVAILABLE_REASON = "Not available yet";

/**
 * The sidebar panel header's "..." menu, laid out like monday.com's workspace
 * menu: workspace actions first, then other workspaces and the archive/trash.
 * Rows the viewer can't use stay visible but faded, so the menu keeps the
 * same shape for every role.
 */
const WorkspacePanelMenu: React.FC<WorkspacePanelMenuProps> = ({
  anchor_el,
  is_open,
  onClose,
  can_manage,
  onManage,
  onEdit,
  onRename,
  onChangeType,
  onDelete,
  onAddWorkspace,
  onBrowseAll,
  onOpenArchive,
  onOpenTrash,
}) => {
  const sections: ActionMenuSection[] = [
    {
      key: "workspace",
      items: [
        {
          key: "manage",
          label: "Manage workspace",
          icon: <ManageWorkspaceIcon />,
          onClick: onManage,
          disabled: !onManage,
        },
        {
          key: "edit",
          label: "Edit workspace",
          icon: <PencilIcon />,
          disabled: !can_manage,
          disabled_reason: OWNER_ONLY_REASON,
          submenu: [
            { key: "edit-details", label: "Edit details", icon: <EditWorkspaceIcon size={16} />, onClick: onEdit },
            { key: "rename", label: "Rename workspace", icon: <RenameIcon size={16} />, onClick: onRename },
            { key: "change-type", label: "Change type", icon: <WorkspaceTypeIcon size={16} />, onClick: onChangeType },
          ],
        },
        {
          key: "move",
          label: "Move workspace",
          icon: <ArrowRightIcon />,
          disabled: true,
          disabled_reason: NOT_AVAILABLE_REASON,
        },
        {
          key: "save-template",
          label: "Save as template",
          icon: <MagicWandIcon />,
          disabled: true,
          disabled_reason: NOT_AVAILABLE_REASON,
        },
        {
          key: "delete",
          label: "Delete workspace",
          icon: <DeleteIcon size={16} />,
          onClick: onDelete,
          disabled: !can_manage,
          disabled_reason: OWNER_ONLY_REASON,
        },
      ],
    },
    {
      key: "workspaces",
      items: [
        { key: "add", label: "Add new workspace", icon: <PlusIcon />, onClick: onAddWorkspace },
        { key: "browse", label: "Browse all workspaces", icon: <BrowseAllIcon size={16} />, onClick: onBrowseAll },
        {
          key: "archive-trash",
          label: "View archive/trash",
          icon: <ArchiveIcon size={16} />,
          submenu: [
            { key: "archive", label: "View archive", icon: <ArchiveIcon size={16} />, onClick: onOpenArchive },
            { key: "trash", label: "View trash", icon: <DeleteIcon size={16} />, onClick: onOpenTrash },
          ],
        },
      ],
    },
  ];

  return (
    <ActionMenu
      anchor_el={anchor_el}
      is_open={is_open}
      onClose={onClose}
      sections={sections}
      aria_label="Workspace options"
      width={256}
      align="start"
    />
  );
};

export default WorkspacePanelMenu;
