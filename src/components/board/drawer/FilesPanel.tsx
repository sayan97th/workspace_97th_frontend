import React from "react";
import { FilesTabIcon } from "@/icons/drawer-icons";
import CommentAttachmentChip from "./CommentAttachmentChip";
import type { DrawerAttachment } from "./types";

export type FilesPanelProps = {
  item_title: string;
  attachments: DrawerAttachment[];
};

/** Lists every file attached to an update on this item, aggregated from the Updates tab. */
const FilesPanel: React.FC<FilesPanelProps> = ({ item_title, attachments }) => {
  if (attachments.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-6 text-center text-shell-text-faint">
        <FilesTabIcon size={46} className="mb-3.5 text-shell-text-faint" />
        <div className="text-[15px] font-bold text-shell-text-secondary">No files yet</div>
        <div className="mt-1.5 max-w-[280px] text-[13px] leading-relaxed">
          Attach documents, screenshots or contracts from the Updates tab to share them on {item_title}.
        </div>
      </div>
    );
  }

  return (
    <div className="shell-scrollbar min-h-0 flex-1 overflow-auto px-5 py-5">
      <div className="flex flex-wrap gap-2.5">
        {attachments.map((attachment) => (
          <CommentAttachmentChip key={attachment.id} attachment={attachment} />
        ))}
      </div>
    </div>
  );
};

export default FilesPanel;
