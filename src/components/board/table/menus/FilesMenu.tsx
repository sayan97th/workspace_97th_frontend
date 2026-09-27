"use client";

import { useRef, type ReactNode } from "react";
import PopoverPanel from "./PopoverPanel";
import type { CellFile } from "../types";

interface FilesMenuProps {
  files: CellFile[];
  is_uploading: boolean;
  /** Last failed upload's message, shown above the options until the next attempt. */
  upload_error: string | null;
  onUpload: (files: File[]) => void;
  /** "From Link", the caller closes this menu and opens `FileLinkModal`. */
  onAddLink: () => void;
  onDelete: (file_id: string) => void;
  onClose: () => void;
}

/** Mirrors the `mimes` rule in the API's `StoreBoardItemCellFileRequest`, so the picker only offers files the server will accept. */
const ACCEPTED_FILE_TYPES = ".pdf,.xlsx,.xls,.csv,.docx,.doc,.pptx,.ppt,.png,.jpg,.jpeg,.gif,.webp";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
      <path
        d="M11.5 5 L6.4 10.1 A1.9 1.9 0 0 0 9.1 12.8 L13.4 8.5 A3.2 3.2 0 0 0 8.9 4 L4.3 8.6 A4.4 4.4 0 0 0 10.5 14.8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LinkGlyph({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" aria-hidden="true">
      <path
        d="M6.5 9.5 L9.5 6.5 M7 5 l1.6-1.6 a2.4 2.4 0 0 1 3.4 3.4 L10.4 8.4 M9 11 l-1.6 1.6 a2.4 2.4 0 0 1-3.4-3.4 L5.6 7.6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FileGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
      <path d="M4 1.8 h5 l3 3 v9.4 H4 Z M9 1.8 v3 h3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function MenuOption({ icon, label, disabled, onClick }: { icon: ReactNode; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-left text-[13.5px] text-boardtree-text hover:bg-boardtree-hover focus-visible:bg-boardtree-hover focus-visible:outline-none disabled:opacity-50"
    >
      <span className="flex h-4 w-4 flex-none items-center justify-center text-boardtree-text-muted">{icon}</span>
      {label}
    </button>
  );
}

/**
 * A Files cell's popover: the cell's current entries (uploads and links),
 * then the two ways to add one, "From Computer" (native file picker) and
 * "From Link" (an external URL, entered in `FileLinkModal`).
 */
export default function FilesMenu({ files, is_uploading, upload_error, onUpload, onAddLink, onDelete, onClose }: FilesMenuProps) {
  const input_ref = useRef<HTMLInputElement>(null);

  return (
    <PopoverPanel onClose={onClose} className="left-1/2 top-full w-[280px] -translate-x-1/2 p-2">
      {files.length > 0 && (
        <>
          <div className="max-h-52 overflow-y-auto">
            {files.map((file) => {
              const is_link = file.kind === "link";
              return (
                <div key={file.id} className="group flex items-center gap-2 rounded-[5px] px-2 py-1.5 hover:bg-boardtree-hover">
                  <span className="flex-none text-boardtree-text-faint">{is_link ? <LinkGlyph size={13} /> : <FileGlyph />}</span>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={is_link ? file.url : file.file_name}
                    className="min-w-0 flex-1 truncate text-[12.5px] text-boardtree-text hover:underline"
                  >
                    {file.file_name}
                  </a>
                  <span className="flex-none text-[10.5px] text-boardtree-text-faint">{is_link ? "Link" : formatSize(file.size_bytes)}</span>
                  <button
                    type="button"
                    onClick={() => onDelete(file.id)}
                    aria-label={`Remove ${file.file_name}`}
                    className="flex-none text-boardtree-text-faint hover:text-boardtree-accent"
                  >
                    <svg viewBox="0 0 14 14" width="11" height="11" aria-hidden="true">
                      <path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mx-1 my-1.5 h-px bg-boardtree-border-soft" />
        </>
      )}

      {upload_error && (
        <div role="alert" className="mx-1 mb-1.5 rounded-[6px] bg-[rgba(226,68,92,0.12)] px-2.5 py-1.5 text-[12px] text-boardtree-danger">
          {upload_error}
        </div>
      )}

      <input
        ref={input_ref}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onUpload(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
      <div role="menu" aria-label="Add file">
        <MenuOption
          icon={<PaperclipIcon />}
          label={is_uploading ? "Uploading…" : "From Computer"}
          disabled={is_uploading}
          onClick={() => input_ref.current?.click()}
        />
        <MenuOption icon={<LinkGlyph />} label="From Link" onClick={onAddLink} />
      </div>
    </PopoverPanel>
  );
}
