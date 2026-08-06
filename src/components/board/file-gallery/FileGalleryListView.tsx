import React from "react";
import UserAvatar from "@/components/common/UserAvatar";
import { DeleteIcon } from "@/icons/workspace-icons";
import { DownloadIcon } from "@/icons/board-icons";
import type { BoardViewFileDto } from "@/types/board-view-files";
import FileGalleryThumb from "./FileGalleryThumb";
import { formatFileSize, formatUploadedDate } from "./fileGalleryUtils";

export type FileGalleryListViewProps = {
  files: BoardViewFileDto[];
  onDeleteFile: (file: BoardViewFileDto) => void;
};

/** Row list — the Files Gallery's denser alternative to the card grid. */
const FileGalleryListView: React.FC<FileGalleryListViewProps> = ({ files, onDeleteFile }) => (
  <div className="overflow-hidden rounded-xl border border-shell-border">
    <div className="flex items-center gap-3 border-b border-shell-border bg-shell-panel-alt px-3 py-2 text-[11.5px] font-semibold uppercase tracking-wide text-shell-text-faint">
      <span className="w-8 flex-none" />
      <span className="min-w-0 flex-1">Name</span>
      <span className="w-36 flex-none">Uploaded by</span>
      <span className="w-24 flex-none">Date</span>
      <span className="w-16 flex-none text-right">Size</span>
      <span className="w-16 flex-none" />
    </div>

    {files.map((file) => (
      <div
        key={file.id}
        className="group flex items-center gap-3 border-b border-shell-border px-3 py-2 last:border-b-0 hover:bg-shell-hover"
      >
        <span className="h-8 w-8 flex-none overflow-hidden rounded-md">
          <FileGalleryThumb file={file} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-shell-text" title={file.file_name}>
          {file.file_name}
        </span>
        <span className="flex w-36 flex-none items-center gap-1.5 text-[12px] text-shell-text-muted">
          <UserAvatar user={file.uploader} size={18} font_size={8} />
          <span className="truncate">{file.uploader?.full_name ?? "Unknown"}</span>
        </span>
        <span className="w-24 flex-none text-[12px] text-shell-text-muted">{formatUploadedDate(file.created_at)}</span>
        <span className="w-16 flex-none text-right text-[12px] text-shell-text-muted">{formatFileSize(file.size_bytes)}</span>
        <span className="flex w-16 flex-none items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <a
            href={file.download_url}
            download={file.file_name}
            target="_blank"
            rel="noreferrer"
            aria-label={`Download ${file.file_name}`}
            className="flex h-6 w-6 items-center justify-center rounded-md text-shell-text-muted hover:bg-shell-hover-strong hover:text-shell-text"
          >
            <DownloadIcon size={13} />
          </a>
          <button
            type="button"
            onClick={() => onDeleteFile(file)}
            aria-label={`Delete ${file.file_name}`}
            className="flex h-6 w-6 items-center justify-center rounded-md text-shell-text-muted hover:bg-red-500/15 hover:text-red-500"
          >
            <DeleteIcon size={13} />
          </button>
        </span>
      </div>
    ))}
  </div>
);

export default FileGalleryListView;
