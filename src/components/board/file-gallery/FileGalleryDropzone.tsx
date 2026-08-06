"use client";
import React from "react";
import { useDropzone } from "react-dropzone";

export type FileGalleryDropzoneProps = {
  onDropFiles: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
  children: (state: { is_drag_active: boolean; open: () => void }) => React.ReactNode;
};

/**
 * Generic multi-file dropzone shell built on `react-dropzone` — any board
 * view that needs drag-and-drop upload (Files Gallery today, an item's
 * attachment panel tomorrow) can wrap its content in this instead of
 * hand-rolling drag/drop event handlers. `noClick`/`noKeyboard` are set
 * because the zone wraps the *whole* gallery body (grid cards, toolbar, …) —
 * clicking a file card must not pop the OS file picker. `open()` is handed
 * back via render prop so the caller's own "Add files" button (or empty
 * state CTA) can trigger that picker deliberately instead.
 */
const FileGalleryDropzone: React.FC<FileGalleryDropzoneProps> = ({ onDropFiles, disabled, className, children }) => {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (accepted_files) => {
      if (accepted_files.length > 0) onDropFiles(accepted_files);
    },
    disabled,
    noClick: true,
    noKeyboard: true,
  });

  return (
    <div {...getRootProps({ className })}>
      <input {...getInputProps()} />
      {children({ is_drag_active: isDragActive, open })}
    </div>
  );
};

export default FileGalleryDropzone;
