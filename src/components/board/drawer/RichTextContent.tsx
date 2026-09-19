"use client";
import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import DOMPurify from "dompurify";
import { Marked } from "marked";
import { PersonCardPopover, useHoverCardController, type HoverCardPerson } from "@/components/people/PersonHoverCard";
import { MENTION_HIGHLIGHT_CLASS, MENTION_PATTERN } from "./mentionHighlight";

export type RichTextContentProps = {
  /** Markdown comment/update body, as typed into `RichTextComposer` and stored as-is by the API (see `BoardItemCommentController`/`BoardCommentController`, which no longer HTML-sanitize it — the body is plain Markdown text, not markup). */
  html: string;
  className?: string;
  /** People that can be `@mentioned` here: hovering a mention that names one of them shows their profile card. */
  people?: HoverCardPerson[];
};

const IMG_TAG_PATTERN = /<img[^>]*src="([^"]*)"[^>]*>/g;

/** A link to another item of a board, as the composer's `#` picker writes it: `/boards/{board_id}/pulses/{item_id}`. */
const ITEM_REFERENCE_LINK_PATTERN = /<a href="(\/boards\/\d+\/pulses\/\d+)"/g;

/** The look of an item reference chip, kept as one string so Tailwind sees the classes. */
const ITEM_REFERENCE_CLASS =
  "rounded-md bg-[rgba(87,155,252,0.16)] px-1.5 py-px font-semibold text-[#7fb2ff] no-underline transition-colors hover:bg-[rgba(87,155,252,0.28)]";

/** Marks item reference links as chips, so a click can open the item without reloading the page. */
const markItemReferences = (html: string): string =>
  html.replace(ITEM_REFERENCE_LINK_PATTERN, (_match, href: string) => `<a data-item-ref="true" class="${ITEM_REFERENCE_CLASS}" href="${href}"`);

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

/** Wraps `@Full Name` runs in the highlighted span the plain-text renderer used to apply, now working over an HTML string instead of plain text. The name is kept in `data-mention` so a hover can find who it refers to. */
const highlightMentions = (html: string): string =>
  html.replace(MENTION_PATTERN, (mention) => `<span class="${MENTION_HIGHLIGHT_CLASS}" data-mention="${mention}">${mention}</span>`);

/** The person a rendered mention (`@Full Name`) refers to. The pattern only captures two words, so a longer name is matched by its prefix. */
const findMentionedPerson = (people: HoverCardPerson[], mention: string): HoverCardPerson | undefined => {
  const name = mention.slice(1).toLowerCase();
  return (
    people.find((person) => person.name.toLowerCase() === name) ??
    people.find((person) => person.name.toLowerCase().startsWith(`${name} `))
  );
};

/**
 * Read-only renderer for a comment/update body — the rich text counterpart
 * of the old `renderMentionText()` plain-text highlighter, used by
 * `CommentThread` and `UpdateFeedCard`. Parses the stored Markdown to HTML
 * (raw HTML tokens stripped by {@link markdown_renderer}) and re-sanitizes
 * with DOMPurify as defense in depth (skipped during SSR, where `window`
 * doesn't exist yet — the Markdown parse alone is already safe for that
 * first paint, and the client pass re-checks it right after hydration).
 * A `[#Item name](/boards/1/pulses/2)` link written by the composer's `#` picker
 * renders as a chip that opens that item through the router. When the body carries two or more inline images, they're pulled out of
 * the flowing text and laid out as a grid instead of stacked full-width,
 * matching Monday's own update media gallery.
 */
const RichTextContent: React.FC<RichTextContentProps> = ({ html: body, className, people }) => {
  const router = useRouter();
  const { target, show, hide, keepOpen, dismiss } = useHoverCardController();
  const parsed_html = useMemo(() => markdown_renderer.parse(body, { async: false }), [body]);

  const sanitized_html = useMemo(() => {
    if (typeof window === "undefined") return parsed_html;
    return DOMPurify.sanitize(parsed_html, { ADD_ATTR: ["target"] });
  }, [parsed_html]);

  const { text_html, gallery_urls } = useMemo(() => {
    const urls = Array.from(sanitized_html.matchAll(IMG_TAG_PATTERN)).map((match) => match[1]);
    if (urls.length < 2) return { text_html: markItemReferences(highlightMentions(sanitized_html)), gallery_urls: [] as string[] };
    return { text_html: markItemReferences(highlightMentions(sanitized_html.replace(IMG_TAG_PATTERN, ""))), gallery_urls: urls };
  }, [sanitized_html]);

  const handleMouseOver = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!people?.length) return;
    const mention_el = (event.target as HTMLElement).closest<HTMLElement>("[data-mention]");
    if (!mention_el) return;
    const person = findMentionedPerson(people, mention_el.dataset.mention ?? "");
    if (person) show(person, mention_el);
  };

  // An item reference opens through the router (a plain modified click still opens a new tab).
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const reference_el = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[data-item-ref]");
    const href = reference_el?.getAttribute("href");
    if (!href) return;
    event.preventDefault();
    router.push(href);
  };

  const handleMouseOut = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-mention]")) hide();
  };

  return (
    <div className={`shell-rich-text-content ${className ?? ""}`} onMouseOver={handleMouseOver} onMouseOut={handleMouseOut} onClick={handleClick}>
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
    </div>
  );
};

export default RichTextContent;
