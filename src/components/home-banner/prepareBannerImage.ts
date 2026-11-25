/**
 * Gets a picture ready for the Home banner before it leaves the browser.
 *
 * A designer may drop a 5 MB photo, a 6000px PNG or an SVG. Sending those as they are would make
 * the upload slow and the API would shrink them anyway, so the browser does the heavy lifting:
 *
 * - decodes the file (camera rotation applied, SVG drawn as crisp pixels at full banner size);
 * - scales it to at most {@link BANNER_MAX_SIDE} px, halving in steps so detail survives;
 * - encodes it as WebP (PNG or JPEG on browsers that cannot write WebP);
 * - measures the average color and the brightness behind the greeting for the live preview.
 *
 * The API decodes and re-encodes the result again, so nothing here is trusted for safety, it is
 * only about speed and quality.
 */

/** Matches `HomeBannerService::LARGE_MAX_SIDE` on the API. */
export const BANNER_MAX_SIDE = 2560;

/** Below this width the image may look soft on large screens. */
export const BANNER_RECOMMENDED_WIDTH = 2400;
export const BANNER_RECOMMENDED_HEIGHT = 800;
export const BANNER_MIN_WIDTH = 640;
export const BANNER_MIN_HEIGHT = 160;

/** Originals are shrunk here first, so the browser accepts more than the API would. */
export const BANNER_MAX_SOURCE_BYTES = 40 * 1024 * 1024;

export const BANNER_ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
  "image/avif",
  "image/bmp",
];

export const BANNER_ACCEPT_ATTRIBUTE = [...BANNER_ACCEPTED_TYPES, ".svg", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".bmp"].join(",");

const ENCODE_QUALITY = 0.88;

/** Share of the width, from the left, the greeting covers. Same as the API. */
const TEXT_AREA_SHARE = 0.6;

/** Fallback size for an SVG that has neither width/height nor a viewBox. */
const SVG_FALLBACK_SIZE = { width: BANNER_RECOMMENDED_WIDTH, height: BANNER_RECOMMENDED_HEIGHT };

export type PreparedBannerImage = {
  file: File;
  /** Object URL of {@link file}, revoke with {@link releasePreparedImage}. */
  preview_url: string;
  width: number;
  height: number;
  original_name: string;
  original_size: number;
  original_width: number;
  original_height: number;
  prepared_size: number;
  dominant_color: string;
  luminance: number;
  /** Shown in the editor, e.g. an animated GIF only keeps its first frame. */
  notes: string[];
};

export class BannerImageError extends Error {}

const isSvg = (file: File): boolean => file.type === "image/svg+xml" || /\.svg$/i.test(file.name);

const formatMegabytes = (bytes: number): string => `${(bytes / (1024 * 1024)).toFixed(0)} MB`;

/** Reads the drawing size of an SVG from width/height, or its viewBox, scaled up to banner size. */
const svgRenderSize = (svg_text: string): { width: number; height: number } => {
  const document_node = new DOMParser().parseFromString(svg_text, "image/svg+xml");
  const root = document_node.documentElement;
  if (!root || root.nodeName.toLowerCase() !== "svg") {
    throw new BannerImageError("This SVG file could not be read.");
  }

  const view_box = root.getAttribute("viewBox")?.split(/[\s,]+/).map(Number);
  const attribute_width = parseFloat(root.getAttribute("width") ?? "");
  const attribute_height = parseFloat(root.getAttribute("height") ?? "");

  let width = attribute_width;
  let height = attribute_height;
  if (!(width > 0 && height > 0) && view_box && view_box.length === 4 && view_box[2] > 0 && view_box[3] > 0) {
    width = view_box[2];
    height = view_box[3];
  }
  if (!(width > 0 && height > 0)) return SVG_FALLBACK_SIZE;

  // Vectors scale for free, so always draw them at full banner width.
  const scale = BANNER_MAX_SIDE / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
};

const loadImageElement = (url: string, size?: { width: number; height: number }): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    if (size) {
      image.width = size.width;
      image.height = size.height;
    }
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new BannerImageError("Your browser could not open this image. Try a PNG, JPG or WebP."));
    image.src = url;
  });

type DecodedImage = { source: CanvasImageSource; width: number; height: number; release: () => void };

/** Decodes any supported file into something a canvas can draw. */
const decodeImage = async (file: File): Promise<DecodedImage> => {
  if (isSvg(file)) {
    const svg_text = await file.text();
    const size = svgRenderSize(svg_text);
    // Drawn through an <img>, which never runs scripts inside the SVG.
    const url = URL.createObjectURL(new Blob([svg_text], { type: "image/svg+xml" }));
    try {
      const image = await loadImageElement(url, size);
      return { source: image, width: size.width, height: size.height, release: () => URL.revokeObjectURL(url) };
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Older Safari versions reject some formats here but open them through <img>.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await loadImageElement(url);
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
};

const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const context2d = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const context = canvas.getContext("2d", { willReadFrequently: false });
  if (!context) throw new BannerImageError("Your browser could not process this image.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  return context;
};

/**
 * Draws the source at the target size, halving it step by step first. One big jump from 6000px
 * to 2560px skips pixels and looks grainy, halving keeps fine detail like text and hair.
 */
const resample = (decoded: DecodedImage, target_width: number, target_height: number): HTMLCanvasElement => {
  let current: CanvasImageSource = decoded.source;
  let current_width = decoded.width;
  let current_height = decoded.height;

  while (current_width / 2 > target_width && current_height / 2 > target_height) {
    const half = createCanvas(Math.round(current_width / 2), Math.round(current_height / 2));
    context2d(half).drawImage(current, 0, 0, half.width, half.height);
    current = half;
    current_width = half.width;
    current_height = half.height;
  }

  const output = createCanvas(target_width, target_height);
  context2d(output).drawImage(current, 0, 0, target_width, target_height);
  return output;
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/** Whether any pixel is see-through, sampled on a small copy. */
const hasTransparency = (canvas: HTMLCanvasElement): boolean => {
  const sample = createCanvas(64, Math.max(1, Math.round((64 * canvas.height) / canvas.width)));
  const context = context2d(sample);
  context.drawImage(canvas, 0, 0, sample.width, sample.height);
  const { data } = context.getImageData(0, 0, sample.width, sample.height);
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 250) return true;
  }
  return false;
};

/** WebP when the browser can write it, otherwise PNG for transparent images and JPEG for the rest. */
const encodeCanvas = async (canvas: HTMLCanvasElement): Promise<Blob> => {
  const webp_blob = await canvasToBlob(canvas, "image/webp", ENCODE_QUALITY);
  if (webp_blob && webp_blob.type === "image/webp") return webp_blob;

  const fallback_type = hasTransparency(canvas) ? "image/png" : "image/jpeg";
  const fallback_blob = await canvasToBlob(canvas, fallback_type, ENCODE_QUALITY);
  if (!fallback_blob) throw new BannerImageError("Your browser could not compress this image.");
  return fallback_blob;
};

/** Average color of the whole image and brightness of the greeting area, like the API measures it. */
export const measureCanvasColors = (canvas: HTMLCanvasElement): { dominant_color: string; luminance: number } => {
  const sample_width = 32;
  const sample = createCanvas(sample_width, Math.max(1, Math.round((sample_width * canvas.height) / canvas.width)));
  const context = context2d(sample);
  context.drawImage(canvas, 0, 0, sample.width, sample.height);
  const { data } = context.getImageData(0, 0, sample.width, sample.height);

  const text_area_width = Math.ceil(sample.width * TEXT_AREA_SHARE);
  let red_total = 0;
  let green_total = 0;
  let blue_total = 0;
  let luminance_total = 0;
  let text_area_pixels = 0;

  for (let index = 0; index < data.length; index += 4) {
    const opacity = data[index + 3] / 255;
    const red = data[index] * opacity + 255 * (1 - opacity);
    const green = data[index + 1] * opacity + 255 * (1 - opacity);
    const blue = data[index + 2] * opacity + 255 * (1 - opacity);
    red_total += red;
    green_total += green;
    blue_total += blue;

    const x = (index / 4) % sample.width;
    if (x < text_area_width) {
      luminance_total += (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
      text_area_pixels += 1;
    }
  }

  const pixel_count = Math.max(1, data.length / 4);
  const toHex = (value: number) => Math.round(value / pixel_count).toString(16).padStart(2, "0");
  return {
    dominant_color: `#${toHex(red_total)}${toHex(green_total)}${toHex(blue_total)}`,
    luminance: Math.round((luminance_total / Math.max(1, text_area_pixels)) * 1000) / 1000,
  };
};

/** Checks the file before decoding it, with messages a designer can act on. */
export const validateBannerFile = (file: File): string | null => {
  const has_known_type = BANNER_ACCEPTED_TYPES.includes(file.type) || /\.(svg|png|jpe?g|webp|gif|avif|bmp)$/i.test(file.name);
  if (!has_known_type) return "Use a PNG, JPG, WebP, SVG, GIF, AVIF or BMP image.";
  if (file.size > BANNER_MAX_SOURCE_BYTES) return `This file is ${formatMegabytes(file.size)}. Use an image under ${formatMegabytes(BANNER_MAX_SOURCE_BYTES)}.`;
  return null;
};

/** Decodes, resizes, compresses and measures the file. Throws {@link BannerImageError} with a readable message. */
export const prepareBannerImage = async (file: File): Promise<PreparedBannerImage> => {
  const validation_error = validateBannerFile(file);
  if (validation_error) throw new BannerImageError(validation_error);

  const decoded = await decodeImage(file);
  try {
    if (decoded.width < BANNER_MIN_WIDTH || decoded.height < BANNER_MIN_HEIGHT) {
      throw new BannerImageError(
        `This image is ${decoded.width} x ${decoded.height} px. Use one at least ${BANNER_MIN_WIDTH} x ${BANNER_MIN_HEIGHT} px, ${BANNER_RECOMMENDED_WIDTH} x ${BANNER_RECOMMENDED_HEIGHT} px looks best.`
      );
    }

    const scale = Math.min(1, BANNER_MAX_SIDE / Math.max(decoded.width, decoded.height));
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));
    const canvas = resample(decoded, width, height);
    const blob = await encodeCanvas(canvas);
    const { dominant_color, luminance } = measureCanvasColors(canvas);

    // A small, already optimized WebP or JPEG can come out bigger after a second pass, keep the original then.
    const can_keep_original =
      scale === 1 && !isSvg(file) && ["image/webp", "image/jpeg", "image/png"].includes(file.type) && file.size <= blob.size;
    const output_blob = can_keep_original ? file : blob;
    const extension = output_blob.type.split("/")[1]?.replace("jpeg", "jpg") ?? "webp";
    const base_name = file.name.replace(/\.[^.]+$/, "") || "banner";
    const prepared_file = new File([output_blob], `${base_name}.${extension}`, { type: output_blob.type });

    const notes: string[] = [];
    if (file.type === "image/gif") notes.push("Animated GIFs keep only their first frame.");
    if (isSvg(file)) notes.push("The SVG was drawn at full banner size, so it stays crisp.");
    if (decoded.width < BANNER_RECOMMENDED_WIDTH && !isSvg(file)) {
      notes.push(`At ${decoded.width} px wide it may look soft on large screens. ${BANNER_RECOMMENDED_WIDTH} px or wider is sharpest.`);
    }

    return {
      file: prepared_file,
      preview_url: URL.createObjectURL(prepared_file),
      width,
      height,
      original_name: file.name,
      original_size: file.size,
      original_width: decoded.width,
      original_height: decoded.height,
      prepared_size: prepared_file.size,
      dominant_color,
      luminance,
      notes,
    };
  } finally {
    decoded.release();
  }
};

export const releasePreparedImage = (prepared: PreparedBannerImage | null): void => {
  if (prepared) URL.revokeObjectURL(prepared.preview_url);
};

/** "5.2 MB", "412 KB". */
export const formatFileSize = (bytes: number): string => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};
