"use client";

import { Fragment, useCallback, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import PopoverPanel from "./PopoverPanel";
import { CameraIcon, DocIcon, FILE_SOURCES, LinkIcon, PaperclipIcon, PROVIDER_SOURCES, SOURCE_ICONS } from "./fileSources";
import type { CellFile, CellFileSource } from "../types";
import "@/components/ui/dropdown/action-menu.css";
import "./files-menu.css";

interface FilesMenuProps {
  files: CellFile[];
  is_uploading: boolean;
  is_creating_doc: boolean;
  /** Last failed action's message (upload or Doc), shown above the options until the next attempt. */
  upload_error: string | null;
  /** False on a cell the viewer may only read: the entries stay listed, the add options and "×" are hidden. */
  can_edit: boolean;
  onUpload: (files: File[]) => void;
  /** "From Webcam", the caller closes this menu and opens `WebcamCaptureModal`. */
  onOpenWebcam: () => void;
  /** "Doc", creates a new Doc named after the item and attaches it. */
  onCreateDoc: () => void;
  /** "From Link" and the cloud provider options, the caller closes this menu and opens `FileLinkModal`. */
  onAddLink: (source: CellFileSource) => void;
  onDelete: (file_id: string) => void;
  onClose: () => void;
}

interface MenuOption {
  key: string;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  /** Starts a new group, drawn as a divider above the row. */
  divider_before?: boolean;
  onSelect: () => void;
}

/** Mirrors the `mimes` rule in the API's `StoreBoardItemCellFileRequest`, so the picker only offers files the server will accept. */
const ACCEPTED_FILE_TYPES = ".pdf,.xlsx,.xls,.csv,.docx,.doc,.pptx,.ppt,.png,.jpg,.jpeg,.gif,.webp";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function describeEntry(file: CellFile): { icon: ReactNode; meta: string } {
  if (file.kind === "doc") return { icon: <DocIcon />, meta: "Doc" };
  if (file.kind === "link") return { icon: SOURCE_ICONS[file.source ?? "link"](), meta: "Link" };
  return { icon: <PaperclipIcon />, meta: formatSize(file.size_bytes) };
}

/**
 * A Files cell's popover, styled after monday.com: the cell's current entries
 * (uploads, links and Docs), then the ways to add one in two groups. Local
 * sources first (From Computer, From Webcam, Doc), then links (From Link and
 * the Google Drive, Dropbox, Box and OneDrive & SharePoint variants, which
 * only accept a link hosted by that provider). Arrow keys move the blue
 * highlight and Enter picks the row, like monday's own menu.
 */
export default function FilesMenu({
  files,
  is_uploading,
  is_creating_doc,
  upload_error,
  can_edit,
  onUpload,
  onOpenWebcam,
  onCreateDoc,
  onAddLink,
  onDelete,
  onClose,
}: FilesMenuProps) {
  const input_ref = useRef<HTMLInputElement>(null);
  const [active_index, setActiveIndex] = useState(0);

  const is_busy = is_uploading || is_creating_doc;
  const options: MenuOption[] = can_edit
    ? [
        {
          key: "computer",
          label: is_uploading ? "Uploading…" : "From Computer",
          icon: <PaperclipIcon />,
          disabled: is_busy,
          onSelect: () => input_ref.current?.click(),
        },
        { key: "webcam", label: "From Webcam", icon: <CameraIcon />, disabled: is_busy, onSelect: onOpenWebcam },
        { key: "doc", label: is_creating_doc ? "Creating doc…" : "Doc", icon: <DocIcon />, disabled: is_busy, onSelect: onCreateDoc },
        { key: "link", label: FILE_SOURCES.link.menu_label, icon: <LinkIcon />, divider_before: true, disabled: is_busy, onSelect: () => onAddLink("link") },
        ...PROVIDER_SOURCES.map((source) => ({
          key: source,
          label: FILE_SOURCES[source].menu_label,
          icon: SOURCE_ICONS[source](),
          disabled: is_busy,
          onSelect: () => onAddLink(source),
        })),
      ]
    : [];

  // Keyboard first: the menu takes focus as soon as `PopoverPanel` mounts it (a pass after this
  // component, hence a callback ref and not an effect), so the arrow keys work right away.
  const focusMenu = useCallback((node: HTMLDivElement | null) => node?.focus({ preventScroll: true }), []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (options.length === 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => (current + step + options.length) % options.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = options[active_index];
      if (option && !option.disabled) option.onSelect();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <PopoverPanel onClose={onClose} unstyled className="left-1/2 top-full w-max -translate-x-1/2">
      <div ref={focusMenu} tabIndex={-1} onKeyDown={handleKeyDown} className="action-menu files-menu outline-none">
        {files.length > 0 && (
          <>
            <div className="action-menu__title">Files in this cell</div>
            <div className="files-menu__entries">
              {files.map((file) => {
                const { icon, meta } = describeEntry(file);
                // A Doc opens inside the app, uploads and links open in a new tab.
                const is_external = file.kind !== "doc";
                return (
                  <div key={file.id} className="files-menu__entry">
                    <span className="files-menu__entry-icon">{icon}</span>
                    <a
                      href={file.url}
                      target={is_external ? "_blank" : undefined}
                      rel={is_external ? "noopener noreferrer" : undefined}
                      title={file.kind === "link" ? file.url : file.file_name}
                      className="files-menu__entry-name"
                    >
                      {file.file_name}
                    </a>
                    <span className="files-menu__entry-meta">{meta}</span>
                    {can_edit && (
                      <button
                        type="button"
                        onClick={() => onDelete(file.id)}
                        aria-label={`Remove ${file.file_name}`}
                        className="files-menu__entry-remove"
                      >
                        <svg viewBox="0 0 14 14" width="10" height="10" aria-hidden="true">
                          <path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {options.length > 0 && <div className="action-menu__divider" role="separator" />}
          </>
        )}

        {upload_error && (
          <div role="alert" className="files-menu__error">
            {upload_error}
          </div>
        )}

        {options.length > 0 && (
          <>
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
              {options.map((option, index) => (
                <Fragment key={option.key}>
                  {option.divider_before && <div className="action-menu__divider" role="separator" />}
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    aria-disabled={option.disabled || undefined}
                    data-active={index === active_index}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => !option.disabled && option.onSelect()}
                    className="action-menu__item"
                  >
                    <span className="action-menu__icon">{option.icon}</span>
                    <span className="action-menu__label">{option.label}</span>
                  </button>
                </Fragment>
              ))}
            </div>
          </>
        )}
      </div>
    </PopoverPanel>
  );
}
