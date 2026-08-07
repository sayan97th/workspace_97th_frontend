"use client";
import React, { useRef, useState } from "react";
import AnchoredMenu, { type AnchoredMenuItem } from "@/components/ui/dropdown/AnchoredMenu";
import { DeleteIcon, MoreDotsIcon, RenameIcon } from "@/icons/workspace-icons";

export type TeamOptionsButtonProps = {
  team_name: string;
  onEdit: () => void;
  onDelete: () => void;
};

/**
 * A team row's "…" trigger — Edit team / Delete team — built on the same
 * {@link AnchoredMenu} primitive as {@link WorkspaceOptionsButton}. Stops click
 * propagation so it can sit inside the row's own "select this team" button.
 */
const TeamOptionsButton: React.FC<TeamOptionsButtonProps> = ({ team_name, onEdit, onDelete }) => {
  const [is_menu_open, setIsMenuOpen] = useState(false);
  const button_ref = useRef<HTMLButtonElement>(null);

  const items: AnchoredMenuItem[] = [
    { key: "edit", label: "Edit team", icon: <RenameIcon />, onClick: onEdit },
    { key: "delete", label: "Delete team", icon: <DeleteIcon />, onClick: onDelete, danger: true },
  ];

  return (
    <span
      onClick={(event) => event.stopPropagation()}
      className="flex-none"
    >
      <button
        ref={button_ref}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsMenuOpen((open) => !open);
        }}
        aria-label={`${team_name} options`}
        aria-haspopup="menu"
        aria-expanded={is_menu_open}
        className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-shell-text-muted opacity-0 transition-opacity hover:bg-shell-hover-strong hover:text-shell-text group-hover:opacity-100"
      >
        <MoreDotsIcon size={14} />
      </button>

      <AnchoredMenu
        anchor_el={button_ref.current}
        is_open={is_menu_open}
        onClose={() => setIsMenuOpen(false)}
        items={items}
        width={180}
        align="end"
      />
    </span>
  );
};

export default TeamOptionsButton;
