"use client";
import React from "react";
import { useDropzone } from "react-dropzone";
import { CheckCircleIcon, Spinner, WarningIcon } from "./importIcons";

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

/** What the import keeps from a file, listed under the drop zone. */
const TIPS = [
  "Columns are matched to your board by name",
  "Exports keep their groups and subitems",
  "New columns get a type that fits their values",
];

/**
 * Step 1 ("Upload"): a single file drop zone styled after monday.com's
 * "Import file" screen. Selecting or dropping a file immediately fires
 * `onFileSelected`, which the wizard turns into an `analyze()` call, so
 * there's no separate "Continue" button on this step.
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
    <div className="iw-upload">
      <div {...getRootProps({ className: "iw-dropzone", "data-drag-active": isDragActive } as React.HTMLAttributes<HTMLDivElement>)}>
        <input {...getInputProps()} aria-label="Choose a file to import" />

        {is_analyzing ? (
          <>
            <span className="iw-progress-badge" aria-hidden="true">
              <Spinner />
            </span>
            <p className="iw-dropzone-title" role="status">
              Reading your file…
            </p>
            <p className="iw-dropzone-hint">This only takes a moment</p>
          </>
        ) : (
          <>
            <button type="button" onClick={open} className="iw-button" data-variant="primary" data-size="small">
              Browse
            </button>
            <p className="iw-dropzone-title">{isDragActive ? "Drop your file here" : "or drag and drop your file"}</p>
            <p className="iw-dropzone-hint">(.csv, .xlsx, and .xls supported)</p>
          </>
        )}
      </div>

      {error && (
        <div className="iw-alert" role="alert">
          <WarningIcon size={16} />
          <span>{error}</span>
        </div>
      )}

      <ul className="iw-upload-tips">
        {TIPS.map((tip) => (
          <li key={tip}>
            <CheckCircleIcon size={16} />
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ImportUploadStep;
