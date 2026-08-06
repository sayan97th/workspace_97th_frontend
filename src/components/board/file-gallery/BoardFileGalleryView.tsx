"use client";
import React, { useState } from "react";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { CloseIcon } from "@/icons/board-icons";
import { BoardGridIcon } from "@/icons/workspace-icons";
import type { BoardViewFileDto } from "@/types/board-view-files";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import FileGalleryDropzone from "./FileGalleryDropzone";
import FileGalleryEmptyState from "./FileGalleryEmptyState";
import FileGalleryGrid from "./FileGalleryGrid";
import FileGalleryListView from "./FileGalleryListView";
import FileGalleryToolbar from "./FileGalleryToolbar";
import useBoardFileGallery, { type BoardFileGalleryConfig } from "./useBoardFileGallery";

export type BoardFileGalleryViewProps = BoardFileGalleryConfig;

/**
 * The "Files gallery" board view — a Monday-style dropzone gallery of every
 * file uploaded to this tab. Self-contained: given just `board_id`/`view_id`
 * it fetches, uploads to and deletes from `boardViewFilesService` on its
 * own, so `TableBoardView` only has to mount it (same division of
 * responsibility as `BoardDocView` owning its own autosave).
 */
const BoardFileGalleryView: React.FC<BoardFileGalleryViewProps> = ({ board_id, view_id }) => {
  const gallery = useBoardFileGallery({ board_id, view_id });
  const [pending_delete_file, setPendingDeleteFile] = useState<BoardViewFileDto | null>(null);

  if (gallery.error) {
    return <CenteredMessage title="Something went wrong" detail={gallery.error} />;
  }

  if (gallery.is_loading) {
    return <BoardLoadingSpinner />;
  }

  const has_any_files = gallery.files.length > 0;
  const has_visible_files = gallery.visible_files.length > 0;

  return (
    <>
      <FileGalleryDropzone onDropFiles={(files) => void gallery.uploadFiles(files)} disabled={gallery.is_uploading}>
        {({ is_drag_active, open }) => (
          <div className="relative flex flex-col gap-3">
            {gallery.upload_error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-500">
                <span className="flex-1">{gallery.upload_error}</span>
                <button
                  type="button"
                  onClick={gallery.dismissUploadError}
                  className="flex h-5 w-5 flex-none items-center justify-center rounded hover:bg-red-500/15"
                  aria-label="Dismiss"
                >
                  <CloseIcon size={11} />
                </button>
              </div>
            )}

            <FileGalleryToolbar
              file_count={gallery.files.length}
              search_query={gallery.search_query}
              onSearchChange={gallery.setSearchQuery}
              sort_by={gallery.sort_by}
              sort_dir={gallery.sort_dir}
              onChangeSortBy={gallery.setSortBy}
              onToggleSortDir={gallery.toggleSortDir}
              view_mode={gallery.view_mode}
              onChangeViewMode={gallery.setViewMode}
              onAddFilesClick={open}
              is_uploading={gallery.is_uploading}
            />

            {!has_any_files ? (
              <FileGalleryEmptyState onBrowseFiles={open} />
            ) : !has_visible_files ? (
              <div className="flex flex-col items-center justify-center gap-1 py-16 text-center text-shell-text-muted">
                <p className="text-[13.5px]">No files match &ldquo;{gallery.search_query}&rdquo;.</p>
              </div>
            ) : gallery.view_mode === "grid" ? (
              <FileGalleryGrid files={gallery.visible_files} onDeleteFile={setPendingDeleteFile} />
            ) : (
              <FileGalleryListView files={gallery.visible_files} onDeleteFile={setPendingDeleteFile} />
            )}

            {is_drag_active && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-500 bg-shell-bg/90">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-500">
                  <BoardGridIcon size={26} />
                </span>
                <p className="text-[14px] font-semibold text-shell-text">Drop files to upload</p>
              </div>
            )}
          </div>
        )}
      </FileGalleryDropzone>

      <ConfirmActionModal
        is_open={pending_delete_file !== null}
        title="Delete file"
        description={
          <>
            Are you sure you want to delete &ldquo;{pending_delete_file?.file_name}&rdquo;? This can&rsquo;t be undone.
          </>
        }
        confirm_label="Delete file"
        danger
        onClose={() => setPendingDeleteFile(null)}
        onConfirm={() => {
          if (pending_delete_file) void gallery.deleteFile(pending_delete_file.id);
        }}
      />
    </>
  );
};

export default BoardFileGalleryView;
