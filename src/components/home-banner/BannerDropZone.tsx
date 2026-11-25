"use client";
import React, { useState } from "react";
import { ImageUp, Loader2 } from "lucide-react";
import { BANNER_RECOMMENDED_HEIGHT, BANNER_RECOMMENDED_WIDTH } from "./prepareBannerImage";

/** The short answer to "what image do you need?", shown wherever people upload one. */
export const BANNER_SPECS: string[] = [
  `${BANNER_RECOMMENDED_WIDTH} x ${BANNER_RECOMMENDED_HEIGHT} px`,
  "JPG, PNG, WebP, SVG",
  "Up to 40 MB",
];

type BannerDropZoneProps = {
  is_processing: boolean;
  onBrowse: () => void;
  onFile: (file: File) => void;
  /** Optional short line under the title. */
  hint?: string;
};

/** The whole dashed box is the target: click it, drop on it, or paste anywhere in the dialog. */
const BannerDropZone: React.FC<BannerDropZoneProps> = ({ is_processing, onBrowse, onFile, hint }) => {
  const [is_drag_over, setIsDragOver] = useState(false);

  return (
    <div
      role="button"
      tabIndex={is_processing ? -1 : 0}
      aria-label="Upload a banner image"
      aria-busy={is_processing || undefined}
      className="hb-dropzone"
      data-drag-over={is_drag_over || undefined}
      data-processing={is_processing || undefined}
      onClick={() => !is_processing && onBrowse()}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && !is_processing) {
          event.preventDefault();
          onBrowse();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        const file = event.dataTransfer.files?.[0];
        if (file && !is_processing) onFile(file);
      }}
    >
      <span className="hb-dropzone-icon" aria-hidden="true">
        {is_processing ? <Loader2 className="h-7 w-7 animate-spin" /> : <ImageUp className="h-7 w-7" />}
      </span>
      <p className="hb-dropzone-title">
        {is_processing ? "Optimizing..." : is_drag_over ? "Drop it here" : "Drop an image or click to upload"}
      </p>
      {hint && !is_processing ? <p className="hb-dropzone-hint">{hint}</p> : null}
      <ul className="hb-dropzone-specs" aria-label="Image specs">
        {BANNER_SPECS.map((spec) => (
          <li key={spec}>{spec}</li>
        ))}
      </ul>
    </div>
  );
};

export default BannerDropZone;
