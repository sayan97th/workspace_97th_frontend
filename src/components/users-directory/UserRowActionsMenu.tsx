"use client";
import React, { useRef, useState } from "react";
import AnchoredMenu, { type AnchoredMenuItem } from "@/components/ui/dropdown/AnchoredMenu";
import { DeleteIcon, EyeIcon, LockIcon, MoreDotsIcon, UnlockIcon } from "@/icons/workspace-icons";
import type { AdminUserDto } from "@/types/administration/admin-users";

export type UserRowActionsMenuProps = {
  user: AdminUserDto;
  can_impersonate: boolean;
  onToggleActive: () => void;
  onDelete: () => void;
  onImpersonate: () => void;
};

/**
 * A user row's "..." trigger for the actions that don't warrant their own always-visible
 * text button: Impersonate, Disable/Enable account and Delete. Built on the same
 * {@link AnchoredMenu} primitive as {@link TeamOptionsButton}, so the row keeps one
 * "Edit" button in view and everything else reads as labeled text here instead of
 * unlabeled icons.
 */
const UserRowActionsMenu: React.FC<UserRowActionsMenuProps> = ({
  user,
  can_impersonate,
  onToggleActive,
  onDelete,
  onImpersonate,
}) => {
  const [is_menu_open, setIsMenuOpen] = useState(false);
  const button_ref = useRef<HTMLButtonElement>(null);

  const items: AnchoredMenuItem[] = [
    ...(can_impersonate
      ? [{ key: "impersonate", label: "Impersonate", icon: <EyeIcon />, onClick: onImpersonate }]
      : []),
    {
      key: "toggle-active",
      label: user.is_active ? "Disable account" : "Enable account",
      icon: user.is_active ? <LockIcon /> : <UnlockIcon />,
      onClick: onToggleActive,
    },
    { key: "delete", label: "Delete user", icon: <DeleteIcon />, onClick: onDelete, danger: true },
  ];

  return (
    <span className="inline-flex">
      <button
        ref={button_ref}
        type="button"
        onClick={() => setIsMenuOpen((open) => !open)}
        aria-label={`More actions for ${user.full_name}`}
        aria-haspopup="menu"
        aria-expanded={is_menu_open}
        className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text ${
          is_menu_open ? "bg-shell-hover text-shell-text" : ""
        }`}
      >
        <MoreDotsIcon size={14} />
      </button>

      <AnchoredMenu
        anchor_el={button_ref.current}
        is_open={is_menu_open}
        onClose={() => setIsMenuOpen(false)}
        items={items}
        width={190}
        align="end"
      />
    </span>
  );
};

export default UserRowActionsMenu;
