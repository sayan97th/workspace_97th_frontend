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
const CommentAttachmentChip: React.FC<CommentAttachmentChipProps> = ({ attachment, onRemove }) => {
  const content = (
    <>
      <span
        className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-md text-[9px] font-extrabold text-white"
        style={{ background: attachment.tag_color }}
      >
        {attachment.tag}
      </span>
      <span className="max-w-[150px] truncate text-[12.5px] font-medium text-shell-text-secondary">
        {attachment.file_name}
      </span>
      {onRemove ? (
        <button
          type="button"
          onClick={() => onRemove(attachment.id)}
          className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded text-shell-text-muted hover:bg-shell-hover-strong hover:text-shell-text"
        >
          <CloseIcon size={11} />
        </button>
      ) : (
        <DownloadFileIcon className="flex-none text-shell-text-muted" />
      )}
    </>
  );

  const className = `flex items-center gap-2 rounded-[10px] border border-shell-border-strong bg-shell-panel ${
    onRemove ? "py-1.5 pl-1.5 pr-2" : "cursor-pointer py-2 pl-1.5 pr-3 hover:border-[#00c875]"
  }`;

  if (!onRemove && attachment.download_url) {
    return (
      <a href={attachment.download_url} target="_blank" rel="noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
};

export default CommentAttachmentChip;
