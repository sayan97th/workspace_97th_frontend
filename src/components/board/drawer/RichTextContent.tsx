"use client";
import React, { useMemo } from "react";
import DOMPurify from "dompurify";
import { Marked } from "marked";
import { MENTION_HIGHLIGHT_CLASS, MENTION_PATTERN } from "./mentionHighlight";

export type RichTextContentProps = {
  /** Markdown comment/update body, as typed into `RichTextComposer` and stored as-is by the API (see `BoardItemCommentController`/`BoardCommentController`, which no longer HTML-sanitize it — the body is plain Markdown text, not markup). */
  html: string;
  className?: string;
};

const IMG_TAG_PATTERN = /<img[^>]*src="([^"]*)"[^>]*>/g;

/**
 * A `marked` instance with raw HTML tokens neutralized — any literal
 * `<tag>` a user types or pastes into the Markdown source is dropped
 * outright rather than passed through into the rendered HTML, so a comment
 * body can never inject markup regardless of render context (server or
 * client). DOMPurify below is defense in depth on top of this, not the only
 * line of defense the way it was when the stored body was raw HTML.
 */
const markdown_renderer = new Marked({
  renderer: {
    html: () => "",
  },
});

/** Wraps `@Full Name` runs in the highlighted span the plain-text renderer used to apply, now working over an HTML string instead of plain text. */
const highlightMentions = (html: string): string =>
  html.replace(MENTION_PATTERN, `<span class="${MENTION_HIGHLIGHT_CLASS}">$1</span>`);

/**
 * Read-only renderer for a comment/update body — the rich text counterpart
 * of the old `renderMentionText()` plain-text highlighter, used by
 * `CommentThread` and `UpdateFeedCard`. Parses the stored Markdown to HTML
 * (raw HTML tokens stripped by {@link markdown_renderer}) and re-sanitizes
 * with DOMPurify as defense in depth (skipped during SSR, where `window`
 * doesn't exist yet — the Markdown parse alone is already safe for that
 * first paint, and the client pass re-checks it right after hydration).
 * When the body carries two or more inline images, they're pulled out of
 * the flowing text and laid out as a grid instead of stacked full-width,
 * matching Monday's own update media gallery.
 */
const RichTextContent: React.FC<RichTextContentProps> = ({ html: body, className }) => {
  const parsed_html = useMemo(() => markdown_renderer.parse(body, { async: false }), [body]);

  const sanitized_html = useMemo(() => {
    if (typeof window === "undefined") return parsed_html;
    return DOMPurify.sanitize(parsed_html, { ADD_ATTR: ["target"] });
  }, [parsed_html]);

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
