"use client";
import React, { useState } from "react";
import { ImageIcon } from "@/icons/board-icons";
import KanbanCoverMenu from "./KanbanCoverMenu";

export type KanbanCardCoverProps = {
  cover_image_url: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
};

/**
 * Edge-to-edge Trello-style card cover (or, when unset, a hover-revealed
 * affordance to add one) with its own "set cover" popover — owns its
 * anchor/open state locally so each Kanban card gets an independent instance
 * (see `BoardKanban`'s `renderCard` contract: the card shell owns no padding,
 * so this sits flush against the card's rounded top corners).
 */
const KanbanCardCover: React.FC<KanbanCardCoverProps> = ({ cover_image_url, onUpload, onRemove }) => {
  const [anchor_el, setAnchorEl] = useState<HTMLElement | null>(null);

  const openMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  if (!cover_image_url) {
    return (
      <div>
        <button
          type="button"
          onClick={openMenu}
          className="flex h-6 w-full items-center justify-center gap-1.5 text-[11px] font-medium text-[#7E8889] opacity-0 transition-opacity hover:bg-[#F4F4F2] hover:text-[#2B3C40] group-hover:opacity-100"
          title="Add cover image"
        >
          <ImageIcon size={12} />
          Add cover
        </button>
        <KanbanCoverMenu
          anchor_el={anchor_el}
          is_open={anchor_el !== null}
          onClose={() => setAnchorEl(null)}
          has_cover={false}
          onUpload={onUpload}
          onRemove={onRemove}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cover_image_url} alt="Card cover" draggable={false} className="h-28 w-full object-cover" />
      <button
        type="button"
        onClick={openMenu}
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-[6px] bg-black/45 text-white opacity-0 transition-opacity hover:bg-black/65 group-hover:opacity-100"
        title="Change cover image"
      >
        <ImageIcon size={13} />
      </button>
      <KanbanCoverMenu
        anchor_el={anchor_el}
        is_open={anchor_el !== null}
        onClose={() => setAnchorEl(null)}
        has_cover
        onUpload={onUpload}
        onRemove={onRemove}
      />
    </div>
  );
};

export default KanbanCardCover;
