"use client";
import React, { useRef } from "react";
import BoardPopover from "../toolbar/BoardPopover";

export type KanbanCoverMenuProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  has_cover: boolean;
  /** Fired with the chosen image file — the caller uploads it and closes the menu. */
  onUpload: (file: File) => void;
  /** Only rendered when {@link has_cover} is true. */
  onRemove: () => void;
};

/**
 * Small anchored menu for a Kanban card's Trello-style cover image, following
 * `AddColumnMenu`'s controlled anchor_el/is_open/onClose pattern — purely
 * presentational, the caller owns the upload/remove requests.
 */
const KanbanCoverMenu: React.FC<KanbanCoverMenuProps> = ({ anchor_el, is_open, onClose, has_cover, onUpload, onRemove }) => {
  const file_input_ref = useRef<HTMLInputElement>(null);

  return (
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} align="start" width={220}>
      <div className="flex flex-col gap-1 p-1.5">
        <button
          type="button"
          onClick={() => file_input_ref.current?.click()}
          className="rounded-[6px] px-2.5 py-2 text-left text-[13px] font-medium text-shell-text transition-colors hover:bg-shell-hover"
        >
          {has_cover ? "Replace cover image" : "Upload cover image"}
        </button>
        {has_cover && (
          <button
            type="button"
            onClick={() => {
              onRemove();
              onClose();
            }}
            className="rounded-[6px] px-2.5 py-2 text-left text-[13px] font-medium text-shell-text transition-colors hover:bg-shell-hover"
          >
            Remove cover
          </button>
        )}
      </div>
      <input
        ref={file_input_ref}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          onUpload(file);
          onClose();
        }}
      />
    </BoardPopover>
  );
};

export default KanbanCoverMenu;
