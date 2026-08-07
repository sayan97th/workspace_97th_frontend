import React from "react";
import { CloseIcon, PlusIcon } from "@/icons/board-icons";
import { FilesTabIcon } from "@/icons/drawer-icons";
import FileGalleryDropzone from "../file-gallery/FileGalleryDropzone";
import CommentAttachmentChip from "./CommentAttachmentChip";
import type { BoardItemDrawerApi } from "./types";

export type FilesPanelProps<TRow> = {
  drawer: BoardItemDrawerApi<TRow>;
};

/**
 * The drawer's "Files" tab: every attachment across `drawer`'s comments
 * (aggregated as `all_attachments`), plus a drag-and-drop dropzone — wrapping
 * `FileGalleryDropzone` — so a viewer can share a file on this item without
 * detouring through the Updates composer. Uploads go through the same
 * `drawer.postAttachments` bodiless-comment call Kanban's paperclip button
 * already uses, so a file dropped here shows up identically everywhere
 * `all_attachments` is read.
 */
function FilesPanel<TRow>({ drawer }: FilesPanelProps<TRow>) {
  const attachments = drawer.all_attachments;
  const has_files = attachments.length > 0;

  return (
    <FileGalleryDropzone
      onDropFiles={drawer.postAttachments}
      disabled={drawer.is_uploading_files}
      className="relative flex min-h-0 flex-1 flex-col"
    >
      {({ is_drag_active, open }) => (
        <>
          {drawer.files_upload_error && (
            <div className="mx-5 mt-4 flex items-center gap-2 rounded-[10px] border border-[#e2445c] bg-[rgba(226,68,92,0.12)] px-3.5 py-2.5 text-[12.5px] font-semibold text-[#e2445c]">
              <span className="flex-1">{drawer.files_upload_error}</span>
              <button
                type="button"
                onClick={drawer.dismissFilesUploadError}
                aria-label="Dismiss"
                className="flex h-5 w-5 flex-none items-center justify-center rounded hover:bg-[rgba(226,68,92,0.2)]"
              >
                <CloseIcon size={11} />
              </button>
            </div>
          )}

          {has_files ? (
            <div className="shell-scrollbar min-h-0 flex-1 overflow-auto px-5 py-5">
              <div className="mb-3.5 flex items-center justify-between">
                <span className="text-[12.5px] font-bold text-shell-text-faint">
                  {attachments.length} file{attachments.length === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  onClick={open}
                  disabled={drawer.is_uploading_files}
                  className="flex items-center gap-1.5 rounded-[7px] border border-shell-border-strong px-2.5 py-1.5 text-[12.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover hover:text-shell-text disabled:opacity-60"
                >
                  <PlusIcon size={12} />
                  {drawer.is_uploading_files ? "Uploading…" : "Add files"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {attachments.map((attachment) => (
                  <CommentAttachmentChip key={attachment.id} attachment={attachment} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-6 text-center text-shell-text-faint">
              <FilesTabIcon size={46} className="mb-3.5 text-shell-text-faint" />
              <div className="text-[15px] font-bold text-shell-text-secondary">No files yet</div>
              <div className="mt-1.5 max-w-[280px] text-[13px] leading-relaxed">
                Drag and drop files anywhere on this panel, or browse to share the first one on {drawer.open_row_title}.
              </div>
              <button
                type="button"
                onClick={open}
                disabled={drawer.is_uploading_files}
                className="mt-4 flex items-center gap-1.5 rounded-[7px] border border-shell-border-strong px-3 py-1.5 text-[12.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover hover:text-shell-text disabled:opacity-60"
              >
                <PlusIcon size={13} />
                {drawer.is_uploading_files ? "Uploading…" : "Browse files"}
              </button>
            </div>
          )}

          {is_drag_active && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#00c875] bg-shell-panel/90">
              <FilesTabIcon size={32} className="text-[#00c875]" />
              <p className="text-[14px] font-semibold text-shell-text">Drop files to upload</p>
            </div>
          )}
        </>
      )}
    </FileGalleryDropzone>
  );
}

export default FilesPanel;
