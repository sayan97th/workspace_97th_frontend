"use client";

import { Fragment, useCallback, useRef, useState, type ClipboardEvent, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { useDropzone } from "react-dropzone";
import PopoverPanel from "./PopoverPanel";
import CellFileThumb from "../cells/CellFileThumb";
import { PendingThumb } from "../cells/FileUploadStatus";
import type { PendingUpload } from "../cells/useCellFileUploads";
import { CameraIcon, DocIcon, FILE_SOURCES, LinkIcon, PaperclipIcon, PROVIDER_SOURCES, SOURCE_ICONS } from "./fileSources";
import { ACCEPTED_FILE_TYPES, canRenameFile, filesFromClipboard, formatSize, isImageFile, splitFileName } from "./filesCellUtils";
import type { CellFile, CellFileSource } from "../types";
import "@/components/ui/dropdown/action-menu.css";
import "./files-menu.css";

interface FilesMenuProps {
  files: CellFile[];
  /** Files still on their way (queued, uploading, saving or failed), listed under the saved ones. */
  pending_uploads: PendingUpload[];
  /** Entries that just landed, highlighted for a moment. */
  fresh_ids: ReadonlySet<string>;
  onRetryUpload: (batch_id: string) => void;
  /** Forgets a failed or still waiting batch. */
  onDismissUpload: (batch_id: string) => void;
  is_creating_doc: boolean;
  /** Last failed action's message (upload or Doc), shown above the options until the next attempt. */
  upload_error: string | null;
  /** False on a cell the viewer may only read: the entries stay listed, the add options, rename and "×" are hidden. */
  can_edit: boolean;
  /** Raw picked, dropped or pasted files. The caller filters out what the API would reject and reports it. */
  onUpload: (files: File[]) => void;
  /** "From Webcam", the caller closes this menu and opens `WebcamCaptureModal`. */
  onOpenWebcam: () => void;
  /** "Doc", creates a new Doc named after the item and attaches it. */
  onCreateDoc: () => void;
  /** "From Link" and the cloud provider options, the caller closes this menu and opens `FileLinkModal`. */
  onAddLink: (source: CellFileSource) => void;
  /** Saves a new display name. Rejects with the API error, which the rename field shows. */
  onRename: (file_id: string, file_name: string) => Promise<void>;
  /** An image entry's thumbnail or name, the caller closes this menu and opens the lightbox on it. */
  onPreview: (file_id: string) => void;
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

const PASTE_SHORTCUT = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘V" : "Ctrl+V";

function describeEntry(file: CellFile): { icon: ReactNode; meta: string } {
  if (file.kind === "doc") return { icon: <DocIcon />, meta: "Doc" };
  if (file.kind === "link") return { icon: SOURCE_ICONS[file.source ?? "link"](), meta: "Link" };
  const extension = splitFileName(file.file_name).extension.toUpperCase();
  return { icon: <PaperclipIcon />, meta: extension ? `${extension} · ${formatSize(file.size_bytes)}` : formatSize(file.size_bytes) };
}

function readErrorMessage(error: unknown): string {
  const payload = error as { errors?: Record<string, string[]>; message?: string } | undefined;
  const first_field_error = payload?.errors ? Object.values(payload.errors).flat()[0] : undefined;
  return first_field_error ?? payload?.message ?? "The file could not be renamed.";
}

/**
 * A Files cell's popover, styled after monday.com: the cell's current entries
 * (uploads with an image thumbnail, links and Docs, each renamable in place),
 * a drop zone that also takes a pasted image, then the ways to add one in two
 * groups. Local sources first (From Computer, From Webcam, Doc), then links
 * (From Link and the Google Drive, Dropbox, Box and OneDrive & SharePoint
 * variants). Arrow keys move the blue highlight and Enter picks the row.
 */
export default function FilesMenu({
  files,
  pending_uploads,
  fresh_ids,
  onRetryUpload,
  onDismissUpload,
  is_creating_doc,
  upload_error,
  can_edit,
  onUpload,
  onOpenWebcam,
  onCreateDoc,
  onAddLink,
  onRename,
  onPreview,
  onDelete,
  onClose,
}: FilesMenuProps) {
  const [active_index, setActiveIndex] = useState(0);
  const [renaming_id, setRenamingId] = useState<string | null>(null);

  // Uploads never block the menu, more files simply queue behind them. Only a Doc being created does.
  const is_uploading = pending_uploads.some((upload) => upload.status !== "failed");
  const is_busy = is_creating_doc;

  const { getRootProps, getInputProps, isDragActive, open: openFilePicker } = useDropzone({
    onDrop: (dropped) => dropped.length && onUpload(dropped),
    // The cell under this portaled menu is a drop target too, React bubbles through portals.
    noDragEventsBubbling: true,
    noKeyboard: true,
    // No `accept` here: the caller's `prepareUploads` names the rejected files instead of dropping them silently.
    disabled: !can_edit || is_busy,
  });

  const options: MenuOption[] = can_edit
    ? [
        {
          key: "computer",
          label: "From Computer",
          icon: <PaperclipIcon />,
          disabled: is_busy,
          onSelect: openFilePicker,
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
  // component, hence a callback ref and not an effect), so the arrow keys and paste work right away.
  const menu_ref = useRef<HTMLDivElement | null>(null);
  const focusMenu = useCallback((node: HTMLDivElement | null) => {
    menu_ref.current = node;
    node?.focus({ preventScroll: true });
  }, []);

  // The rename field unmounts when it closes, which would drop focus to the page and leave the
  // menu deaf to Escape, the arrow keys and paste. Focus goes back to the menu instead.
  const finishRename = () => {
    setRenamingId(null);
    requestAnimationFrame(() => menu_ref.current?.focus({ preventScroll: true }));
  };

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
      // Kept from the table's window listener, which would also clear the selected cell. The cell
      // stays selected, so Ctrl/Cmd+V right after closing the menu still pastes into it.
      event.stopPropagation();
      onClose();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (!can_edit || is_busy || renaming_id) return;
    const pasted = filesFromClipboard(event.clipboardData);
    if (pasted.length === 0) return;
    // Marks it handled, so `FilesCell`'s window listener does not upload it a second time.
    event.preventDefault();
    onUpload(pasted);
  };

  return (
    <PopoverPanel onClose={onClose} unstyled className="left-1/2 top-full w-max -translate-x-1/2">
      <div ref={focusMenu} tabIndex={-1} onKeyDown={handleKeyDown} onPaste={handlePaste} className="action-menu files-menu outline-none">
        {files.length + pending_uploads.length > 0 && (
          <>
            <div className="action-menu__title files-menu__title">
              Files in this cell
              {files.length > 0 && <span className="files-menu__title-count">{files.length}</span>}
              {is_uploading && <span className="files-menu__title-uploading">Uploading</span>}
            </div>
            <div className="files-menu__entries">
              {files.map((file) =>
                renaming_id === file.id ? (
                  <RenameRow
                    key={file.id}
                    file={file}
                    onSave={async (file_name) => {
                      await onRename(file.id, file_name);
                      finishRename();
                    }}
                    onCancel={finishRename}
                  />
                ) : (
                  <EntryRow
                    key={file.id}
                    file={file}
                    is_fresh={fresh_ids.has(file.id)}
                    can_edit={can_edit}
                    onPreview={() => onPreview(file.id)}
                    onStartRename={() => setRenamingId(file.id)}
                    onDelete={() => onDelete(file.id)}
                  />
                )
              )}
              {pending_uploads.map((upload) => (
                <PendingRow
                  key={upload.id}
                  upload={upload}
                  onRetry={() => onRetryUpload(upload.batch_id)}
                  onDismiss={() => onDismissUpload(upload.batch_id)}
                />
              ))}
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
            <div
              {...getRootProps({
                className: "files-menu__dropzone",
                "aria-label": "Upload files: drop them here, paste or click to browse",
              })}
              data-drag-active={isDragActive || undefined}
            >
              <input {...getInputProps({ accept: ACCEPTED_FILE_TYPES })} />
              <span className="files-menu__dropzone-icon" aria-hidden="true">
                <UploadCloudIcon />
              </span>
              <span className="files-menu__dropzone-text">
                {isDragActive ? (
                  is_uploading ? "Drop to add to the queue" : "Drop to upload"
                ) : (
                  <>
                    Drag files here or <span className="files-menu__dropzone-link">browse</span>
                  </>
                )}
              </span>
              {!isDragActive && (
                <span className="files-menu__dropzone-hint">
                  or paste an image with <kbd>{PASTE_SHORTCUT}</kbd>
                </span>
              )}
            </div>

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

interface EntryRowProps {
  file: CellFile;
  /** Just landed, drawn with a short green highlight. */
  is_fresh: boolean;
  can_edit: boolean;
  onPreview: () => void;
  onStartRename: () => void;
  onDelete: () => void;
}

/** One entry: thumbnail (or type icon), name over its type and size, then the hover rename and remove buttons. */
function EntryRow({ file, is_fresh, can_edit, onPreview, onStartRename, onDelete }: EntryRowProps) {
  const { icon, meta } = describeEntry(file);
  const is_image = isImageFile(file);
  // A Doc opens inside the app, uploads and links open in a new tab, images open the lightbox.
  const is_external = file.kind !== "doc";
  const can_rename = can_edit && canRenameFile(file);

  return (
    <div className="files-menu__entry" data-fresh={is_fresh || undefined} onDoubleClick={can_rename ? onStartRename : undefined}>
      {is_image ? (
        <button type="button" onClick={onPreview} className="files-menu__thumb files-menu__thumb--image" aria-label={`Preview ${file.file_name}`}>
          <CellFileThumb file={file} />
        </button>
      ) : (
        <span className="files-menu__thumb" aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="files-menu__entry-body">
        <a
          href={file.url}
          target={is_external ? "_blank" : undefined}
          rel={is_external ? "noopener noreferrer" : undefined}
          title={file.kind === "link" ? file.url : file.file_name}
          className="files-menu__entry-name"
          onClick={(event) => {
            if (!is_image || event.metaKey || event.ctrlKey || event.shiftKey) return;
            event.preventDefault();
            onPreview();
          }}
        >
          {file.file_name}
        </a>
        <span className="files-menu__entry-meta">{meta}</span>
      </div>
      {can_rename && (
        <button type="button" onClick={onStartRename} aria-label={`Rename ${file.file_name}`} title="Rename" className="files-menu__entry-action">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
            <path d="M10.5 2.5 L13.5 5.5 L5.5 13.5 H2.5 V10.5 Z M9 4 L12 7" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      {can_edit && (
        <button type="button" onClick={onDelete} aria-label={`Remove ${file.file_name}`} title="Remove" className="files-menu__entry-action files-menu__entry-action--danger">
          <svg viewBox="0 0 14 14" width="10" height="10" aria-hidden="true">
            <path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

function pendingMeta(upload: PendingUpload): string {
  const total = formatSize(upload.size_bytes);
  switch (upload.status) {
    case "queued":
      return `Waiting · ${total}`;
    case "uploading":
      return `${Math.round(upload.progress * 100)}% · ${formatSize(Math.round(upload.size_bytes * upload.progress))} of ${total}`;
    case "processing":
      return `Saving · ${total}`;
    case "failed":
      return upload.error ?? "The file could not be uploaded.";
  }
}

interface PendingRowProps {
  upload: PendingUpload;
  onRetry: () => void;
  onDismiss: () => void;
}

/**
 * A file on its way: its local preview (or type badge), name, live progress and a bar along the
 * row. A failed one offers Retry and "×", one still waiting can be dropped with "×".
 */
function PendingRow({ upload, onRetry, onDismiss }: PendingRowProps) {
  const style = { "--upload-progress": upload.status === "processing" ? 1 : upload.progress } as CSSProperties;
  return (
    <div className="files-menu__entry files-menu__pending" data-status={upload.status} style={style}>
      <span className="files-menu__thumb files-menu__pending-thumb" aria-hidden="true">
        <PendingThumb upload={upload} />
      </span>
      <div className="files-menu__entry-body">
        <span className="files-menu__entry-name files-menu__pending-name" title={upload.file_name}>
          {upload.file_name}
        </span>
        <span className="files-menu__entry-meta files-menu__pending-meta" role={upload.status === "failed" ? "alert" : undefined}>
          {upload.status === "processing" && <span className="files-menu__spinner files-menu__spinner--small" aria-hidden="true" />}
          {pendingMeta(upload)}
        </span>
      </div>
      {upload.status === "failed" && (
        <button type="button" onClick={onRetry} aria-label={`Retry uploading ${upload.file_name}`} title="Retry" className="files-menu__entry-action files-menu__pending-action">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
            <path d="M13 8 A5 5 0 1 1 11.5 4.4 M13 2.5 V5 H10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      {(upload.status === "failed" || upload.status === "queued") && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={upload.status === "failed" ? `Dismiss ${upload.file_name}` : `Cancel ${upload.file_name}`}
          title={upload.status === "failed" ? "Dismiss" : "Cancel"}
          className="files-menu__entry-action files-menu__pending-action files-menu__entry-action--danger"
        >
          <svg viewBox="0 0 14 14" width="10" height="10" aria-hidden="true">
            <path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
      <span className="files-menu__pending-bar" aria-hidden="true" />
    </div>
  );
}

interface RenameRowProps {
  file: CellFile;
  onSave: (file_name: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * Inline rename. Like a desktop file manager, only the name before the extension is
 * selected, so typing replaces "screenshot_111" and keeps ".png". Enter or blur saves,
 * Escape cancels. An unchanged or empty name just closes the field.
 */
function RenameRow({ file, onSave, onCancel }: RenameRowProps) {
  const [draft, setDraft] = useState(file.file_name);
  const [is_saving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectBaseName = useCallback(
    (input: HTMLInputElement | null) => {
      if (!input) return;
      input.focus({ preventScroll: true });
      const { base_name, extension } = splitFileName(file.file_name);
      input.setSelectionRange(0, file.kind === "link" || !extension ? file.file_name.length : base_name.length);
    },
    [file.file_name, file.kind]
  );

  const commit = async () => {
    if (is_saving) return;
    const next_name = draft.trim();
    if (!next_name || next_name === file.file_name) {
      onCancel();
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSave(next_name);
    } catch (caught) {
      setError(readErrorMessage(caught));
      setIsSaving(false);
    }
  };

  return (
    <div className="files-menu__rename">
      <div className="files-menu__rename-field" data-invalid={error ? true : undefined}>
        <input
          ref={selectBaseName}
          value={draft}
          disabled={is_saving}
          maxLength={255}
          aria-label={`New name for ${file.file_name}`}
          onChange={(event) => setDraft(event.target.value)}
          // Keys stay in the field, the menu's arrow, Enter and Escape handling must not see them.
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter") {
              event.preventDefault();
              void commit();
            } else if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
          }}
          onBlur={() => void commit()}
          className="files-menu__rename-input"
        />
        <span className="files-menu__rename-status">{is_saving ? <span className="files-menu__spinner files-menu__spinner--small" /> : "Enter"}</span>
      </div>
      {error && (
        <div role="alert" className="files-menu__rename-error">
          {error}
        </div>
      )}
    </div>
  );
}

function UploadCloudIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M7 18.5 H6.5 A4.5 4.5 0 0 1 6.1 9.52 A6 6 0 0 1 17.7 8.6 A4.5 4.5 0 0 1 17.5 18.5 H17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 20 V12.5 M9 15 L12 12 L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
