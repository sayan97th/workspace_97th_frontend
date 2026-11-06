import type { CellFile } from "../types";

/** Mirrors the `mimes` rule in the API's `StoreBoardItemCellFileRequest`, so the picker, the drop zone and paste only offer files the server will accept. */
export const ACCEPTED_EXTENSIONS = ["pdf", "xlsx", "xls", "csv", "docx", "doc", "pptx", "ppt", "png", "jpg", "jpeg", "gif", "webp"] as const;

/** The file input's `accept` attribute. */
export const ACCEPTED_FILE_TYPES = ACCEPTED_EXTENSIONS.map((extension) => `.${extension}`).join(",");

/** Mirrors the API's `max:51200` (kilobytes). */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif"]);

/** Clipboard image types and the extension a pasted file gets, see `filesFromClipboard`. */
const CLIPBOARD_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "menu_request.final.png" splits into "menu_request.final" and "png". A name without a dot has no extension. */
export function splitFileName(file_name: string): { base_name: string; extension: string } {
  const dot_index = file_name.lastIndexOf(".");
  if (dot_index <= 0 || dot_index === file_name.length - 1) return { base_name: file_name, extension: "" };
  return { base_name: file_name.slice(0, dot_index), extension: file_name.slice(dot_index + 1) };
}

/** Whether the entry is an uploaded image the cell can show as a thumbnail and open in the lightbox. Links and Docs never are. */
export function isImageFile(file: CellFile): boolean {
  if (file.kind === "link" || file.kind === "doc") return false;
  if (file.mime_type?.startsWith("image/")) return true;
  return IMAGE_EXTENSIONS.has(splitFileName(file.file_name).extension.toLowerCase());
}

/**
 * The sources to try, lightest first, for a small rendering of an image entry. Images uploaded
 * before thumbnails existed (or whose thumbnail failed) only have their original.
 */
export function thumbnailSources(file: CellFile): string[] {
  return [file.thumb_url, file.url].filter((src, index, all): src is string => !!src && all.indexOf(src) === index);
}

/** Whether an entry can be renamed. A Doc is named after the Doc itself, so it is renamed from there. */
export function canRenameFile(file: CellFile): boolean {
  return file.kind !== "doc";
}

/**
 * Splits dropped, pasted or picked files into the ones the API will take and a message
 * about the rest (wrong type or over 50 MB), so a mixed drop still uploads what it can.
 */
export function prepareUploads(files: File[]): { accepted: File[]; error: string | null } {
  const accepted: File[] = [];
  const wrong_type: string[] = [];
  const too_large: string[] = [];

  for (const file of files) {
    const extension = splitFileName(file.name).extension.toLowerCase();
    if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(extension)) wrong_type.push(file.name || "file");
    else if (file.size > MAX_FILE_BYTES) too_large.push(file.name);
    else accepted.push(file);
  }

  const problems: string[] = [];
  if (wrong_type.length) problems.push(`${wrong_type.join(", ")} ${wrong_type.length === 1 ? "is not a supported file type" : "are not supported file types"}.`);
  if (too_large.length) problems.push(`${too_large.join(", ")} ${too_large.length === 1 ? "is" : "are"} larger than 50 MB.`);
  return { accepted, error: problems.length ? problems.join(" ") : null };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * The files on a paste event. Browsers name a copied image or a screenshot "image.png",
 * so those get a readable unique name ("pasted_image_2026-11-05_14-32-08.png") instead.
 * Files copied from the OS file manager keep their own names.
 */
export function filesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return [];
  const files = Array.from(data.files);
  const now = new Date();
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

  return files.map((file, index) => {
    const extension = CLIPBOARD_IMAGE_EXTENSIONS[file.type];
    const is_generic_name = !file.name || /^image\.\w+$/i.test(file.name);
    if (!extension || !is_generic_name) return file;
    const suffix = files.length > 1 ? `_${index + 1}` : "";
    return new File([file], `pasted_image_${stamp}${suffix}.${extension}`, { type: file.type, lastModified: file.lastModified });
  });
}

