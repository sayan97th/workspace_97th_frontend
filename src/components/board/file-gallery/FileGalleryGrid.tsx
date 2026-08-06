import React from "react";
import UserAvatar from "@/components/common/UserAvatar";
import { DeleteIcon } from "@/icons/workspace-icons";
import { DownloadIcon } from "@/icons/board-icons";
import type { BoardViewFileDto } from "@/types/board-view-files";
import FileGalleryThumb from "./FileGalleryThumb";
import { formatFileSize, formatUploadedDate } from "./fileGalleryUtils";

export type FileGalleryGridProps = {
  files: BoardViewFileDto[];
  onDeleteFile: (file: BoardViewFileDto) => void;
};

/** Card grid — Monday-style Files Gallery thumbnails, four-up on a typical board width. */
const FileGalleryGrid: React.FC<FileGalleryGridProps> = ({ files, onDeleteFile }) => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
    {files.map((file) => (
      <div
        key={file.id}
        className="group flex flex-col overflow-hidden rounded-xl border border-shell-border bg-shell-panel transition-shadow hover:shadow-md"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-shell-panel-alt">
          <FileGalleryThumb file={file} />

          <div className="absolute inset-x-0 top-0 flex justify-end gap-1 bg-gradient-to-b from-black/35 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <a
              href={file.download_url}
              download={file.file_name}
              target="_blank"
              rel="noreferrer"
              aria-label={`Download ${file.file_name}`}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-black/40 text-white transition-colors hover:bg-black/60"
            >
              <DownloadIcon size={13} />
            </a>
            <button
              type="button"
              onClick={() => onDeleteFile(file)}
              aria-label={`Delete ${file.file_name}`}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-black/40 text-white transition-colors hover:bg-red-500/80"
            >
              <DeleteIcon size={13} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 p-2.5">
          <span className="truncate text-[12.5px] font-semibold text-shell-text" title={file.file_name}>
            {file.file_name}
          </span>
          <div className="flex items-center justify-between gap-1.5">
            <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-shell-text-faint">
              <UserAvatar user={file.uploader} size={16} font_size={8} />
              <span className="truncate">{formatUploadedDate(file.created_at)}</span>
            </span>
            <span className="flex-none text-[11px] text-shell-text-faint">{formatFileSize(file.size_bytes)}</span>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default FileGalleryGrid;
