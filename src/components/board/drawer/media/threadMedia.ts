import type { BoardPersonOption } from "../../toolbar/types";
import { attachmentMediaUrl } from "../drawerAttachments";
import type { DrawerAttachment, DrawerComment } from "../types";
import type { CellFile } from "../../table/types";

/** One image or video attached to an update. */
export type ThreadMediaItem = {
  key: string;
  kind: "image" | "video";
  url: string;
  file_name: string;
  size_bytes?: number;
  mime_type?: string;
  author?: BoardPersonOption;
  /** "3h", "Nov 12", as the thread shows it. */
  posted_at?: string;
  posted_at_iso?: string;
  /** The update it belongs to. */
  comment_id: string;
};

export function attachmentToMediaItem(attachment: DrawerAttachment, comment?: DrawerComment): ThreadMediaItem | null {
  const url = attachmentMediaUrl(attachment);
  if (!url || (attachment.media_kind !== "image" && attachment.media_kind !== "video")) return null;
  return {
    key: `attachment-${attachment.id}`,
    kind: attachment.media_kind,
    url,
    file_name: attachment.file_name,
    size_bytes: attachment.size_bytes,
    mime_type: attachment.mime_type,
    author: comment?.author,
    posted_at: comment?.posted_at,
    posted_at_iso: comment?.posted_at_iso,
    comment_id: comment?.id ?? "",
  };
}

/** The shape `FileImageViewer` (PhotoSwipe) reads. */
export function toViewerFile(item: Pick<ThreadMediaItem, "key" | "url" | "file_name" | "mime_type" | "size_bytes">): CellFile {
  return {
    id: item.key,
    file_name: item.file_name,
    url: item.url,
    mime_type: item.mime_type ?? "image/*",
    size_bytes: item.size_bytes ?? 0,
  };
}
