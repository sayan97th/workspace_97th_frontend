"use client";

import type { CSSProperties } from "react";
import UserAvatar from "@/components/common/UserAvatar";
import type { FileResult } from "@/types/search-everything";
import { BoardGlyph, FILE_KIND_TINTS, FileKindGlyph, TimeAgo, itemHref, type NavigateTo } from "../shared";

type FileResultsProps = {
  files: FileResult[];
  onNavigate: NavigateTo;
};

/**
 * "Files": a grid of cards. Images show their thumbnail, every other type a
 * page glyph over its brand color (red PDF, green Excel...). The uploader's
 * avatar sits on the preview edge, then the name, the item and the board.
 * The card opens the file in a new tab, the item line opens its drawer.
 */
export default function FileResults({ files, onNavigate }: FileResultsProps) {
  return (
    <div className="search-everything__file-grid">
      {files.map((file) => {
        const is_image = file.kind === "image" && file.source !== "link";
        const preview_style = {
          "--se-file-tint": FILE_KIND_TINTS[file.kind],
          backgroundImage: is_image && file.url ? `url("${file.url.replace(/"/g, "%22")}")` : undefined,
        } as CSSProperties;

        return (
          <div key={file.key} className="search-everything__file">
            <a href={file.url} target="_blank" rel="noopener noreferrer" className="search-everything__file-preview" style={preview_style} aria-label={`Open ${file.name}`}>
              {!is_image && <FileKindGlyph kind={file.kind} />}
            </a>
            <div className="search-everything__file-body">
              <span className="search-everything__file-avatar">
                <UserAvatar user={{ full_name: file.uploaded_by?.full_name ?? "", profile_photo_url: file.uploaded_by?.photo_url ?? null }} size={28} />
              </span>
              <div className="search-everything__file-time">
                <TimeAgo iso={file.created_at} />
              </div>
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="search-everything__file-name block hover:underline" title={file.name}>
                {file.name}
              </a>
              {file.item && file.board && (
                <button type="button" className="search-everything__file-sub w-full text-left hover:text-[var(--se-primary)]" onClick={() => onNavigate(itemHref(file.board!, file.item!))}>
                  <span className="truncate">{file.item.name}</span>
                </button>
              )}
              {file.board && (
                <div className="search-everything__file-sub">
                  <BoardGlyph board={file.board} size={12} />
                  <span className="truncate">{file.board.label}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
