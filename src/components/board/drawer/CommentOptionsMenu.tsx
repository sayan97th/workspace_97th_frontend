"use client";
import React, { useRef, useState } from "react";
import AnchoredMenu, { type AnchoredMenuItem } from "@/components/ui/dropdown/AnchoredMenu";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { EditPencilIcon } from "@/icons/board-icons";
import { DeleteIcon, MoreDotsIcon } from "@/icons/workspace-icons";

export type CommentOptionsMenuProps = {
  onEdit: () => void;
  onDelete: () => void;
  /** Only used for the trigger's aria-label and the delete confirm dialog's copy. */
  kind?: "comment" | "reply";
  class_name?: string;
  style?: React.CSSProperties;
  icon_size?: number;
};

const TRIGGER_CLASS_NAME =
  "flex h-6 w-6 flex-none items-center justify-center rounded-[7px] text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text";

/**
 * Author-only "…" options menu for a comment or reply — Edit / Delete, built
 * on the same {@link AnchoredMenu} primitive as {@link TeamOptionsButton}.
 * Shared by every drawer flavor (`CommentThread`'s full Updates tab and
 * Kanban's compact comment list) the same way `CommentAttachmentChip`
 * already is, so the menu + confirm-before-delete behavior only lives here.
 */
const CommentOptionsMenu: React.FC<CommentOptionsMenuProps> = ({
  onEdit,
  onDelete,
  kind = "comment",
  class_name,
  style,
  icon_size = 13,
}) => {
  const [is_menu_open, setIsMenuOpen] = useState(false);
  const [is_confirm_open, setIsConfirmOpen] = useState(false);
  const button_ref = useRef<HTMLButtonElement>(null);

  const items: AnchoredMenuItem[] = [
    { key: "edit", label: "Edit", icon: <EditPencilIcon size={14} />, onClick: onEdit },
    { key: "delete", label: "Delete", icon: <DeleteIcon size={14} />, onClick: () => setIsConfirmOpen(true), danger: true },
  ];

  return (
    <>
      <button
        ref={button_ref}
        type="button"
        onClick={() => setIsMenuOpen((open) => !open)}
        aria-label={`${kind === "reply" ? "Reply" : "Comment"} options`}
        aria-haspopup="menu"
        aria-expanded={is_menu_open}
        style={style}
        className={class_name ?? TRIGGER_CLASS_NAME}
      >
        <MoreDotsIcon size={icon_size} />
      </button>

      <AnchoredMenu
        anchor_el={button_ref.current}
        is_open={is_menu_open}
        onClose={() => setIsMenuOpen(false)}
        items={items}
        width={160}
        align="end"
      />

      <ConfirmActionModal
        is_open={is_confirm_open}
        title={kind === "reply" ? "Delete reply" : "Delete comment"}
        description={`Are you sure you want to delete this ${kind}? This can't be undone.`}
        confirm_label="Delete"
        danger
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={onDelete}
      />
    </>
  );
};

export default CommentOptionsMenu;
