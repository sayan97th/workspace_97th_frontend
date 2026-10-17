"use client";
import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AnchoredMenu, { type AnchoredMenuItem } from "@/components/ui/dropdown/AnchoredMenu";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import {
  DeleteIcon,
  EyeIcon,
  KeyIcon,
  LockIcon,
  MoreDotsIcon,
  PencilIcon,
  RefreshIcon,
  UnlockIcon,
} from "@/icons/workspace-icons";
import type { AdminUserDto } from "@/types/administration/admin-users";

export type UserRowActionsMenuProps = {
  user: AdminUserDto;
  can_impersonate: boolean;
  onToggleActive: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onImpersonate: () => void;
};

/**
 * A user row's "..." menu: Edit details and Change password open the edit page on that tab,
 * then Impersonate, Disable or Enable account and Delete user. A deleted account only offers
 * Restore. Built on {@link AnchoredMenu}, so it reads like every other row menu in the app.
 */
const UserRowActionsMenu: React.FC<UserRowActionsMenuProps> = ({
  user,
  can_impersonate,
  onToggleActive,
  onDelete,
  onRestore,
  onImpersonate,
}) => {
  const router = useRouter();
  const [is_menu_open, setIsMenuOpen] = useState(false);
  const button_ref = useRef<HTMLButtonElement>(null);
  const edit_href = `/users/${user.id}/edit`;

  // A deleted account can only be brought back, everything else needs a live account.
  const items: AnchoredMenuItem[] = user.deleted_at
    ? [
        { key: "view", label: "View account", icon: <EyeIcon />, onClick: () => router.push(edit_href) },
        { key: "restore", label: "Restore account", icon: <RefreshIcon />, onClick: onRestore },
      ]
    : [
        { key: "edit", label: "Edit details", icon: <PencilIcon />, onClick: () => router.push(edit_href) },
        {
          key: "password",
          label: "Change password",
          icon: <KeyIcon />,
          onClick: () => router.push(`${edit_href}?tab=password`),
        },
        ...(can_impersonate
          ? [{ key: "impersonate", label: "Impersonate", icon: <EyeIcon />, onClick: onImpersonate, divider_before: true }]
          : []),
        {
          key: "toggle-active",
          label: user.is_active ? "Disable account" : "Enable account",
          icon: user.is_active ? <LockIcon /> : <UnlockIcon />,
          onClick: onToggleActive,
          divider_before: !can_impersonate,
        },
        { key: "delete", label: "Delete user", icon: <DeleteIcon />, onClick: onDelete, danger: true },
      ];

  return (
    <span className="inline-flex">
      {/* Never toggle the tooltip's `disabled` here: that remounts the button and the menu anchors to a detached node. */}
      <PortalTooltip content="More actions">
        <button
          ref={button_ref}
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label={`More actions for ${user.full_name}`}
          aria-haspopup="menu"
          aria-expanded={is_menu_open}
          className="inv-icon-button"
          style={is_menu_open ? { background: "var(--inv-hover)", color: "var(--inv-text)" } : undefined}
        >
          <MoreDotsIcon size={15} />
        </button>
      </PortalTooltip>

      <AnchoredMenu
        anchor_el={button_ref.current}
        is_open={is_menu_open}
        onClose={() => setIsMenuOpen(false)}
        items={items}
        width={210}
        align="end"
      />
    </span>
  );
};

export default UserRowActionsMenu;
