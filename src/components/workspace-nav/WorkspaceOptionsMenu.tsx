"use client";
import React from "react";
import AnchoredMenu, { type AnchoredMenuItem } from "@/components/ui/dropdown/AnchoredMenu";
import { DeleteIcon, LeaveWorkspaceIcon, RenameIcon, WorkspaceTypeIcon } from "@/icons/workspace-icons";

export type WorkspaceOptionsMenuProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  /** Owner-only actions (rename / change type / delete) are hidden for non-owners. */
  can_manage: boolean;
  onRename: () => void;
  onChangeType: () => void;
  onLeave: () => void;
  onDelete: () => void;
};

/**
 * The workspace header's "…" options menu (Rename / Change type / Leave / Delete),
 * matching the "97 Workspace Menu" design's Options popover. Built on the generic
 * {@link AnchoredMenu} primitive so any future single-anchor "…" menu elsewhere in
 * the app can reuse the same positioning/styling instead of a bespoke popover.
 */
const WorkspaceOptionsMenu: React.FC<WorkspaceOptionsMenuProps> = ({
  anchor_el,
  is_open,
  onClose,
  can_manage,
  onRename,
  onChangeType,
  onLeave,
  onDelete,
}) => {
  const items: AnchoredMenuItem[] = [
    ...(can_manage
      ? ([
          { key: "rename", label: "Rename workspace", icon: <RenameIcon />, onClick: onRename },
          {
            key: "change-type",
            label: "Change type",
            icon: <WorkspaceTypeIcon />,
            onClick: onChangeType,
          },
        ] satisfies AnchoredMenuItem[])
      : []),
    { key: "leave", label: "Leave workspace", icon: <LeaveWorkspaceIcon />, onClick: onLeave },
    ...(can_manage
      ? ([
          {
            key: "delete",
            label: "Delete workspace",
            icon: <DeleteIcon />,
            onClick: onDelete,
            danger: true,
          },
        ] satisfies AnchoredMenuItem[])
      : []),
  ];

  return (
    <AnchoredMenu
      anchor_el={anchor_el}
      is_open={is_open}
      onClose={onClose}
      items={items}
      width={220}
      align="end"
    />
  );
};

export default WorkspaceOptionsMenu;
