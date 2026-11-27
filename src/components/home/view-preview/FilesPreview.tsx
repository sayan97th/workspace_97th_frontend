import React from "react";
import type { RecentBoardPreview } from "@/types/personal";

/** Tiles in the gallery grid. */
const TILE_COUNT = 6;

/** The family a file extension belongs to, which picks its tile color. */
const fileFamilyOf = (extension: string): string => {
  if (extension === "pdf") return "pdf";
  if (["doc", "docx", "txt", "rtf", "md", "pages"].includes(extension)) return "doc";
  if (["xls", "xlsx", "csv", "numbers"].includes(extension)) return "sheet";
  if (["ppt", "pptx", "key"].includes(extension)) return "slides";
  if (["mp4", "mov", "webm", "avi", "mkv"].includes(extension)) return "video";
  if (["mp3", "wav", "m4a", "ogg"].includes(extension)) return "audio";
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) return "archive";
  return "other";
};

/**
 * A mini File gallery: a grid of the newest files, images shown as real
 * thumbnails and every other file as a tile colored by its type.
 */
const FilesPreview: React.FC<{ preview: RecentBoardPreview }> = ({ preview }) => {
  const files = preview.files?.files ?? [];

  return (
    <div className="vp-sheet vp-files">
      {Array.from({ length: TILE_COUNT }, (_, index) => {
        const file = files[index];
        if (!file) return <span key={index} className="vp-files__tile vp-files__tile--ghost" />;

        if (file.is_image && file.url) {
          return (
            <span key={index} className="vp-files__tile vp-files__tile--image">
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny thumbnail of an uploaded file, served as is */}
              <img src={file.url} alt="" loading="lazy" decoding="async" />
            </span>
          );
        }

        return (
          <span key={index} className="vp-files__tile" data-family={fileFamilyOf(file.extension)}>
            <b>{file.extension.slice(0, 4) || "file"}</b>
          </span>
        );
      })}
    </div>
  );
};

export default FilesPreview;
