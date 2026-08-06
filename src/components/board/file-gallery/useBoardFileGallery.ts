"use client";
import { useEffect, useMemo, useState } from "react";
import { boardViewFilesService } from "@/services/board-view-files.service";
import type { BoardViewFileDto } from "@/types/board-view-files";
import { classifyAttachment } from "../drawer";
import type { FileGallerySortBy, FileGallerySortDir, FileGalleryViewMode } from "./types";

export type BoardFileGalleryConfig = {
  board_id: number;
  view_id: number;
};

export type BoardFileGalleryApi = {
  is_loading: boolean;
  error: string | null;
  files: BoardViewFileDto[];
  /** `files`, narrowed by `search_query` and ordered by `sort_by`/`sort_dir`. */
  visible_files: BoardViewFileDto[];

  is_uploading: boolean;
  upload_error: string | null;
  dismissUploadError: () => void;
  uploadFiles: (files: File[]) => Promise<void>;
  deleteFile: (file_id: number) => Promise<void>;

  search_query: string;
  setSearchQuery: (value: string) => void;
  sort_by: FileGallerySortBy;
  sort_dir: FileGallerySortDir;
  setSortBy: (sort_by: FileGallerySortBy) => void;
  toggleSortDir: () => void;
  view_mode: FileGalleryViewMode;
  setViewMode: (mode: FileGalleryViewMode) => void;
};

/** Sortable key per file — `classifyAttachment`'s tag ("PDF"/"IMG"/…) doubles as the "Type" sort key. */
const sortValue = (file: BoardViewFileDto, sort_by: FileGallerySortBy): string | number => {
  switch (sort_by) {
    case "name":
      return file.file_name.toLowerCase();
    case "size":
      return file.size_bytes;
    case "type":
      return classifyAttachment(file.file_name).tag;
    case "date":
    default:
      return new Date(file.created_at).getTime();
  }
};

/**
 * Owns a Files Gallery tab's data (fetch/upload/delete) and its purely local
 * display preferences (search/sort/grid-vs-list) — self-contained so
 * `BoardFileGalleryView` only has to render, mirroring how `useBoardToolbar`
 * separates board-table state from `BoardTable`'s rendering.
 */
const useBoardFileGallery = ({ board_id, view_id }: BoardFileGalleryConfig): BoardFileGalleryApi => {
  const [files, setFiles] = useState<BoardViewFileDto[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [is_uploading, setIsUploading] = useState(false);
  const [upload_error, setUploadError] = useState<string | null>(null);

  const [search_query, setSearchQuery] = useState("");
  const [sort_by, setSortByState] = useState<FileGallerySortBy>("date");
  const [sort_dir, setSortDir] = useState<FileGallerySortDir>("desc");
  const [view_mode, setViewMode] = useState<FileGalleryViewMode>("grid");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    boardViewFilesService
      .listFiles(board_id, view_id)
      .then((data) => {
        if (!cancelled) setFiles(data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load files. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [board_id, view_id]);

  const uploadFiles = async (new_files: File[]) => {
    if (new_files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const uploaded = await boardViewFilesService.uploadFiles(board_id, view_id, new_files);
      setFiles((current) => [...uploaded, ...current]);
    } catch {
      setUploadError("Couldn't upload one or more files. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (file_id: number) => {
    const previous = files;
    setFiles((current) => current.filter((file) => file.id !== file_id));
    try {
      await boardViewFilesService.deleteFile(board_id, view_id, file_id);
    } catch {
      setFiles(previous);
      setUploadError("Couldn't delete that file. Please try again.");
    }
  };

  const setSortBy = (next: FileGallerySortBy) => {
    // Picking a new sort key starts from its most useful direction — newest
    // first for "date" (the default), A→Z for everything else — rather than
    // carrying over whatever direction the previous key happened to be on.
    setSortByState(next);
    setSortDir(next === "date" ? "desc" : "asc");
  };

  const toggleSortDir = () => setSortDir((current) => (current === "asc" ? "desc" : "asc"));

  const visible_files = useMemo(() => {
    const query = search_query.trim().toLowerCase();
    const filtered = query ? files.filter((file) => file.file_name.toLowerCase().includes(query)) : files;

    const sorted = [...filtered].sort((a, b) => {
      const a_value = sortValue(a, sort_by);
      const b_value = sortValue(b, sort_by);
      if (a_value < b_value) return sort_dir === "asc" ? -1 : 1;
      if (a_value > b_value) return sort_dir === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [files, search_query, sort_by, sort_dir]);

  return {
    is_loading,
    error,
    files,
    visible_files,
    is_uploading,
    upload_error,
    dismissUploadError: () => setUploadError(null),
    uploadFiles,
    deleteFile,
    search_query,
    setSearchQuery,
    sort_by,
    sort_dir,
    setSortBy,
    toggleSortDir,
    view_mode,
    setViewMode,
  };
};

export default useBoardFileGallery;
