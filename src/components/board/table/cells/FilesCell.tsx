"use client";

import dynamic from "next/dynamic";
import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { useDropzone } from "react-dropzone";
import type { CellFile, CellFileSource } from "../types";
import FilesMenu from "../menus/FilesMenu";
import FileLinkModal from "../menus/FileLinkModal";
import WebcamCaptureModal from "../menus/WebcamCaptureModal";
import { filesFromClipboard, isImageFile, prepareUploads } from "../menus/filesCellUtils";
import CellHyperlink from "./CellHyperlink";
import CellFileThumb from "./CellFileThumb";
import FilePeekCard from "./FilePeekCard";
import { useCellTooltip } from "./CellTooltip";
import FileUploadStatus from "./FileUploadStatus";
import { readUploadError, useCellFileUploads } from "./useCellFileUploads";
import type { ColumnCenterCellProps } from "./ColumnCenterCells";
import "./files-cell.css";

/** Only fetched the first time someone opens a preview, the table never ships the viewer otherwise. */
const FileImageViewer = dynamic(() => import("../menus/FileImageViewer"), { ssr: false });

/** The tooltip bubble turns into the image preview card, see `file-peek-card.scss`. */
const PEEK_BUBBLE_CLASS = "cell-link-tooltip--card";

/** How long a just added entry keeps its "Uploaded" mark and highlight. */
const FRESH_DISPLAY_MS = 2200;

/** Whether the paste lands in something that takes text itself (a rename field, a comment box), which keeps its own paste. */
function isTextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

/**
 * A Files column's cell. The first entry shows as monday style hyperlink text,
 * with a small thumbnail when it is an image (hover shows a larger preview,
 * click opens the full screen viewer where it can be zoomed and moved around), plus "+N" for the rest. Three quick ways
 * to add files besides the menu:
 * - drag files from the desktop onto the cell, it lights up as a drop target;
 * - Ctrl/Cmd+V while the cell is the active (selected) cell uploads a copied image;
 * - the menu's own drop zone, which also takes a paste while it is open.
 *
 * An upload shows in the cell the moment it starts (`FileUploadStatus`, real progress), more
 * files can be added while it runs (they queue, see `useCellFileUploads`), and the saved entry
 * takes over with a short green "Uploaded" mark, so nobody uploads the same file twice.
 */
export default function FilesCell({ node_id, column, value, state, actions, is_menu_open, openMenu }: ColumnCenterCellProps) {
  const files = Array.isArray(value) && value.every((f) => typeof f === "object" && f !== null) ? (value as CellFile[]) : [];
  const can_edit = actions.canEditCell(node_id, column.id);
  const first_file = files[0];
  const images = files.filter(isImageFile);

  // The in flight "Doc" state, the last failure's message, which link dialog is
  // open (by source), whether the webcam dialog is open and which image the lightbox shows.
  const [is_creating_doc, setIsCreatingDoc] = useState(false);
  const [upload_error, setUploadError] = useState<string | null>(null);
  const [file_link_source, setFileLinkSource] = useState<CellFileSource | null>(null);
  const [is_webcam_open, setIsWebcamOpen] = useState(false);
  const [preview_index, setPreviewIndex] = useState<number | null>(null);

  /** Shows a failure in the menu, opening it when the files came in from a drop or paste on the closed cell. */
  const reportError = (message: string) => {
    setUploadError(message);
    if (!is_menu_open) openMenu();
  };

  // `Promise.resolve`: the read only guard returns undefined instead of a promise.
  const uploads = useCellFileUploads((batch, onProgress) => Promise.resolve(actions.uploadCellFiles(node_id, column.id, batch, onProgress)));

  /**
   * Every way in (picker, drop, paste) lands here: unsupported or oversized files are named, the
   * rest show in the cell at once and upload behind anything already going. A failure stays on
   * the cell with Retry, so it is not reported a second time here.
   */
  const uploadFiles = (incoming: File[]) => {
    if (incoming.length === 0) return;
    const { accepted, error } = prepareUploads(incoming);
    setUploadError(null);
    if (error) reportError(error);
    if (accepted.length === 0) return;
    uploads.enqueue(accepted).done.catch(() => undefined);
  };

  // Entries that just appeared (an upload, a link or a Doc landed) get a short highlight, so the
  // change is noticed even when the cell keeps showing its first file and only "+N" moves.
  const [fresh_ids, setFreshIds] = useState<ReadonlySet<string>>(() => new Set());
  const known_ids_ref = useRef<Set<string> | null>(null);
  const fresh_timer_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const file_ids_key = files.map((file) => file.id).join("|");
  useEffect(() => {
    const ids = file_ids_key ? file_ids_key.split("|") : [];
    const known = known_ids_ref.current;
    known_ids_ref.current = new Set(ids);
    // The first list the cell sees is what was already there, nothing is new.
    if (!known) return;
    const added = ids.filter((id) => !known.has(id));
    if (added.length === 0) return;
    setFreshIds(new Set(added));
    if (fresh_timer_ref.current) clearTimeout(fresh_timer_ref.current);
    fresh_timer_ref.current = setTimeout(() => setFreshIds(new Set()), FRESH_DISPLAY_MS);
  }, [file_ids_key]);
  useEffect(() => () => {
    if (fresh_timer_ref.current) clearTimeout(fresh_timer_ref.current);
  }, []);
  const fresh_files = files.filter((file) => fresh_ids.has(file.id));
  const fresh_label = fresh_files.length === 0 ? null : fresh_files.every((file) => !file.kind || file.kind === "file") ? "Uploaded" : "Added";

  const openPreview = (file_id: string) => {
    const index = images.findIndex((image) => image.id === file_id);
    if (index < 0) return;
    if (is_menu_open) actions.closeCellMenu();
    setPreviewIndex(index);
  };

  const { getRootProps, isDragActive } = useDropzone({
    onDrop: uploadFiles,
    noClick: true,
    noKeyboard: true,
    disabled: !can_edit,
  });

  // Ctrl/Cmd+V on the selected cell. `useBoardTable` leaves the keydown alone for a Files cell, so the
  // browser fires `paste` with the clipboard's files. Without files it falls back to the board's own
  // cell copy and paste. The menu handles a paste while it is open (and marks it handled).
  const is_active = state.active_cell?.node_id === node_id && state.active_cell?.column_id === column.id;
  const onWindowPaste = useEffectEvent((event: globalThis.ClipboardEvent) => {
    if (event.defaultPrevented || is_menu_open || isTextTarget(event.target)) return;
    if (document.activeElement?.closest("[role='dialog']")) return;
    const pasted = filesFromClipboard(event.clipboardData);
    if (pasted.length === 0) {
      actions.pasteIntoActiveCell();
      return;
    }
    event.preventDefault();
    uploadFiles(pasted);
  });
  useEffect(() => {
    if (!is_active || !can_edit) return;
    const listener = (event: globalThis.ClipboardEvent) => onWindowPaste(event);
    window.addEventListener("paste", listener);
    return () => window.removeEventListener("paste", listener);
  }, [is_active, can_edit]);

  const first_is_image = !!first_file && isImageFile(first_file);
  const upload_summary = uploads.summary;

  return (
    <div
      {...getRootProps({ className: "cell-link-host files-cell" })}
      data-drag-active={isDragActive || undefined}
      data-uploading={uploads.is_uploading || undefined}
      data-fresh={fresh_label ? true : undefined}
      data-paste-ready={is_active && can_edit && !is_menu_open ? true : undefined}
    >
      <button type="button" onClick={openMenu} aria-label={files.length > 0 ? "Manage files" : "Add file"} className="cell-link-host__hit-area" />
      {upload_summary ? (
        <FileUploadStatus summary={upload_summary} onRetry={uploads.retry} onDismiss={uploads.dismiss} />
      ) : (
      <div className="cell-link-host__content">
        {first_file ? (
          <>
            {first_is_image && (
              <ThumbButton
                file={first_file}
                peek={<FilePeekCard file={first_file} position={0} total={images.length} />}
                onOpen={() => openPreview(first_file.id)}
              />
            )}
            <CellHyperlink
              href={first_file.url}
              label={first_file.file_name}
              // Links show their URL like monday, images a preview, other uploads and Docs their full name.
              tooltip={
                first_is_image ? (
                  <FilePeekCard file={first_file} position={0} total={images.length} />
                ) : first_file.kind === "link" ? (
                  first_file.url
                ) : (
                  first_file.file_name
                )
              }
              tooltip_class={first_is_image ? PEEK_BUBBLE_CLASS : undefined}
              onOpen={first_is_image ? () => openPreview(first_file.id) : undefined}
              onRemove={can_edit ? () => void actions.deleteCellFile(node_id, column.id, first_file.id) : undefined}
              remove_label={`Remove ${first_file.file_name}`}
            />
            {files.length > 1 && (
              <button
                // A new key replays the bump animation when the count changes.
                key={files.length}
                type="button"
                onClick={openMenu}
                className="cell-link-host__count files-cell__count"
                aria-label={`Show all ${files.length} files`}
              >
                +{files.length - 1}
              </button>
            )}
            {fresh_label && (
              <span className="files-cell__fresh" role="status" title={fresh_label}>
                <svg viewBox="0 0 12 12" width="9" height="9" fill="none" aria-hidden="true">
                  <path d="M2.5 6.2 L5 8.5 L9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {/* Narrow cells keep only the check, the name needs the room. */}
                <span className="files-cell__fresh-text">{fresh_label}</span>
              </span>
            )}
          </>
        ) : (
          can_edit && <AddGlyph />
        )}
      </div>
      )}

      {isDragActive && (
        <div className="files-cell__drop" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
            <path d="M8 11 V3 M5 6 L8 3 L11 6 M3 11 V13 H13 V11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Drop to upload
        </div>
      )}

      {is_menu_open && (
        <FilesMenu
          files={files}
          pending_uploads={uploads.pending}
          fresh_ids={fresh_ids}
          onRetryUpload={uploads.retry}
          onDismissUpload={uploads.dismiss}
          is_creating_doc={is_creating_doc}
          upload_error={upload_error}
          can_edit={can_edit}
          onUpload={uploadFiles}
          onOpenWebcam={() => {
            actions.closeCellMenu();
            setIsWebcamOpen(true);
          }}
          onCreateDoc={() => {
            setIsCreatingDoc(true);
            setUploadError(null);
            Promise.resolve(actions.addCellFileDoc(node_id, column.id))
              .then(() => actions.closeCellMenu())
              .catch((caught) => setUploadError(readUploadError(caught, "The doc could not be created.")))
              .finally(() => setIsCreatingDoc(false));
          }}
          onAddLink={(source) => {
            actions.closeCellMenu();
            setFileLinkSource(source);
          }}
          onRename={async (file_id, file_name) => {
            await actions.renameCellFile(node_id, column.id, file_id, file_name);
          }}
          onPreview={openPreview}
          onDelete={(file_id) => void actions.deleteCellFile(node_id, column.id, file_id)}
          onClose={() => {
            setUploadError(null);
            actions.closeCellMenu();
          }}
        />
      )}
      {file_link_source && (
        <FileLinkModal
          source={file_link_source}
          onSave={async (url, text) => {
            await actions.addCellFileLink(node_id, column.id, url, text, file_link_source);
          }}
          onClose={() => setFileLinkSource(null)}
        />
      )}
      {is_webcam_open && (
        <WebcamCaptureModal
          // Goes through the same queue, so the cell shows it. The dialog shows a failure itself,
          // so a failed photo does not also stay on the cell.
          onUpload={async (photo) => {
            const { batch_id, done } = uploads.enqueue([photo]);
            try {
              await done;
            } catch (caught) {
              uploads.dismiss(batch_id);
              throw caught;
            }
          }}
          onClose={() => setIsWebcamOpen(false)}
        />
      )}
      {preview_index !== null && images.length > 0 && (
        <FileImageViewer images={images} index={Math.min(preview_index, images.length - 1)} onClose={() => setPreviewIndex(null)} />
      )}
    </div>
  );
}

/** The small square image before the name. Hovering it shows the same preview card as the name. */
function ThumbButton({ file, peek, onOpen }: { file: CellFile; peek: ReactNode; onOpen: () => void }) {
  const { anchor_props, hide, tooltip } = useCellTooltip<HTMLButtonElement>(peek, { bubble_class: PEEK_BUBBLE_CLASS });
  return (
    <>
      <button
        type="button"
        {...anchor_props}
        className="files-cell__thumb"
        onClick={() => {
          hide();
          onOpen();
        }}
        aria-label={`Preview ${file.file_name}`}
      >
        <CellFileThumb file={file} />
      </button>
      {tooltip}
    </>
  );
}

/** An empty cell's hover "+", see `.cell-link-host__add`. */
function AddGlyph() {
  return (
    <span className="cell-link-host__add" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
        <path d="M8 3 V13 M3 8 H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}
