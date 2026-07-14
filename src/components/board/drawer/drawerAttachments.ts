import type { DrawerAttachmentTag } from "./types";

const EXTENSION_TAGS: Record<string, { tag: DrawerAttachmentTag; tag_color: string }> = {
  pdf: { tag: "PDF", tag_color: "#e0524a" },
  doc: { tag: "DOC", tag_color: "#3b7bd1" },
  docx: { tag: "DOC", tag_color: "#3b7bd1" },
  xls: { tag: "XLS", tag_color: "#1f9d57" },
  xlsx: { tag: "XLS", tag_color: "#1f9d57" },
  csv: { tag: "XLS", tag_color: "#1f9d57" },
  png: { tag: "IMG", tag_color: "#a358df" },
  jpg: { tag: "IMG", tag_color: "#a358df" },
  jpeg: { tag: "IMG", tag_color: "#a358df" },
  gif: { tag: "IMG", tag_color: "#a358df" },
  webp: { tag: "IMG", tag_color: "#a358df" },
  ppt: { tag: "PPT", tag_color: "#e0913b" },
  pptx: { tag: "PPT", tag_color: "#e0913b" },
};

const DEFAULT_TAG: { tag: DrawerAttachmentTag; tag_color: string } = { tag: "FILE", tag_color: "#6e7b7d" };

/** Classifies a file name into the small coloured tag chip shown on attachments (PDF/DOC/XLS/IMG/PPT/FILE). */
export const classifyAttachment = (file_name: string): { tag: DrawerAttachmentTag; tag_color: string } => {
  const extension = file_name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TAGS[extension] ?? DEFAULT_TAG;
};
