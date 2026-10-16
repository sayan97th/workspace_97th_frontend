import { Marked, Renderer, type Tokens } from "marked";
import { escapeHtml, getLanguageLabel, highlightCode, normalizeLanguage } from "./highlightCode";
import { createFootnoteContext, createFootnoteExtensions, markdown_extensions, renderFootnoteList, type FootnoteContext } from "./markdownExtensions";
import { sanitizeMarkdownHtml } from "./sanitizeMarkdownHtml";

/**
 * Markdown to HTML for a posted comment or update body (`RichTextContent`).
 *
 * GitHub flavored Markdown (tables, task lists, strikethrough, autolinks)
 * comes from `marked`, the rest from `markdownExtensions`. Raw HTML is cut
 * down to formatting tags by `sanitizeMarkdownHtml`, and link and image URLs
 * are limited to safe schemes, so the output is safe before DOMPurify runs.
 * Every class the output carries (`rt-*`) is styled in
 * `rich-text-markdown.scss`.
 */

/** Schemes a link may use. Anything else (`javascript:`, `data:`...) leaves the link text unlinked. */
const SAFE_LINK_PATTERN = /^(?:https?:|mailto:|tel:|[/#?.]|(?![a-z][a-z0-9+.-]*:))/i;
/** Images may also be inline data URLs of a raster format. */
const SAFE_IMAGE_PATTERN = /^(?:https?:|\/|\.{1,2}\/|data:image\/(?:png|jpe?g|gif|webp);|(?![a-z][a-z0-9+.-]*:))/i;

// Browsers ignore control characters and spaces inside a scheme (`java\nscript:`), so they're dropped before the check.
const cleanUrl = (url: string, pattern: RegExp): string | null => {
  // eslint-disable-next-line no-control-regex
  const trimmed = url.replace(/[\u0000-\u001F\u007F\s]+/g, "");
  return pattern.test(trimmed) ? trimmed : null;
};

const COPY_ICON =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path><path fill="currentColor" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path></svg>';

/** The copy button's label, swapped to "Copied" for a moment by `RichTextContent`. */
export const CODE_COPY_LABEL = "Copy";
export const CODE_COPIED_LABEL = "Copied";

const renderCodeBlock = (text: string, lang: string | undefined): string => {
  const language = normalizeLanguage(lang);
  // Mermaid diagrams are drawn on the client by `RichTextContent`, the source shows until then (and if the diagram fails).
  if (language === "mermaid") {
    return `<div class="rt-mermaid" data-rt-mermaid="pending"><div class="rt-mermaid__diagram"></div><pre class="rt-mermaid__source"><code>${escapeHtml(text)}</code></pre></div>\n`;
  }
  const language_class = language ? ` language-${escapeHtml(language)}` : "";
  return (
    `<div class="rt-code-block" data-language="${escapeHtml(language || "text")}">` +
    `<div class="rt-code-block__header"><span class="rt-code-block__language">${escapeHtml(getLanguageLabel(language))}</span>` +
    `<button type="button" class="rt-code-block__copy" data-rt-copy="true" aria-label="Copy code">${COPY_ICON}<span class="rt-code-block__copy-label">${CODE_COPY_LABEL}</span></button></div>` +
    `<pre><code class="hljs${language_class}">${highlightCode(text, language)}</code></pre></div>\n`
  );
};

let active_footnote_context: FootnoteContext = createFootnoteContext("rt");
const getFootnoteContext = () => active_footnote_context;

const markdown_renderer = new Marked({
  gfm: true,
  extensions: [...markdown_extensions, ...createFootnoteExtensions(getFootnoteContext)],
  hooks: {
    postprocess: (html) => html + renderFootnoteList(active_footnote_context),
  },
  renderer: {
    html({ text }) {
      return sanitizeMarkdownHtml(text);
    },
    code({ text, lang }) {
      return renderCodeBlock(text, lang);
    },
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const safe_href = cleanUrl(href, SAFE_LINK_PATTERN);
      if (!safe_href) return text;
      const title_attribute = title ? ` title="${escapeHtml(title)}"` : "";
      // Links that leave the app open in a new tab, in-app links (item references) stay in place. `href` stays first, `RichTextContent` matches on it.
      const target_attributes = /^https?:/i.test(safe_href) ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `<a href="${escapeHtml(safe_href)}"${title_attribute}${target_attributes}>${text}</a>`;
    },
    image({ href, title, text }) {
      const safe_src = cleanUrl(href, SAFE_IMAGE_PATTERN);
      if (!safe_src) return escapeHtml(text);
      const title_attribute = title ? ` title="${escapeHtml(title)}"` : "";
      return `<img src="${escapeHtml(safe_src)}" alt="${escapeHtml(text)}"${title_attribute} loading="lazy">`;
    },
    // Wide tables scroll sideways inside their own box instead of stretching a narrow drawer.
    table(token: Tokens.Table) {
      return `<div class="rt-table-wrap">${Renderer.prototype.table.call(this, token)}</div>\n`;
    },
    list(token: Tokens.List) {
      if (!token.items.some((item) => item.task)) return false;
      return Renderer.prototype.list.call(this, token).replace(/^<(ul|ol)/, '<$1 class="rt-task-list"');
    },
    listitem(item: Tokens.ListItem) {
      if (!item.task) return false;
      return `<li class="rt-task" data-checked="${item.checked ? "true" : "false"}">${this.parser.parse(item.tokens)}</li>\n`;
    },
    checkbox({ checked }) {
      return `<input type="checkbox" class="rt-task__checkbox" disabled${checked ? " checked" : ""}> `;
    },
  },
});

/**
 * Renders a stored Markdown body to HTML. `id_prefix` keeps footnote
 * anchors unique when several bodies share a page.
 */
export const renderRichTextMarkdown = (markdown: string, id_prefix = "rt"): string => {
  active_footnote_context = createFootnoteContext(id_prefix.replace(/[^a-zA-Z0-9_-]+/g, "") || "rt");
  try {
    return markdown_renderer.parse(markdown, { async: false });
  } finally {
    active_footnote_context = createFootnoteContext("rt");
  }
};
