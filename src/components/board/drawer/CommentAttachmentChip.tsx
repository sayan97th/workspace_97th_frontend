import React from "react";
import { CloseIcon } from "@/icons/board-icons";
import { DownloadFileIcon } from "@/icons/drawer-icons";
import type { DrawerAttachment } from "./types";

export type CommentAttachmentChipProps = {
  attachment: DrawerAttachment;
  /** Present on composer drafts (removable); omitted on already-posted attachments (download affordance instead). */
  onRemove?: (attachment_id: string) => void;
};

/** File chip shown both in the composer's pending-attachment tray and on a posted comment. */
const CommentAttachmentChip: React.FC<CommentAttachmentChipProps> = ({ attachment, onRemove }) => (
  <div
    className={`flex items-center gap-2 rounded-[10px] border border-white/10 bg-[#132524] ${
      onRemove ? "py-1.5 pl-1.5 pr-2" : "cursor-pointer py-2 pl-1.5 pr-3 hover:border-[#00c875]"
    }`}
  >
    <span
      className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-md text-[9px] font-extrabold text-white"
      style={{ background: attachment.tag_color }}
    >
      {attachment.tag}
    </span>
    <span className="max-w-[150px] truncate text-[12.5px] font-medium text-[#d7dcdc]">
      {attachment.file_name}
    </span>
    {onRemove ? (
      <button
        type="button"
        onClick={() => onRemove(attachment.id)}
        className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded text-[#8a9495] hover:bg-white/10 hover:text-white"
      >
        <CloseIcon size={11} />
      </button>
    ) : (
      <DownloadFileIcon className="flex-none text-[#8a9495]" />
    )}
  </div>
);

export default CommentAttachmentChip;
