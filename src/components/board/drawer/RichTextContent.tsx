"use client";
import React, { useMemo } from "react";
import DOMPurify from "dompurify";
import { MENTION_HIGHLIGHT_CLASS, MENTION_PATTERN } from "./mentionHighlight";

export type RichTextContentProps = {
  /** Sanitized-on-the-server HTML body (see `Purifier::clean()` in `BoardItemCommentController`/`BoardCommentController`). */
  html: string;
  className?: string;
};

const IMG_TAG_PATTERN = /<img[^>]*src="([^"]*)"[^>]*>/g;

/** Wraps `@Full Name` runs in the highlighted span the plain-text renderer used to apply, now working over an HTML string instead of plain text. */
const highlightMentions = (html: string): string =>
  html.replace(MENTION_PATTERN, `<span class="${MENTION_HIGHLIGHT_CLASS}">$1</span>`);

/**
 * Read-only renderer for a comment/update body — the rich text counterpart
 * of the old `renderMentionText()` plain-text highlighter, used by
 * `CommentThread` and `UpdateFeedCard`. Re-sanitizes client-side with
 * DOMPurify as defense in depth on top of the server's own `Purifier::clean()`
 * (skipped during SSR, where `window` doesn't exist yet — the server-sanitized
 * HTML is trusted for that first paint, and the client pass re-checks it right
 * after hydration). When the body carries two or more inline images, they're
 * pulled out of the flowing text and laid out as a grid instead of stacked
 * full-width, matching Monday's own update media gallery.
 */
const RichTextContent: React.FC<RichTextContentProps> = ({ html, className }) => {
  const sanitized_html = useMemo(() => {
    if (typeof window === "undefined") return html;
    return DOMPurify.sanitize(html, { ADD_ATTR: ["target"] });
  }, [html]);

  const { text_html, gallery_urls } = useMemo(() => {
    const urls = Array.from(sanitized_html.matchAll(IMG_TAG_PATTERN)).map((match) => match[1]);
    if (urls.length < 2) return { text_html: highlightMentions(sanitized_html), gallery_urls: [] as string[] };
    return { text_html: highlightMentions(sanitized_html.replace(IMG_TAG_PATTERN, "")), gallery_urls: urls };
  }, [sanitized_html]);

  return (
    <div className={`shell-rich-text-content ${className ?? ""}`}>
      <div dangerouslySetInnerHTML={{ __html: text_html }} />
      {gallery_urls.length > 0 && (
        <div className="rich-text-image-gallery">
          {gallery_urls.map((url, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`${url}-${index}`} src={url} alt="" />
          ))}
        </div>
      )}
    </div>
  );
};

export default RichTextContent;
