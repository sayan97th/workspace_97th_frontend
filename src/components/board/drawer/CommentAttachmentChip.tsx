import React from "react";
import { CloseIcon } from "@/icons/board-icons";
import { DownloadFileIcon } from "@/icons/drawer-icons";
import type { DrawerAttachment } from "./types";

export type CommentAttachmentChipProps = {
  attachment: DrawerAttachment;
  /** Present on composer drafts (removable); omitted on already-posted attachments (download/delete affordances instead). */
  onRemove?: (attachment_id: string) => void;
  /** Present when a posted attachment can be permanently deleted (`attachment.can_delete`) — renders a delete button beside the download link. */
  onDelete?: (attachment: DrawerAttachment) => void;
};

/** File chip shown in the composer's pending-attachment tray, on a posted comment, and in the item's Attachments section/Files tab. */
const CommentAttachmentChip: React.FC<CommentAttachmentChipProps> = ({ attachment, onRemove, onDelete }) => {
  const label = (
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
    </>
  );

  if (onRemove) {
    return (
      <div className="flex items-center gap-2 rounded-[10px] border border-shell-border-strong bg-shell-panel py-1.5 pl-1.5 pr-2">
        {label}
        <button
          type="button"
          onClick={() => onRemove(attachment.id)}
          aria-label={`Remove ${attachment.file_name}`}
          className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded text-shell-text-muted hover:bg-shell-hover-strong hover:text-shell-text"
        >
          <CloseIcon size={11} />
        </button>
      </div>
    );
  }

  // Kept out of the <a> below (rather than nested inside it) so the delete
  // button never ends up as an interactive element inside another one.
  const download = attachment.download_url ? (
    <a href={attachment.download_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:opacity-80">
      {label}
      <DownloadFileIcon className="flex-none text-shell-text-muted" />
    </a>
  ) : (
    <span className="flex items-center gap-2">{label}</span>
  );

  return (
    <div className="flex items-center gap-1.5 rounded-[10px] border border-shell-border-strong bg-shell-panel py-2 pl-1.5 pr-2 transition-colors hover:border-[#00c875]">
      {download}
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(attachment)}
          aria-label={`Delete ${attachment.file_name}`}
          title="Delete file"
          className="flex h-[20px] w-[20px] flex-none items-center justify-center rounded text-shell-text-muted hover:bg-[rgba(226,68,92,0.14)] hover:text-[#e2445c]"
        >
          <CloseIcon size={11} />
        </button>
      )}
    </div>
  );
};

export default CommentAttachmentChip;
