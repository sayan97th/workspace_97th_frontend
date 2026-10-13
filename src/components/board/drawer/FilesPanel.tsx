import React, { useState } from "react";
import { CloseIcon, PlusIcon } from "@/icons/board-icons";
import { FilesTabIcon } from "@/icons/drawer-icons";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import FileGalleryDropzone from "../file-gallery/FileGalleryDropzone";
import CommentAttachmentChip from "./CommentAttachmentChip";
import type { BoardItemDrawerApi, DrawerAttachment } from "./types";
import "./board-drawer.css";

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
  const [pending_delete_attachment, setPendingDeleteAttachment] = useState<DrawerAttachment | null>(null);

  return (
    <FileGalleryDropzone
      onDropFiles={drawer.postAttachments}
      disabled={drawer.is_uploading_files}
      className="board-drawer__panel relative"
    >
      {({ is_drag_active, open }) => (
        <>
          {drawer.files_upload_error && (
            <div role="alert" className="board-drawer__error board-drawer__error--row">
              <span className="flex-1">{drawer.files_upload_error}</span>
              <button
                type="button"
                onClick={drawer.dismissFilesUploadError}
                aria-label="Dismiss"
                className="board-drawer__banner-close"
              >
                <CloseIcon size={11} />
              </button>
            </div>
          )}

          {has_files ? (
            <div className="shell-scrollbar board-drawer__scroll !pt-5">
              <div className="drawer-files__toolbar">
                <span className="drawer-files__count">
                  {attachments.length} file{attachments.length === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  onClick={open}
                  disabled={drawer.is_uploading_files}
                  className="board-drawer__button board-drawer__button--small"
                >
                  <PlusIcon size={12} />
                  {drawer.is_uploading_files ? "Uploading..." : "Add files"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {attachments.map((attachment) => (
                  <CommentAttachmentChip
                    key={attachment.id}
                    attachment={attachment}
                    onDelete={attachment.can_delete ? setPendingDeleteAttachment : undefined}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="shell-scrollbar board-drawer__scroll">
              <div className="board-drawer__empty">
                <span className="board-drawer__empty-icon">
                  <FilesTabIcon size={26} />
                </span>
                <h3 className="board-drawer__empty-title">No files yet</h3>
                <p className="board-drawer__empty-text">
                  Drag and drop files anywhere on this panel, or browse to share the first one on {drawer.open_row_title}.
                </p>
                <button
                  type="button"
                  onClick={open}
                  disabled={drawer.is_uploading_files}
                  className="board-drawer__button board-drawer__button--primary mt-2"
                >
                  <PlusIcon size={13} />
                  {drawer.is_uploading_files ? "Uploading..." : "Browse files"}
                </button>
              </div>
            </div>
          )}

          {is_drag_active && (
            <div className="drawer-files__drop">
              <FilesTabIcon size={32} />
              <p>Drop files to upload</p>
            </div>
          )}

          <ConfirmActionModal
            is_open={pending_delete_attachment !== null}
            title="Delete file"
            description={
              <>
                Are you sure you want to delete &ldquo;{pending_delete_attachment?.file_name}&rdquo;? This can&rsquo;t be undone.
              </>
            }
            confirm_label="Delete file"
            danger
            onClose={() => setPendingDeleteAttachment(null)}
            onConfirm={() => {
              if (pending_delete_attachment) drawer.deleteAttachment(pending_delete_attachment.id);
              setPendingDeleteAttachment(null);
            }}
          />
        </>
      )}
    </FileGalleryDropzone>
  );
}

export default FilesPanel;
