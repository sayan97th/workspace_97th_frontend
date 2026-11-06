"use client";

import { useEffect, useEffectEvent } from "react";
import PhotoSwipe from "photoswipe";
import type { SlideData } from "photoswipe";
import "photoswipe/style.css";
import type { CellFile } from "../types";
import { formatSize } from "./filesCellUtils";
import "./file-image-viewer.scss";

interface FileImageViewerProps {
  /** Every image in the cell, so the arrows, swipes and thumbnails step through them. */
  images: CellFile[];
  /** The image to open on. */
  index: number;
  onClose: () => void;
}

type ViewerSlide = SlideData & { file: CellFile };

/** Used when an image cannot be measured (it failed to load), PhotoSwipe then shows its error message. */
const FALLBACK_SIZE = { width: 1200, height: 800 };
/** Each zoom button press scales by this factor. */
const ZOOM_STEP = 1.6;
const ZOOM_DURATION_MS = 260;

/**
 * PhotoSwipe needs every image's real size up front to lay out zoom and pan. Uploads store it,
 * so only an image uploaded before that is downloaded once here to measure it.
 */
function resolveSize(file: CellFile): Promise<{ width: number; height: number }> {
  if (file.width && file.height) return Promise.resolve({ width: file.width, height: file.height });
  return measureImage(file.url);
}

function measureImage(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth || FALLBACK_SIZE.width, height: image.naturalHeight || FALLBACK_SIZE.height });
    image.onerror = () => resolve(FALLBACK_SIZE);
    image.src = url;
  });
}

const icon = (path: string) =>
  `<svg class="pswp__icn file-viewer__icn" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

const ICONS = {
  zoom_in: icon('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 L20 20 M10.5 7.5 V13.5 M7.5 10.5 H13.5"/>'),
  zoom_out: icon('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 L20 20 M7.5 10.5 H13.5"/>'),
  download: icon('<path d="M12 4 V15 M7.5 10.5 L12 15 L16.5 10.5 M5 19.5 H19"/>'),
  fullscreen: icon('<path d="M4 9 V4 H9 M15 4 H20 V9 M20 15 V20 H15 M9 20 H4 V15"/>'),
  close: icon('<path d="M6 6 L18 18 M18 6 L6 18"/>'),
  // PhotoSwipe mirrors the "next" arrow with CSS, so both use this left pointing one.
  arrow: icon('<path d="M15 5 L8 12 L15 19"/>'),
};

/**
 * One viewer slide. It opens on the light 2048px preview when there is one, with the original
 * as a larger `srcset` candidate: PhotoSwipe raises the image's `sizes` as it is zoomed, so the
 * browser only downloads the original when someone zooms in past the preview's own pixels.
 */
function toSlide(file: CellFile, size: { width: number; height: number }): ViewerSlide {
  const slide: ViewerSlide = { src: file.preview_url || file.url, alt: file.file_name, ...size, file };
  if (file.thumb_url) slide.msrc = file.thumb_url;
  if (file.preview_url && file.preview_width && file.width) slide.srcset = `${file.preview_url} ${file.preview_width}w, ${file.url} ${file.width}w`;
  return slide;
}

/**
 * Saves the image under its cell name. A cross origin URL (the S3 disk) ignores `<a download>`,
 * so the file is fetched as a blob first. When the bucket does not allow that, it opens in a new tab.
 */
async function downloadFile(file: CellFile): Promise<void> {
  try {
    const response = await fetch(file.url, { mode: "cors" });
    if (!response.ok) throw new Error(String(response.status));
    const object_url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = object_url;
    anchor.download = file.file_name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(object_url), 1000);
  } catch {
    window.open(file.url, "_blank", "noopener,noreferrer");
  }
}

/**
 * Full screen image viewer for a Files cell, built on PhotoSwipe (MIT) with a Fancybox like feel:
 * - drag a zoomed image to move it around, with inertia, and it bounces back at the edges;
 * - zoom with the mouse wheel, a pinch, a click on the image, or the + and - buttons;
 * - swipe, the arrows or the thumbnails move between the cell's images;
 * - drag down or press Escape to close, and the toolbar also offers Download and full screen.
 * It renders nothing itself, PhotoSwipe builds its own DOM on the body.
 */
export default function FileImageViewer({ images, index, onClose }: FileImageViewerProps) {
  const handleClose = useEffectEvent(onClose);

  useEffect(() => {
    let pswp: PhotoSwipe | null = null;
    let is_unmounting = false;
    let is_cancelled = false;

    void Promise.all(images.map(resolveSize)).then((sizes) => {
      if (is_cancelled) return;
      const slides: ViewerSlide[] = images.map((file, slide_index) => toSlide(file, sizes[slide_index]));
      const has_many = slides.length > 1;

      pswp = new PhotoSwipe({
        dataSource: slides,
        index,
        mainClass: `file-viewer${has_many ? " file-viewer--many" : ""}`,
        bgOpacity: 1,
        showHideAnimationType: "fade",
        showAnimationDuration: 220,
        hideAnimationDuration: 180,
        wheelToZoom: true,
        // Fits the window first, a click zooms to 2.5x the fit (at least the real size), up to 6x.
        initialZoomLevel: "fit",
        secondaryZoomLevel: (zoom) => Math.max(zoom.fit * 2.5, Math.min(1, zoom.fit * 4)),
        maxZoomLevel: (zoom) => Math.max(zoom.fit * 6, 2),
        imageClickAction: "zoom",
        tapAction: "toggle-controls",
        doubleTapAction: "zoom",
        bgClickAction: "close",
        closeOnVerticalDrag: true,
        padding: { top: 72, bottom: has_many ? 132 : 76, left: 72, right: 72 },
        // Our own zoom in and out buttons replace the single toggle.
        zoom: false,
        arrowPrevSVG: ICONS.arrow,
        arrowNextSVG: ICONS.arrow,
        closeSVG: ICONS.close,
        closeTitle: "Close (Esc)",
        arrowPrevTitle: "Previous (←)",
        arrowNextTitle: "Next (→)",
        indexIndicatorSep: " / ",
        errorMsg: "The image could not be loaded.",
        // The thumbnails cached the images already, so the neighbours are ready to swipe in.
        preload: [1, 1],
      });

      // The light thumbnail shows at once on every slide (PhotoSwipe only does it for the first one) while the preview loads.
      pswp.addFilter("placeholderSrc", (placeholder_src, content) => (content.data as ViewerSlide).msrc || placeholder_src);

      pswp.on("uiRegister", () => {
        const viewer = pswp!;
        const currentFile = () => (viewer.currSlide?.data as ViewerSlide | undefined)?.file;

        const syncZoomButtons = (zoom_in: HTMLElement, zoom_out: HTMLElement) => {
          const slide = viewer.currSlide;
          if (!slide) return;
          const can_zoom_in = slide.currZoomLevel < slide.zoomLevels.max - 0.001;
          const can_zoom_out = slide.currZoomLevel > slide.zoomLevels.initial + 0.001;
          zoom_in.toggleAttribute("disabled", !can_zoom_in);
          zoom_out.toggleAttribute("disabled", !can_zoom_out);
        };

        let zoom_in_button: HTMLElement | null = null;
        let zoom_out_button: HTMLElement | null = null;
        const sync = () => zoom_in_button && zoom_out_button && syncZoomButtons(zoom_in_button, zoom_out_button);

        viewer.ui?.registerElement({
          name: "zoom-out",
          order: 8,
          isButton: true,
          title: "Zoom out",
          ariaLabel: "Zoom out",
          html: ICONS.zoom_out,
          onInit: (element) => {
            zoom_out_button = element;
            viewer.on("zoomPanUpdate", sync);
            viewer.on("change", sync);
          },
          onClick: () => {
            const slide = viewer.currSlide;
            if (!slide) return;
            slide.zoomTo(Math.max(slide.currZoomLevel / ZOOM_STEP, slide.zoomLevels.initial), undefined, ZOOM_DURATION_MS);
          },
        });
        viewer.ui?.registerElement({
          name: "zoom-in",
          order: 9,
          isButton: true,
          title: "Zoom in",
          ariaLabel: "Zoom in",
          html: ICONS.zoom_in,
          onInit: (element) => {
            zoom_in_button = element;
            sync();
          },
          onClick: () => {
            const slide = viewer.currSlide;
            if (!slide) return;
            slide.zoomTo(Math.min(slide.currZoomLevel * ZOOM_STEP, slide.zoomLevels.max), undefined, ZOOM_DURATION_MS);
          },
        });
        viewer.ui?.registerElement({
          name: "download",
          order: 15,
          isButton: true,
          title: "Download",
          ariaLabel: "Download image",
          html: ICONS.download,
          onClick: () => {
            const file = currentFile();
            if (file) void downloadFile(file);
          },
        });
        viewer.ui?.registerElement({
          name: "fullscreen",
          order: 16,
          isButton: true,
          title: "Full screen",
          ariaLabel: "Toggle full screen",
          html: ICONS.fullscreen,
          onInit: (element) => {
            if (!document.fullscreenEnabled) element.style.display = "none";
            const syncState = () => element.classList.toggle("is-active", document.fullscreenElement === viewer.element);
            document.addEventListener("fullscreenchange", syncState);
            viewer.on("destroy", () => document.removeEventListener("fullscreenchange", syncState));
          },
          onClick: () => {
            if (document.fullscreenElement) void document.exitFullscreen();
            else void viewer.element?.requestFullscreen().catch(() => {});
          },
        });

        // File name and size, centered under the image.
        viewer.ui?.registerElement({
          name: "caption",
          order: 30,
          appendTo: "root",
          className: "file-viewer__caption",
          onInit: (element) => {
            const render = () => {
              const file = currentFile();
              if (!file) return;
              element.replaceChildren();
              const name = document.createElement("span");
              name.className = "file-viewer__caption-name";
              name.textContent = file.file_name;
              element.append(name);
              if (file.size_bytes > 0) {
                const meta = document.createElement("span");
                meta.className = "file-viewer__caption-meta";
                meta.textContent = formatSize(file.size_bytes);
                element.append(meta);
              }
            };
            viewer.on("change", render);
            render();
          },
        });

        // A short hint on open, it fades out by itself.
        viewer.ui?.registerElement({
          name: "hint",
          order: 31,
          appendTo: "root",
          className: "file-viewer__hint",
          html: "Scroll or click to zoom, drag to move",
        });

        // Thumbnail strip along the bottom, only with more than one image.
        if (has_many) {
          viewer.ui?.registerElement({
            name: "thumbnails",
            order: 32,
            appendTo: "root",
            className: "file-viewer__thumbs",
            onInit: (element) => {
              const buttons = slides.map((slide, slide_index) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "file-viewer__thumb";
                button.setAttribute("aria-label", `Show ${slide.file.file_name}`);
                const image = document.createElement("img");
                image.src = slide.file.thumb_url || slide.file.url;
                image.decoding = "async";
                image.loading = "lazy";
                // An old upload or a missing thumbnail falls back to the original once.
                image.addEventListener("error", () => image.src !== slide.file.url && (image.src = slide.file.url), { once: true });
                image.alt = "";
                image.draggable = false;
                button.append(image);
                button.addEventListener("click", () => viewer.goTo(slide_index));
                element.append(button);
                return button;
              });
              const markActive = () =>
                buttons.forEach((button, button_index) => {
                  const is_active = button_index === viewer.currIndex;
                  button.toggleAttribute("aria-current", is_active);
                  if (is_active) button.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
                });
              viewer.on("change", markActive);
              markActive();
            },
          });
        }
      });

      pswp.on("destroy", () => {
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        // A destroy caused by unmounting (React strict mode runs effects twice) must not close the preview again.
        if (!is_unmounting) handleClose();
      });

      pswp.init();
    });

    return () => {
      is_cancelled = true;
      is_unmounting = true;
      pswp?.destroy();
    };
    // Opened once per preview, the parent remounts it for another one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
