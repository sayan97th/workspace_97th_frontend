import React from "react";
import { BoardGridIcon } from "@/icons/workspace-icons";
import { PlusIcon } from "@/icons/board-icons";

export type FileGalleryEmptyStateProps = {
  onBrowseFiles: () => void;
};

/** Shown when the gallery has no files yet — doubles as the drop target's call to action. */
const FileGalleryEmptyState: React.FC<FileGalleryEmptyStateProps> = ({ onBrowseFiles }) => (
  <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-shell-border py-24 text-center">
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-shell-hover text-shell-text-muted">
      <BoardGridIcon size={26} />
    </span>
    <h2 className="text-lg font-semibold text-shell-text">No files yet</h2>
    <p className="text-[13.5px] text-shell-text-muted">Drag and drop files here, or browse to upload the first one.</p>
    <button
      type="button"
      onClick={onBrowseFiles}
      className="flex items-center gap-1.5 rounded-[7px] border border-shell-border px-2.5 py-1.5 text-[12.5px] font-medium text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
    >
      <PlusIcon size={13} />
      Browse files
    </button>
  </div>
);

export default FileGalleryEmptyState;
