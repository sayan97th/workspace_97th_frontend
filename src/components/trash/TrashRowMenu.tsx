"use client";
import React, { useRef, useState } from "react";
import ActionMenu, { type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import { DeleteIcon, MoreDotsIcon } from "@/icons/workspace-icons";
import { RestoreIcon } from "@/icons/trash-icons";

export type TrashRowMenuProps = {
  entry_name: string;
  onRestore: () => void;
  onDeleteForever: () => void;
};

/**
 * Per-row "..." menu (Restore / Delete permanently) for a trash/archive entry, built on
 * {@link ActionMenu} so it shares the look of the board table's row menu.
 */
const TrashRowMenu: React.FC<TrashRowMenuProps> = ({ entry_name, onRestore, onDeleteForever }) => {
  const button_ref = useRef<HTMLButtonElement>(null);
  const [is_open, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);
  const sections: ActionMenuSection[] = [
    { key: "restore", items: [{ key: "restore", label: "Restore", icon: <RestoreIcon size={16} />, onClick: onRestore }] },
    {
      key: "danger",
      items: [{ key: "delete-forever", label: "Delete permanently", icon: <DeleteIcon size={16} />, danger: true, onClick: onDeleteForever }],
    },
  ];

  return (
    <>
      <button
        ref={button_ref}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={`Actions for ${entry_name}`}
        aria-haspopup="menu"
        aria-expanded={is_open}
        className={`flex h-[26px] w-[26px] flex-none items-center justify-center rounded-md text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text ${
          is_open ? "bg-shell-hover text-shell-text" : ""
        }`}
      >
        <MoreDotsIcon size={15} />
      </button>

      <ActionMenu
        anchor_el={button_ref.current}
        is_open={is_open}
        onClose={close}
        sections={sections}
        aria_label={`Actions for ${entry_name}`}
        width={208}
      />
    </>
  );
};

export default TrashRowMenu;
