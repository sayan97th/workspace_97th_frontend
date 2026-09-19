/** Longest quote kept, so quoting a long update does not bury the reply under it. */
const MAX_QUOTE_LENGTH = 400;

/**
 * The Markdown a reply composer gets when someone quotes a comment: a bold
 * "Name wrote:" line followed by the comment's text as a blockquote. Inline
 * images collapse to a placeholder and a long body is cut at a line or word
 * boundary with an ellipsis.
 */
export function buildQuoteMarkdown(author_name: string, body: string): string {
  const plain = body.replace(/!\[[^\]]*\]\([^)]*\)/g, "[image]").trim();

  let text = plain;
  if (text.length > MAX_QUOTE_LENGTH) {
    const cut = text.slice(0, MAX_QUOTE_LENGTH);
    const boundary = Math.max(cut.lastIndexOf("\n"), cut.lastIndexOf(" "));
    text = `${(boundary > MAX_QUOTE_LENGTH / 2 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
  }

  const quoted = text
    .split("\n")
    .map((line) => (line.trim() === "" ? ">" : `> ${line}`))
    .join("\n");

  return `> **${author_name}** wrote:\n>\n${quoted}`;
}
