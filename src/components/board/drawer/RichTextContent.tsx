"use client";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import DOMPurify from "dompurify";
import { PersonCardPopover, useHoverCardController, type HoverCardPerson } from "@/components/people/PersonHoverCard";
import { MENTION_HIGHLIGHT_CLASS, MENTION_PATTERN } from "./mentionHighlight";
import { CODE_COPIED_LABEL, CODE_COPY_LABEL, renderRichTextMarkdown } from "./markdown/renderRichTextMarkdown";
import { renderMermaidDiagrams } from "./markdown/renderMermaidDiagrams";
import { useCommentMedia } from "./media/CommentMediaContext";
import { toViewerFile } from "./media/threadMedia";
import type { CellFile } from "../table/types";
import "katex/dist/katex.min.css";
import "./rich-text.css";
import "./markdown/rich-text-markdown.scss";

export type RichTextContentProps = {
  /** Markdown comment/update body, as typed into `RichTextComposer` and stored as-is by the API (see `BoardItemCommentController`/`BoardCommentController`, which no longer HTML-sanitize it, the body is plain Markdown text, not markup). */
  html: string;
  className?: string;
  /** People that can be `@mentioned` here: hovering a mention that names one of them shows their profile card. */
  people?: HoverCardPerson[];
  /**
   * The names a mention may use here (the board's people, its teams and
   * "Everyone"). When given, only an exact `@Name` of one of them is colored,
   * so a misspelled `@Amandaa Carter` reads as plain text, the same rule the
   * composer follows. Without it any `@Full Name` looking run is colored.
   */
  mention_names?: readonly string[];
};

const IMG_TAG_PATTERN = /<img[^>]*src="([^"]*)"[^>]*>/g;

// PhotoSwipe only downloads the first time an image in a body is opened outside an update thread.
const FileImageViewer = dynamic(() => import("../table/menus/FileImageViewer"), { ssr: false });

/** A link to another item of a board, as the composer's `#` picker writes it: `/boards/{board_id}/pulses/{item_id}`. */
const ITEM_REFERENCE_LINK_PATTERN = /<a href="(\/boards\/\d+\/pulses\/\d+)"/g;

/** The item reference chip look, declared in `rich-text.css`. */
const ITEM_REFERENCE_CLASS = "rich-text-item-ref";

/** Marks item reference links as chips, so a click can open the item without reloading the page. */
const markItemReferences = (html: string): string =>
  html.replace(ITEM_REFERENCE_LINK_PATTERN, (_match, href: string) => `<a data-item-ref="true" class="${ITEM_REFERENCE_CLASS}" href="${href}"`);

/** How long a code block's copy button says "Copied". */
const COPIED_RESET_MS = 1600;

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The same text as it appears in the rendered HTML, where `&`, `<`, `>`, quotes and apostrophes are entities. */
const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/**
 * Wraps mentions in the highlighted span the plain-text renderer used to
 * apply, over the rendered HTML string. With `names`, only an exact `@Name`
 * of one of them (nothing glued after it); without, any `@Full Name` looking
 * run. The name is kept in `data-mention` so a hover can find who it refers to.
 */
const highlightMentions = (html: string, names?: readonly string[]): string => {
  const wrap = (mention: string) => `<span class="${MENTION_HIGHLIGHT_CLASS}" data-mention="${mention}">${mention}</span>`;
  if (!names) return html.replace(MENTION_PATTERN, wrap);
  const alternatives = [...new Set(names.filter((name) => name.trim() !== "").map(escapeHtml))]
    .sort((first, second) => second.length - first.length)
    .map(escapeRegExp);
  if (alternatives.length === 0) return html;
  const pattern = new RegExp(`(^|[\\s>(\\["'])(@(?:${alternatives.join("|")}))(?![\\p{L}\\p{M}\\p{N}_])`, "gu");
  return html.replace(pattern, (_match, before: string, mention: string) => `${before}${wrap(mention)}`);
};

/** The person a rendered mention (`@Full Name`) refers to. The pattern only captures two words, so a longer name is matched by its prefix. */
const findMentionedPerson = (people: HoverCardPerson[], mention: string): HoverCardPerson | undefined => {
  const name = mention.slice(1).toLowerCase();
  return (
    people.find((person) => person.name.toLowerCase() === name) ??
    people.find((person) => person.name.toLowerCase().startsWith(`${name} `))
  );
};

/**
 * Read-only renderer for a comment/update body, the rich text counterpart
 * of the old `renderMentionText()` plain-text highlighter, used by
 * `CommentThread` and `UpdateFeedCard`. Parses the stored Markdown to HTML
 * with {@link renderRichTextMarkdown} (GitHub flavored Markdown plus
 * highlights, footnotes, math, emoji, alerts and a small set of formatting
 * HTML tags, all styled in `rich-text-markdown.scss`) and re-sanitizes with
 * DOMPurify as defense in depth (skipped during SSR, where `window` doesn't
 * exist yet, the Markdown render alone is already safe for that first paint,
 * and the client pass re-checks it right after hydration).
 * Code blocks get a copy button, footnote links scroll inside the drawer
 * instead of changing the URL, and ` ```mermaid ` blocks are drawn as
 * diagrams once the body is on screen.
 * A `[#Item name](/boards/1/pulses/2)` link written by the composer's `#` picker
 * renders as a chip that opens that item through the router. When the body carries two or more inline images, they're pulled out of
 * the flowing text and laid out as a grid instead of stacked full-width,
 * matching Monday's own update media gallery.
 */
const RichTextContent: React.FC<RichTextContentProps> = ({ html: body, className, people, mention_names }) => {
  const router = useRouter();
  const { target, show, hide, keepOpen, dismiss } = useHoverCardController();
  const container_ref = useRef<HTMLDivElement>(null);
  // Inside an update thread images open the thread's shared lightbox, anywhere else (a doc, the feed) this body's own.
  const thread_media = useCommentMedia();
  const [local_viewer, setLocalViewer] = useState<{ files: CellFile[]; index: number } | null>(null);
  const footnote_prefix = `rt${useId()}`;
  const parsed_html = useMemo(() => renderRichTextMarkdown(body, footnote_prefix), [body, footnote_prefix]);

  const sanitized_html = useMemo(() => {
    if (typeof window === "undefined") return parsed_html;
    return DOMPurify.sanitize(parsed_html, { ADD_ATTR: ["target", "loading"] });
  }, [parsed_html]);

  const { text_html, gallery_urls } = useMemo(() => {
    const urls = Array.from(sanitized_html.matchAll(IMG_TAG_PATTERN)).map((match) => match[1]);
    if (urls.length < 2) return { text_html: markItemReferences(highlightMentions(sanitized_html, mention_names)), gallery_urls: [] as string[] };
    return { text_html: markItemReferences(highlightMentions(sanitized_html.replace(IMG_TAG_PATTERN, ""), mention_names)), gallery_urls: urls };
  }, [sanitized_html, mention_names]);

  const handleMouseOver = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!people?.length) return;
    const mention_el = (event.target as HTMLElement).closest<HTMLElement>("[data-mention]");
    if (!mention_el) return;
    const person = findMentionedPerson(people, mention_el.dataset.mention ?? "");
    if (person) show(person, mention_el);
  };

  useEffect(() => {
    const container = container_ref.current;
    if (!container) return;
    let is_cancelled = false;
    void renderMermaidDiagrams(container, () => is_cancelled);
    return () => {
      is_cancelled = true;
    };
  }, [text_html]);

  const copyCode = (button: HTMLButtonElement) => {
    const code = button.closest(".rt-code-block")?.querySelector("pre code");
    if (!code || !navigator.clipboard) return;
    // `innerText`, not `textContent`, so diff lines (one block span per line) keep their line breaks.
    void navigator.clipboard.writeText((code as HTMLElement).innerText).then(() => {
      const label = button.querySelector(".rt-code-block__copy-label");
      button.dataset.copied = "true";
      if (label) label.textContent = CODE_COPIED_LABEL;
      window.setTimeout(() => {
        delete button.dataset.copied;
        if (label) label.textContent = CODE_COPY_LABEL;
      }, COPIED_RESET_MS);
    });
  };

  // A footnote link scrolls its target into view inside the drawer, without touching the page URL.
  const scrollToFootnote = (link: HTMLAnchorElement) => {
    const target_id = link.getAttribute("href")?.slice(1);
    const target_el = target_id ? document.getElementById(target_id) : null;
    if (!target_el) return;
    target_el.scrollIntoView({ behavior: "smooth", block: "center" });
    target_el.setAttribute("data-rt-flash", "true");
    window.setTimeout(() => target_el.removeAttribute("data-rt-flash"), COPIED_RESET_MS);
  };

  /** Opens an image of this body full screen, swiping through the rest of the thread's (or this body's) images. */
  const openImage = (image_el: HTMLImageElement) => {
    const url = image_el.getAttribute("src") ?? image_el.src;
    if (thread_media) {
      thread_media.openImage(url, image_el.alt || undefined);
      return;
    }
    const body_images = Array.from(container_ref.current?.querySelectorAll<HTMLImageElement>("img") ?? []);
    const files = body_images.map((image, index) =>
      toViewerFile({ key: `${index}-${image.src}`, url: image.getAttribute("src") ?? image.src, file_name: image.alt || "Image" })
    );
    setLocalViewer({ files, index: Math.max(0, body_images.indexOf(image_el)) });
  };

  // An item reference opens through the router (a plain modified click still opens a new tab).
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    const event_target = event.target as HTMLElement;
    const image_el = event_target.closest<HTMLImageElement>("img");
    if (image_el && !image_el.closest("a") && !image_el.closest(".rt-mermaid, .katex")) {
      event.preventDefault();
      openImage(image_el);
      return;
    }
    const copy_button = event_target.closest<HTMLButtonElement>("button[data-rt-copy]");
    if (copy_button) {
      event.preventDefault();
      copyCode(copy_button);
      return;
    }
    const footnote_link = event_target.closest<HTMLAnchorElement>("a[data-rt-footnote]");
    if (footnote_link) {
      event.preventDefault();
      scrollToFootnote(footnote_link);
      return;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const reference_el = event_target.closest<HTMLAnchorElement>("a[data-item-ref]");
    const href = reference_el?.getAttribute("href");
    if (!href) return;
    event.preventDefault();
    router.push(href);
  };

  const handleMouseOut = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-mention]")) hide();
  };

  return (
    <div ref={container_ref} className={`shell-rich-text-content ${className ?? ""}`} onMouseOver={handleMouseOver} onMouseOut={handleMouseOut} onClick={handleClick}>
      <div dangerouslySetInnerHTML={{ __html: text_html }} />
      {gallery_urls.length > 0 && (
        <div className="rich-text-image-gallery">
          {gallery_urls.map((url, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`${url}-${index}`} src={url} alt="" />
          ))}
        </div>
      )}
      <PersonCardPopover target={target} onEnter={keepOpen} onLeave={hide} onDismiss={dismiss} />
      {local_viewer && <FileImageViewer images={local_viewer.files} index={local_viewer.index} onClose={() => setLocalViewer(null)} />}
    </div>
  );
};

export default RichTextContent;
