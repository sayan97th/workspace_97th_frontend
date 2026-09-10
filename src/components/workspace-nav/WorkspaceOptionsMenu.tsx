"use client";
import React from "react";
import AnchoredMenu, { type AnchoredMenuItem } from "@/components/ui/dropdown/AnchoredMenu";
import {
  CrownIcon,
  DeleteIcon,
  EditWorkspaceIcon,
  LeaveWorkspaceIcon,
  RenameIcon,
  StarIcon,
  WorkspaceTypeIcon,
} from "@/icons/workspace-icons";

export type WorkspaceOptionsMenuProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  /** Owner-only actions (edit / rename / change type / transfer ownership / delete) are hidden for non-owners. */
  can_manage: boolean;
  /** Opens the full "Edit workspace" dialog (name, color, photo, privacy in one place). */
  onEdit: () => void;
  onRename: () => void;
  onChangeType: () => void;
  /** Omit to hide "Transfer ownership" (e.g. compact switcher/browse contexts that don't have a member list to hand). */
  onTransferOwnership?: () => void;
  /** Whether this workspace is currently flagged as a priority client. */
  is_priority?: boolean;
  /** Flags/unflags the workspace as a priority client; the menu item stays hidden when omitted. */
  onTogglePriority?: () => void;
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
  onEdit,
  onRename,
  onChangeType,
  onTransferOwnership,
  is_priority = false,
  onTogglePriority,
  onLeave,
  onDelete,
}) => {
  const items: AnchoredMenuItem[] = [
    ...(can_manage
      ? ([
          { key: "edit", label: "Edit workspace", icon: <EditWorkspaceIcon />, onClick: onEdit },
          { key: "rename", label: "Rename workspace", icon: <RenameIcon />, onClick: onRename },
          {
            key: "change-type",
            label: "Change type",
            icon: <WorkspaceTypeIcon />,
            onClick: onChangeType,
          },
          ...(onTransferOwnership
            ? ([
                {
                  key: "transfer-ownership",
                  label: "Transfer ownership",
                  icon: <CrownIcon />,
                  onClick: onTransferOwnership,
                },
              ] satisfies AnchoredMenuItem[])
            : []),
        ] satisfies AnchoredMenuItem[])
      : []),
    ...(onTogglePriority
      ? ([
          {
            key: "priority",
            label: is_priority ? "Remove as priority client" : "Mark as priority client",
            icon: <StarIcon filled={is_priority} />,
            onClick: onTogglePriority,
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
