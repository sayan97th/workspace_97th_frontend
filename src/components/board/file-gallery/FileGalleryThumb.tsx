import React from "react";
import type { BoardViewFileDto } from "@/types/board-view-files";
import { classifyAttachment } from "../drawer";

export type FileGalleryThumbProps = {
  file: Pick<BoardViewFileDto, "file_name" | "download_url" | "is_image">;
  className?: string;
};

/**
 * A file's thumbnail: the actual image for `is_image` files, otherwise the
 * same coloured extension badge (PDF/DOC/XLS/IMG/PPT/FILE) the comment
 * drawer's attachment chips use — reusing `classifyAttachment` keeps file
 * "typing" consistent everywhere a file shows up in the app.
 */
const FileGalleryThumb: React.FC<FileGalleryThumbProps> = ({ file, className = "" }) => {
  if (file.is_image) {
    // eslint-disable-next-line @next/next/no-img-element -- remote, user-uploaded files aren't part of next/image's static asset pipeline.
    return <img src={file.download_url} alt={file.file_name} loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  }

  const { tag, tag_color } = classifyAttachment(file.file_name);

  return (
    <div className={`flex h-full w-full items-center justify-center ${className}`} style={{ background: `${tag_color}1a` }}>
      <span
        className="flex h-9 min-w-[38px] items-center justify-center rounded-md px-2 text-[11px] font-extrabold text-white"
        style={{ background: tag_color }}
      >
        {tag}
      </span>
    </div>
  );
};

export default FileGalleryThumb;
