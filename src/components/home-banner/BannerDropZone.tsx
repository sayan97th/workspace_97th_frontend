"use client";
import React, { useState } from "react";
import { ImageUp, Loader2 } from "lucide-react";
import {
  BANNER_MIN_HEIGHT,
  BANNER_MIN_WIDTH,
  BANNER_RECOMMENDED_HEIGHT,
  BANNER_RECOMMENDED_WIDTH,
} from "./prepareBannerImage";

/** The answer to "what kind of image do you need, with what specs?", shown right where people upload. */
export const BANNER_SPECS: { label: string; value: string }[] = [
  { label: "Best size", value: `${BANNER_RECOMMENDED_WIDTH} x ${BANNER_RECOMMENDED_HEIGHT} px (3:1)` },
  { label: "Smallest", value: `${BANNER_MIN_WIDTH} x ${BANNER_MIN_HEIGHT} px` },
  { label: "Formats", value: "JPG, PNG, WebP, SVG, GIF, AVIF" },
  { label: "File size", value: "Up to 40 MB, optimized for you" },
];

export const BANNER_DESIGN_TIPS = [
  "Keep faces, logos and key shapes near the center. Phones crop the sides.",
  "The left side sits behind the greeting, calm areas there read best.",
  "Avoid text inside the image, it gets cropped on smaller screens.",
];

type BannerDropZoneProps = {
  is_processing: boolean;
  onBrowse: () => void;
  onFile: (file: File) => void;
  /** Extra line under the title, e.g. which banner is showing right now. */
  hint?: React.ReactNode;
};

/** Empty state of the editor: drop, paste or browse, with the image specs and design tips. */
const BannerDropZone: React.FC<BannerDropZoneProps> = ({ is_processing, onBrowse, onFile, hint }) => {
  const [is_drag_over, setIsDragOver] = useState(false);

  return (
    <div
      className="home-banner-dropzone"
      data-drag-over={is_drag_over || undefined}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        const file = event.dataTransfer.files?.[0];
        if (file && !is_processing) onFile(file);
      }}
    >
      <div className="home-banner-dropzone-main">
        <span className="home-banner-dropzone-icon" aria-hidden="true">
          {is_processing ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageUp className="h-6 w-6" />}
        </span>
        {is_processing ? (
          <>
            <p className="home-banner-dropzone-title">Optimizing your image...</p>
            <p className="home-banner-dropzone-text">Resizing and compressing it so Home stays fast.</p>
          </>
        ) : (
          <>
            <p className="home-banner-dropzone-title">Drop an image here, or paste it</p>
            <p className="home-banner-dropzone-text">{hint ?? "Big photos are fine, we shrink them before they upload."}</p>
            <button type="button" className="home-banner-button" data-variant="primary" onClick={onBrowse}>
              Choose image
            </button>
          </>
        )}
      </div>

      <div className="home-banner-dropzone-specs">
        <dl className="home-banner-spec-list">
          {BANNER_SPECS.map((spec) => (
            <div key={spec.label} className="home-banner-spec">
              <dt>{spec.label}</dt>
              <dd>{spec.value}</dd>
            </div>
          ))}
        </dl>
        <ul className="home-banner-tips">
          {BANNER_DESIGN_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default BannerDropZone;
