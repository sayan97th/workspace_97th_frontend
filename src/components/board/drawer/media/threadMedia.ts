import type { BoardPersonOption } from "../../toolbar/types";
import { attachmentMediaUrl } from "../drawerAttachments";
import type { DrawerAttachment, DrawerComment } from "../types";
import type { CellFile } from "../../table/types";

/** One image or video shared in an update thread, from an attachment or pasted into a body. */
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
  /** The update it belongs to, so the gallery can scroll back to it. */
  comment_id: string;
};

/** `![alt](url)` in Markdown bodies and `<img src="...">` in older HTML ones. */
const MARKDOWN_IMAGE_PATTERN = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
const HTML_IMAGE_PATTERN = /<img[^>]*\ssrc="([^"]+)"[^>]*>/g;

/** Images written into a body (pasted or dropped into the composer), in order. */
export function extractBodyImageUrls(body: string): string[] {
  const urls = [
    ...Array.from(body.matchAll(MARKDOWN_IMAGE_PATTERN), (match) => match[2]),
    ...Array.from(body.matchAll(HTML_IMAGE_PATTERN), (match) => match[1]),
  ];
  return Array.from(new Set(urls.filter((url) => /^(https?:|blob:|\/)/i.test(url))));
}

/** The file name at the end of a URL, for images pasted into a body (they have no name of their own). */
const fileNameFromUrl = (url: string, fallback: string) => {
  try {
    const last = decodeURIComponent(new URL(url, "http://local").pathname.split("/").pop() ?? "");
    return last || fallback;
  } catch {
    return fallback;
  }
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

/**
 * Every image and video of a thread, oldest first: each update's attachments
 * plus the images pasted into its body and its replies' bodies. Powers the
 * lightbox (swipe through all of them) and the media gallery.
 */
export function collectThreadMedia(comments: DrawerComment[]): ThreadMediaItem[] {
  const ordered = [...comments].sort((a, b) => (Date.parse(a.posted_at_iso ?? "") || 0) - (Date.parse(b.posted_at_iso ?? "") || 0));
  const seen_urls = new Set<string>();
  const items: ThreadMediaItem[] = [];

  const push = (item: ThreadMediaItem | null) => {
    if (!item || seen_urls.has(item.url)) return;
    seen_urls.add(item.url);
    items.push(item);
  };

  ordered.forEach((comment) => {
    comment.attachments.forEach((attachment) => push(attachmentToMediaItem(attachment, comment)));
    [comment, ...comment.replies].forEach((entry) =>
      extractBodyImageUrls(entry.body).forEach((url, index) =>
        push({
          key: `inline-${entry.id}-${index}`,
          kind: "image",
          url,
          file_name: fileNameFromUrl(url, "Image"),
          author: entry.author,
          posted_at: entry.posted_at,
          posted_at_iso: entry.posted_at_iso,
          comment_id: comment.id,
        })
      )
    );
  });

  return items;
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
