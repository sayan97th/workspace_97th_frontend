/**
 * Decides when pasted text should be read as Markdown, so text copied from a
 * README, a code editor, ChatGPT or a terminal turns into titles, lists,
 * quotes, tables and code in the rich text composer instead of literal
 * `**stars**` and `- dashes`. Rich clipboard content (a web page, Google Docs,
 * Word) keeps the editor's own HTML paste, which already carries formatting.
 */

/** Block syntax, one match anywhere in the text is enough. */
const BLOCK_PATTERNS: RegExp[] = [
  /^#{1,6}\s+\S/m, // # Title
  /^\s{0,3}[-*+]\s+\S/m, // - bullet
  /^\s{0,3}\d{1,9}[.)]\s+\S/m, // 1. numbered
  /^\s{0,3}>\s?\S/m, // > quote
  /^\s{0,3}(```|~~~)/m, // ``` code fence
  /^\s{0,3}\|.+\|\s*\n\s{0,3}\|?\s*:?-{3,}/m, // | table | header row
  /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/m, // --- divider
];

/** Inline syntax, closed on the same line so a stray `*` or `_` never counts. */
const INLINE_PATTERNS: RegExp[] = [
  /\*\*[^*\n]+\*\*/, // **bold**
  /(?:^|[\s(])__[^_\n]+__(?=$|[\s).,!?])/m, // __bold__
  /(?:^|[\s(])\*[^*\s][^*\n]*\*(?=$|[\s).,!?])/m, // *italic*
  /(?:^|[\s(])_[^_\s][^_\n]*_(?=$|[\s).,!?])/m, // _italic_
  /~~[^~\n]+~~/, // ~~strike~~
  /`[^`\n]+`/, // `code`
  /!?\[[^\]\n]*\]\([^)\s]+\)/, // [link](url) and ![image](url)
];

/** HTML tags that mean the clipboard already holds formatted content worth keeping as is. */
const RICH_HTML_PATTERN = /<(?:strong|b|em|i|u|s|del|ul|ol|li|h[1-6]|blockquote|table|img|a)[\s>]/i;

/** True when `text` uses Markdown syntax worth converting. */
export const looksLikeMarkdown = (text: string): boolean => {
  if (text.trim() === "") return false;
  return BLOCK_PATTERNS.some((pattern) => pattern.test(text)) || INLINE_PATTERNS.some((pattern) => pattern.test(text));
};

/**
 * The Markdown to insert for a paste, or null to let the editor paste the
 * usual way. Plain text only: when the clipboard also carries formatted HTML
 * that HTML wins, but the plain styled spans code editors and terminals add
 * (no real formatting tags) do not count as formatting.
 */
export const getPastedMarkdown = (clipboard: DataTransfer | null): string | null => {
  if (!clipboard) return null;
  const text = clipboard.getData("text/plain");
  if (!looksLikeMarkdown(text)) return null;

  const html = clipboard.getData("text/html");
  if (html && RICH_HTML_PATTERN.test(html)) return null;

  return text.replace(/\r\n?/g, "\n");
};
