import type { DrawerAttachment, DrawerAttachmentMediaKind, DrawerAttachmentTag } from "./types";

type AttachmentClass = { tag: DrawerAttachmentTag; tag_color: string; media_kind: DrawerAttachmentMediaKind };

const IMAGE_CLASS: AttachmentClass = { tag: "IMG", tag_color: "#a358df", media_kind: "image" };
const VIDEO_CLASS: AttachmentClass = { tag: "VID", tag_color: "#e2445c", media_kind: "video" };

const EXTENSION_TAGS: Record<string, AttachmentClass> = {
  pdf: { tag: "PDF", tag_color: "#e0524a", media_kind: "file" },
  doc: { tag: "DOC", tag_color: "#3b7bd1", media_kind: "file" },
  docx: { tag: "DOC", tag_color: "#3b7bd1", media_kind: "file" },
  xls: { tag: "XLS", tag_color: "#1f9d57", media_kind: "file" },
  xlsx: { tag: "XLS", tag_color: "#1f9d57", media_kind: "file" },
  csv: { tag: "XLS", tag_color: "#1f9d57", media_kind: "file" },
  png: IMAGE_CLASS,
  jpg: IMAGE_CLASS,
  jpeg: IMAGE_CLASS,
  gif: IMAGE_CLASS,
  webp: IMAGE_CLASS,
  mp4: VIDEO_CLASS,
  webm: VIDEO_CLASS,
  mov: VIDEO_CLASS,
  m4v: VIDEO_CLASS,
  ppt: { tag: "PPT", tag_color: "#e0913b", media_kind: "file" },
  pptx: { tag: "PPT", tag_color: "#e0913b", media_kind: "file" },
};

const DEFAULT_TAG: AttachmentClass = { tag: "FILE", tag_color: "#6e7b7d", media_kind: "file" };

/**
 * Classifies a file name into the small coloured tag chip shown on attachments
 * (PDF/DOC/XLS/IMG/VID/PPT/FILE), plus whether it renders as an image tile, a
 * video player or a plain file chip inside an update.
 */
export const classifyAttachment = (file_name: string): AttachmentClass => {
  const extension = file_name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TAGS[extension] ?? DEFAULT_TAG;
};

/** File picker `accept` list for comment attachments, the same extensions the API accepts on a comment (`App\Rules\CommentAttachmentFile`). */
export const COMMENT_ATTACHMENT_ACCEPT = Object.keys(EXTENSION_TAGS)
  .map((extension) => `.${extension}`)
  .join(",");

/** Mirrors `CommentAttachmentFile::MAX_FILE_KILOBYTES` and `MAX_VIDEO_KILOBYTES`. */
export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_ATTACHMENT_BYTES = 500 * 1024 * 1024;

/** Why a picked file can't be attached to an update, or null when it can. Checked before upload so a 2 GB video never starts uploading. */
export const attachmentRejectionReason = (file: File): string | null => {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!EXTENSION_TAGS[extension]) return `"${file.name}" is not a supported file type.`;
  const { media_kind } = EXTENSION_TAGS[extension];
  if (media_kind === "video" && file.size > MAX_VIDEO_ATTACHMENT_BYTES) return `"${file.name}" is larger than 500 MB.`;
  if (media_kind !== "video" && file.size > MAX_ATTACHMENT_BYTES) return `"${file.name}" is larger than 50 MB.`;
  return null;
};

/**
 * Builds the draft attachment shown in a composer tray before upload. Images
 * and videos get a local object URL so the tray can show a real thumbnail,
 * release it with {@link releaseDraftAttachment} once the draft goes away.
 */
export const createDraftAttachment = (id: string, file: File): DrawerAttachment => {
  const attachment_class = classifyAttachment(file.name);
  const has_preview = attachment_class.media_kind !== "file" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function";
  return {
    id,
    file_name: file.name,
    mime_type: file.type || undefined,
    size_bytes: file.size,
    ...attachment_class,
    ...(has_preview ? { preview_url: URL.createObjectURL(file) } : {}),
  };
};

/** Frees the object URL {@link createDraftAttachment} made for a draft's preview. */
export const releaseDraftAttachment = (attachment: DrawerAttachment) => {
  if (attachment.preview_url?.startsWith("blob:")) URL.revokeObjectURL(attachment.preview_url);
};

/** Where an attachment's media can be loaded from: the uploaded file, or the local preview of a draft. */
export const attachmentMediaUrl = (attachment: DrawerAttachment): string | undefined => attachment.download_url ?? attachment.preview_url;

/** "12.4 MB" style size label. */
export const formatAttachmentSize = (size_bytes: number | undefined): string => {
  if (!size_bytes || size_bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = size_bytes;
  let unit_index = 0;
  while (size >= 1024 && unit_index < units.length - 1) {
    size /= 1024;
    unit_index += 1;
  }
  return `${size >= 10 || unit_index === 0 ? Math.round(size) : size.toFixed(1)} ${units[unit_index]}`;
};
