import type { TokenizerAndRendererExtension, Tokens } from "marked";
import katex from "katex";
import { gemoji } from "gemoji";
import { escapeHtml } from "./highlightCode";

/**
 * Markdown syntax `marked` doesn't parse on its own, added as extensions:
 * `==highlight==`, footnotes, `$math$`/`$$math$$`, `:emoji:` shortcodes,
 * `Term` + `: Definition` lists and GitHub's `> [!NOTE]` alerts.
 */

/** State one render shares between footnote references, definitions and the footnote list. */
export type FootnoteContext = {
  /** Prefix for footnote anchors, so two bodies on one page never share an id. */
  id_prefix: string;
  /** Footnote ids defined in the body, filled while lexing so a reference knows it has a target. */
  defined_ids: Set<string>;
  /** Footnote ids in the order they're first referenced, which gives their numbers. */
  referenced_ids: string[];
  /** How many times each id has been referenced so far, so every reference gets its own anchor. */
  reference_counts: Map<string, number>;
  /** Each definition's rendered HTML, by id. */
  definitions: Map<string, string>;
};

export const createFootnoteContext = (id_prefix: string): FootnoteContext => ({
  id_prefix,
  defined_ids: new Set(),
  referenced_ids: [],
  reference_counts: new Map(),
  definitions: new Map(),
});

const toAnchorId = (value: string): string => value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");

const footnoteAnchor = (context: FootnoteContext, id: string): string => `${context.id_prefix}-fn-${toAnchorId(id)}`;
/** The first reference to a footnote is `fnref-id`, later ones `fnref-id-2`, `fnref-id-3`... The back link returns to the first. */
const footnoteReferenceAnchor = (context: FootnoteContext, id: string, occurrence = 1): string =>
  `${context.id_prefix}-fnref-${toAnchorId(id)}${occurrence > 1 ? `-${occurrence}` : ""}`;

/** `==Highlight==` renders as `<mark>`. */
const highlight_extension: TokenizerAndRendererExtension = {
  name: "highlight",
  level: "inline",
  start: (src) => src.indexOf("=="),
  tokenizer(src) {
    const match = /^==(?=[^\s=])([\s\S]*?[^\s=])==(?!=)/.exec(src);
    if (!match) return undefined;
    return { type: "highlight", raw: match[0], text: match[1], tokens: this.lexer.inlineTokens(match[1]) };
  },
  renderer(token) {
    return `<mark>${this.parser.parseInline(token.tokens ?? [])}</mark>`;
  },
};

/** `$$ ... $$` on its own lines, rendered by KaTeX as display math. */
const math_block_extension: TokenizerAndRendererExtension = {
  name: "mathBlock",
  level: "block",
  start: (src) => src.match(/(?:^|\n) {0,3}\$\$/)?.index,
  tokenizer(src) {
    const match = /^ {0,3}\$\$([\s\S]+?)\$\$[ \t]*(?:\n+|$)/.exec(src);
    if (!match) return undefined;
    return { type: "mathBlock", raw: match[0], text: match[1].trim() };
  },
  renderer(token) {
    return `<div class="rt-math rt-math--block">${renderMath(token.text, true)}</div>\n`;
  },
};

/**
 * `$ ... $` inside a line. Like GitHub, the opening `$` must be followed by a
 * non space and the closing one preceded by a non space and not followed by a
 * digit, so prices ("$5 and $10") stay plain text.
 */
const math_inline_extension: TokenizerAndRendererExtension = {
  name: "mathInline",
  level: "inline",
  start: (src) => src.indexOf("$"),
  tokenizer(src) {
    const match = /^\$(?![\s$])((?:\\\$|[^$\n])+?)(?<![\s\\])\$(?![\d$])/.exec(src);
    if (!match) return undefined;
    return { type: "mathInline", raw: match[0], text: match[1] };
  },
  renderer(token) {
    return `<span class="rt-math rt-math--inline">${renderMath(token.text, false)}</span>`;
  },
};

const renderMath = (expression: string, display_mode: boolean): string => {
  try {
    return katex.renderToString(expression, { displayMode: display_mode, throwOnError: false, output: "htmlAndMathml", strict: "ignore" });
  } catch {
    return `<code>${escapeHtml(expression)}</code>`;
  }
};

/** Every GitHub shortcode (`smile`, `+1`, `tada`...) mapped to its emoji. */
const EMOJI_BY_SHORTCODE = new Map<string, string>(gemoji.flatMap((entry) => entry.names.map((name) => [name, entry.emoji] as const)));

/** `:emoji:` shortcodes. An unknown name (or a time like `10:30:00`) stays plain text. */
const emoji_extension: TokenizerAndRendererExtension = {
  name: "emoji",
  level: "inline",
  start: (src) => src.indexOf(":"),
  tokenizer(src) {
    const match = /^:([a-z0-9_+-]+):/.exec(src);
    if (!match) return undefined;
    const emoji = EMOJI_BY_SHORTCODE.get(match[1]);
    if (!emoji) return undefined;
    return { type: "emoji", raw: match[0], name: match[1], emoji };
  },
  renderer(token) {
    return `<span class="rt-emoji" role="img" aria-label="${escapeHtml(token.name)}" title=":${escapeHtml(token.name)}:">${token.emoji}</span>`;
  },
};

/**
 * `Term` on one line followed by one or more `: Definition` lines, as in
 * PHP Markdown Extra. A term can't look like another block (heading, quote,
 * list, table).
 */
const DEFINITION_LIST_PATTERN = /^(?:(?![ \t]*(?:[#>|:*+-]|\d+[.)]))[^\n]+\n(?: {0,3}:[ \t]+[^\n]+(?:\n|$))+\n*)+/;

const definition_list_extension: TokenizerAndRendererExtension = {
  name: "definitionList",
  level: "block",
  // Like the other block starts, this points at the newline before the term, so a paragraph above ends there.
  start: (src) => /(?:^|\n)[^\n]+\n {0,3}:[ \t]/.exec(src)?.index,
  tokenizer(src) {
    const match = DEFINITION_LIST_PATTERN.exec(src);
    if (!match) return undefined;
    const items: { kind: "term" | "definition"; tokens: Tokens.Generic[] }[] = [];
    for (const line of match[0].split("\n")) {
      if (!line.trim()) continue;
      const definition = /^ {0,3}:[ \t]+(.*)$/.exec(line);
      const text = definition ? definition[1] : line.trim();
      items.push({ kind: definition ? "definition" : "term", tokens: this.lexer.inlineTokens(text) });
    }
    return { type: "definitionList", raw: match[0], items };
  },
  renderer(token) {
    const items = token.items as { kind: "term" | "definition"; tokens: Tokens.Generic[] }[];
    const body = items
      .map((item) => {
        const tag = item.kind === "term" ? "dt" : "dd";
        return `<${tag}>${this.parser.parseInline(item.tokens)}</${tag}>`;
      })
      .join("\n");
    return `<dl class="rt-definition-list">\n${body}\n</dl>\n`;
  },
};

/** GitHub alert kinds, with their title and octicon path. */
const ALERT_KINDS: Record<string, { title: string; icon: string }> = {
  note: {
    title: "Note",
    icon: "M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z",
  },
  tip: {
    title: "Tip",
    icon: "M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z",
  },
  important: {
    title: "Important",
    icon: "M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z",
  },
  warning: {
    title: "Warning",
    icon: "M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z",
  },
  caution: {
    title: "Caution",
    icon: "M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z",
  },
};

/**
 * `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]` and `> [!CAUTION]`
 * quotes render as GitHub style alerts. The composer saves a typed `[` as
 * `\[`, so the escaped marker is accepted too.
 */
const ALERT_PATTERN = /^ {0,3}>[ \t]?\\?\[!(note|tip|important|warning|caution)\\?\][ \t]*(?:\n|$)((?: {0,3}>[^\n]*(?:\n|$))*)/i;

const alert_extension: TokenizerAndRendererExtension = {
  name: "alert",
  level: "block",
  start: (src) => src.match(/(?:^|\n) {0,3}>[ \t]?\\?\[!/)?.index,
  tokenizer(src) {
    const match = ALERT_PATTERN.exec(src);
    if (!match) return undefined;
    const body = match[2].replace(/^ {0,3}>[ \t]?/gm, "");
    return { type: "alert", raw: match[0], kind: match[1].toLowerCase(), tokens: this.lexer.blockTokens(body, []) };
  },
  renderer(token) {
    const kind = ALERT_KINDS[token.kind as string] ?? ALERT_KINDS.note;
    const icon = `<svg class="rt-alert__icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="${kind.icon}"></path></svg>`;
    return `<div class="rt-alert rt-alert--${token.kind}" role="note"><p class="rt-alert__title">${icon}${kind.title}</p>${this.parser.parse(token.tokens ?? [])}</div>\n`;
  },
};

/** `[^id]: Footnote text`, continued on lines indented by two or more spaces. Rendered at the end of the body. */
const createFootnoteDefinitionExtension = (getContext: () => FootnoteContext): TokenizerAndRendererExtension => ({
  name: "footnoteDefinition",
  level: "block",
  start: (src) => src.match(/(?:^|\n) {0,3}\[\^/)?.index,
  tokenizer(src) {
    const match = /^ {0,3}\[\^([^\]\s]+)\]:[ \t]*([^\n]*(?:\n(?: {2,}|\t)[^\n]*)*)(?:\n+|$)/.exec(src);
    if (!match) return undefined;
    getContext().defined_ids.add(match[1]);
    const text = match[2].replace(/\n(?: {2,}|\t)/g, "\n");
    return { type: "footnoteDefinition", raw: match[0], id: match[1], tokens: this.lexer.blockTokens(text, []) };
  },
  renderer(token) {
    getContext().definitions.set(token.id as string, this.parser.parse(token.tokens ?? []));
    return "";
  },
});

/** `Footnote[^id]`, a numbered superscript link to its definition. Left as text when nothing defines the id. */
const createFootnoteReferenceExtension = (getContext: () => FootnoteContext): TokenizerAndRendererExtension => ({
  name: "footnoteReference",
  level: "inline",
  start: (src) => src.indexOf("[^"),
  tokenizer(src) {
    const match = /^\[\^([^\]\s]+)\](?!:)/.exec(src);
    if (!match || !getContext().defined_ids.has(match[1])) return undefined;
    return { type: "footnoteReference", raw: match[0], id: match[1] };
  },
  renderer(token) {
    const context = getContext();
    const id = token.id as string;
    if (!context.referenced_ids.includes(id)) context.referenced_ids.push(id);
    const number = context.referenced_ids.indexOf(id) + 1;
    const occurrence = (context.reference_counts.get(id) ?? 0) + 1;
    context.reference_counts.set(id, occurrence);
    return `<sup class="rt-footnote-ref"><a href="#${footnoteAnchor(context, id)}" id="${footnoteReferenceAnchor(context, id, occurrence)}" data-rt-footnote="true" aria-label="Footnote ${number}">${number}</a></sup>`;
  },
});

export const createFootnoteExtensions = (getContext: () => FootnoteContext): TokenizerAndRendererExtension[] => [
  createFootnoteDefinitionExtension(getContext),
  createFootnoteReferenceExtension(getContext),
];

/** The numbered footnote list appended after the body, referenced footnotes first, then any defined but never referenced. */
export const renderFootnoteList = (context: FootnoteContext): string => {
  const ordered_ids = [...context.referenced_ids, ...[...context.definitions.keys()].filter((id) => !context.referenced_ids.includes(id))];
  if (!ordered_ids.length) return "";
  const items = ordered_ids
    .map((id) => {
      const content = context.definitions.get(id) ?? "";
      const back_link = context.referenced_ids.includes(id)
        ? ` <a href="#${footnoteReferenceAnchor(context, id)}" class="rt-footnote-backref" data-rt-footnote="true" aria-label="Back to reference">↩</a>`
        : "";
      // The back link sits at the end of the definition's last paragraph rather than on a line of its own.
      const with_back_link = /<\/p>\s*$/.test(content) ? content.replace(/<\/p>\s*$/, `${back_link}</p>`) : `${content}${back_link}`;
      return `<li id="${footnoteAnchor(context, id)}">${with_back_link}</li>`;
    })
    .join("\n");
  return `<section class="rt-footnotes" aria-label="Footnotes">\n<ol>\n${items}\n</ol>\n</section>\n`;
};

export const markdown_extensions: TokenizerAndRendererExtension[] = [
  alert_extension,
  math_block_extension,
  definition_list_extension,
  highlight_extension,
  math_inline_extension,
  emoji_extension,
];
