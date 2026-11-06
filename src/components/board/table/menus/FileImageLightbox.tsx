"use client";

import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Download from "yet-another-react-lightbox/plugins/download";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import type { CellFile } from "../types";
import "./file-image-lightbox.css";

interface FileImageLightboxProps {
  /** Every image in the cell, so the arrows step through them. */
  images: CellFile[];
  /** The image to open on. */
  index: number;
  onClose: () => void;
}

/**
 * Full size viewer for a Files cell's images, built on `yet-another-react-lightbox`:
 * the file name as a caption, "2 / 5" counter, zoom (wheel, pinch, double click),
 * download, arrow keys and swipe between images, Escape or a backdrop click closes it.
 * Loaded lazily by `FilesCell`, so the table never ships it until someone opens a preview.
 */
export default function FileImageLightbox({ images, index, onClose }: FileImageLightboxProps) {
  const slides = images.map((file) => ({
    src: file.url,
    alt: file.file_name,
    title: file.file_name,
    download: { url: file.url, filename: file.file_name },
  }));

  return (
    <Lightbox
      open
      close={onClose}
      index={index}
      slides={slides}
      plugins={[Captions, Counter, Download, Zoom]}
      className="file-image-lightbox"
      carousel={{ finite: images.length <= 1 }}
      controller={{ closeOnBackdropClick: true }}
      captions={{ descriptionTextAlign: "center" }}
      zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true }}
      // A single image needs no arrows.
      render={images.length <= 1 ? { buttonPrev: () => null, buttonNext: () => null } : undefined}
      // The board's popovers sit at z-index 1100, the viewer goes above all of them.
      styles={{ root: { zIndex: 1300 } }}
    />
  );
}
