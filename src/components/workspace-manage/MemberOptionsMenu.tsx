"use client";
import React from "react";
import AnchoredMenu, { type AnchoredMenuItem } from "@/components/ui/dropdown/AnchoredMenu";
import { ChevronRightIcon, CrownIcon, DeleteIcon, EyeIcon, MemberIcon } from "@/icons/workspace-icons";
import type { WorkspaceMembershipRole } from "@/types/invitation";

const ROLE_MENU_OPTIONS: Array<{ value: WorkspaceMembershipRole; label: string; Icon: typeof CrownIcon }> = [
  { value: "owner", label: "Owner", Icon: CrownIcon },
  { value: "member", label: "Member", Icon: MemberIcon },
  { value: "viewer", label: "Viewer", Icon: EyeIcon },
];

export type MemberOptionsMenuProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  current_role: string | null;
  /** Hidden entirely for the workspace's original creator — they can never be removed, see `WorkspaceMemberController::destroy()`. */
  can_remove: boolean;
  onChangeRole: (role: WorkspaceMembershipRole) => void;
  onRemove: () => void;
};

/**
 * Per-row "…" menu on Manage Workspace's Collaborations tab: change a
 * member's role (submenu, mirrors `SendInvitationModal`'s role choices) or
 * remove them from the workspace outright. Only rendered for rows the
 * current user is allowed to manage (see `WorkspaceManageCollaborators`),
 * which already excludes the viewer's own row.
 */
const MemberOptionsMenu: React.FC<MemberOptionsMenuProps> = ({
  anchor_el,
  is_open,
  onClose,
  current_role,
  can_remove,
  onChangeRole,
  onRemove,
}) => {
  const role_submenu: AnchoredMenuItem[] = ROLE_MENU_OPTIONS.map((option) => ({
    key: `role-${option.value}`,
    label: option.label,
    icon: <option.Icon size={13} />,
    onClick: () => onChangeRole(option.value),
    disabled: current_role === option.value,
  }));

  const items: AnchoredMenuItem[] = [
    {
      key: "change-role",
      label: "Change role",
      icon: <CrownIcon size={13} />,
      onClick: () => {},
      submenu: role_submenu,
      trailing: <ChevronRightIcon size={9} />,
    },
    ...(can_remove
      ? ([
          {
            key: "remove",
            label: "Remove from workspace",
            icon: <DeleteIcon size={13} />,
            onClick: onRemove,
            danger: true,
          },
        ] satisfies AnchoredMenuItem[])
      : []),
  ];

  return <AnchoredMenu anchor_el={anchor_el} is_open={is_open} onClose={onClose} items={items} width={200} align="end" />;
};

export default MemberOptionsMenu;
