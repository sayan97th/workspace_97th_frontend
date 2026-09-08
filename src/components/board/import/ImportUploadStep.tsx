"use client";
import React from "react";
import { useDropzone } from "react-dropzone";

export type ImportUploadStepProps = {
  is_analyzing: boolean;
  error: string | null;
  onFileSelected: (file: File) => void;
};

const ACCEPT = {
  "text/csv": [".csv"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
};

/**
 * Step 1 ("Upload") — a single-file dropzone. Selecting/dropping a file
 * immediately fires `onFileSelected`, which the parent wizard turns into an
 * `analyze()` call; there's no separate "Continue" button on this step.
 */
const ImportUploadStep: React.FC<ImportUploadStepProps> = ({ is_analyzing, error, onFileSelected }) => {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: ACCEPT,
    multiple: false,
    noClick: true,
    noKeyboard: true,
    disabled: is_analyzing,
    onDrop: (accepted_files) => {
      if (accepted_files[0]) onFileSelected(accepted_files[0]);
    },
  });

  return (
    <div className="flex flex-1 flex-col px-8 py-8">
      <div
        {...getRootProps()}
        className={`flex flex-1 flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed px-8 py-14 text-center transition-colors ${
          isDragActive ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-shell-border-strong"
        }`}
      >
        <input {...getInputProps()} />

        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-shell-hover text-shell-text-muted">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 15V4M12 4L8 8M12 4l4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        {is_analyzing ? (
          <span className="text-[15px] font-medium text-shell-text-secondary">Reading your file…</span>
        ) : (
          <>
            <button
              type="button"
              onClick={open}
              className="rounded-lg bg-brand-500 px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-brand-600"
            >
              Browse
            </button>
            <p className="text-[15px] font-medium text-shell-text-secondary">or drag and drop your file</p>
            <p className="text-[13px] text-shell-text-muted">(.csv, .xlsx, and .xls supported)</p>
          </>
        )}
      </div>

      {error && <p className="mt-4 text-center text-[13px] text-error-500">{error}</p>}
    </div>
  );
};

export default ImportUploadStep;
