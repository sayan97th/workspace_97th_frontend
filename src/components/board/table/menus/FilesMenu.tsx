"use client";

import { useRef } from "react";
import PopoverPanel from "./PopoverPanel";
import type { CellFile } from "../types";

interface FilesMenuProps {
  files: CellFile[];
  is_uploading: boolean;
  onUpload: (files: File[]) => void;
  onDelete: (file_id: string) => void;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesMenu({ files, is_uploading, onUpload, onDelete, onClose }: FilesMenuProps) {
  const input_ref = useRef<HTMLInputElement>(null);

  return (
    <PopoverPanel onClose={onClose} className="left-1/2 top-full w-[260px] -translate-x-1/2 p-3">
      <div className="mb-2 max-h-52 overflow-y-auto">
        {files.length === 0 && <div className="px-1 py-2 text-[12.5px] text-boardtree-text-faint">No files yet</div>}
        {files.map((file) => (
          <div key={file.id} className="flex items-center gap-2 rounded-[5px] px-1.5 py-1.5 hover:bg-boardtree-hover">
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              title={file.file_name}
              className="min-w-0 flex-1 truncate text-[12.5px] text-boardtree-text hover:underline"
            >
              {file.file_name}
            </a>
            <span className="flex-none text-[10.5px] text-boardtree-text-faint">{formatSize(file.size_bytes)}</span>
            <button type="button" onClick={() => onDelete(file.id)} className="flex-none text-boardtree-text-faint hover:text-boardtree-accent">
              <svg viewBox="0 0 14 14" width="11" height="11"><path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            </button>
          </div>
        ))}
      </div>
      <input
        ref={input_ref}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onUpload(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={is_uploading}
        onClick={() => input_ref.current?.click()}
        className="flex w-full items-center justify-center gap-1.5 rounded-[6px] border border-dashed border-boardtree-border py-1.5 text-[12.5px] text-boardtree-text-muted hover:border-boardtree-accent hover:text-boardtree-accent disabled:opacity-50"
      >
        {is_uploading ? "Uploading…" : "+ Upload file"}
      </button>
    </PopoverPanel>
  );
}
