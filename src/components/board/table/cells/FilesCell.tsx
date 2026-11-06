"use client";

import dynamic from "next/dynamic";
import { useEffect, useEffectEvent, useState } from "react";
import { useDropzone } from "react-dropzone";
import type { CellFile, CellFileSource } from "../types";
import FilesMenu from "../menus/FilesMenu";
import FileLinkModal from "../menus/FileLinkModal";
import WebcamCaptureModal from "../menus/WebcamCaptureModal";
import { filesFromClipboard, isImageFile, prepareUploads } from "../menus/filesCellUtils";
import CellHyperlink from "./CellHyperlink";
import CellFileThumb from "./CellFileThumb";
import type { ColumnCenterCellProps } from "./ColumnCenterCells";
import "./files-cell.css";

/** Only fetched the first time someone opens a preview, the table never ships the viewer otherwise. */
const FileImageViewer = dynamic(() => import("../menus/FileImageViewer"), { ssr: false });

type ApiError = { errors?: Record<string, string[]>; message?: string };

function readApiError(error: unknown, fallback: string): string {
  const payload = error as ApiError | undefined;
  const first_field_error = payload?.errors ? Object.values(payload.errors).flat()[0] : undefined;
  return first_field_error ?? payload?.message ?? fallback;
}

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
 */
export default function FilesCell({ node_id, column, value, state, actions, is_menu_open, openMenu }: ColumnCenterCellProps) {
  const files = Array.isArray(value) && value.every((f) => typeof f === "object" && f !== null) ? (value as CellFile[]) : [];
  const can_edit = actions.canEditCell(node_id, column.id);
  const first_file = files[0];
  const images = files.filter(isImageFile);

  // The in flight "Upload" and "Doc" state, the last failure's message, which link dialog is
  // open (by source), whether the webcam dialog is open and which image the lightbox shows.
  const [is_uploading, setIsUploading] = useState(false);
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

  /** Every way in (picker, drop, paste) lands here: unsupported or oversized files are named, the rest upload. */
  const uploadFiles = (incoming: File[]) => {
    if (is_uploading || incoming.length === 0) return;
    const { accepted, error } = prepareUploads(incoming);
    setUploadError(null);
    if (error) reportError(error);
    if (accepted.length === 0) return;
    setIsUploading(true);
    // `Promise.resolve`: the read only guard returns undefined instead of a promise.
    Promise.resolve(actions.uploadCellFiles(node_id, column.id, accepted))
      .catch((caught) => reportError(readApiError(caught, "The file could not be uploaded.")))
      .finally(() => setIsUploading(false));
  };

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

  return (
    <div
      {...getRootProps({ className: "cell-link-host files-cell" })}
      data-drag-active={isDragActive || undefined}
      data-uploading={is_uploading || undefined}
      data-paste-ready={is_active && can_edit && !is_menu_open ? true : undefined}
    >
      <button type="button" onClick={openMenu} aria-label={files.length > 0 ? "Manage files" : "Add file"} className="cell-link-host__hit-area" />
      <div className="cell-link-host__content">
        {first_file ? (
          <>
            {first_is_image && (
              <button
                type="button"
                className="files-cell__thumb"
                onClick={() => openPreview(first_file.id)}
                aria-label={`Preview ${first_file.file_name}`}
              >
                <CellFileThumb file={first_file} />
              </button>
            )}
            <CellHyperlink
              href={first_file.url}
              label={first_file.file_name}
              // Links show their URL like monday, images a preview, other uploads and Docs their full name.
              tooltip={first_is_image ? <ImageTooltip file={first_file} /> : first_file.kind === "link" ? first_file.url : first_file.file_name}
              onOpen={first_is_image ? () => openPreview(first_file.id) : undefined}
              onRemove={can_edit ? () => void actions.deleteCellFile(node_id, column.id, first_file.id) : undefined}
              remove_label={`Remove ${first_file.file_name}`}
            />
            {files.length > 1 && (
              <button type="button" onClick={openMenu} className="cell-link-host__count" aria-label={`Show all ${files.length} files`}>
                +{files.length - 1}
              </button>
            )}
          </>
        ) : (
          can_edit && <AddGlyph />
        )}
      </div>

      {isDragActive && (
        <div className="files-cell__drop" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
            <path d="M8 11 V3 M5 6 L8 3 L11 6 M3 11 V13 H13 V11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Drop to upload
        </div>
      )}
      {is_uploading && <div className="files-cell__progress" role="progressbar" aria-label="Uploading files" />}

      {is_menu_open && (
        <FilesMenu
          files={files}
          is_uploading={is_uploading}
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
              .catch((caught) => setUploadError(readApiError(caught, "The doc could not be created.")))
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
          onUpload={async (photo) => {
            await actions.uploadCellFiles(node_id, column.id, [photo]);
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

/** The hover bubble of an image entry: the picture itself over its name. Fixed size, so the bubble is placed before the image loads. */
function ImageTooltip({ file }: { file: CellFile }) {
  return (
    <span className="files-cell-preview">
      <span className="files-cell-preview__frame">
        <CellFileThumb file={file} loading="eager" />
      </span>
      <span className="files-cell-preview__name">{file.file_name}</span>
      <span className="files-cell-preview__hint">Click to view full size</span>
    </span>
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
