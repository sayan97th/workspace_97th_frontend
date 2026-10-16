/**
 * Raw HTML that a Markdown body may carry, reduced to a fixed set of
 * formatting tags (`<details>`, `<kbd>`, `<sup>`, `<mark>`, `<table>`...).
 *
 * Every allowed tag is rebuilt from scratch with only the attributes listed
 * for it, every other tag is dropped (its text stays), HTML comments are
 * removed and any stray `<` is escaped. The output is safe on its own, so a
 * body rendered during SSR (where DOMPurify can't run) never carries markup a
 * user typed. DOMPurify still runs on the client as defense in depth.
 */

/** Tags kept from raw HTML, mapped to the attributes each one may keep. */
const ALLOWED_TAGS: Record<string, readonly string[]> = {
  abbr: ["title"],
  b: [],
  blockquote: [],
  br: [],
  cite: [],
  code: [],
  dd: [],
  del: [],
  details: ["open"],
  div: [],
  dl: [],
  dt: [],
  em: [],
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  h5: [],
  h6: [],
  hr: [],
  i: [],
  ins: [],
  kbd: [],
  li: [],
  mark: [],
  ol: ["start"],
  p: [],
  pre: [],
  q: [],
  s: [],
  samp: [],
  small: [],
  span: [],
  strong: [],
  sub: [],
  summary: [],
  sup: [],
  table: [],
  tbody: [],
  td: ["align", "colspan", "rowspan"],
  tfoot: [],
  th: ["align", "colspan", "rowspan", "scope"],
  thead: [],
  tr: [],
  u: [],
  ul: [],
  var: [],
};

const VOID_TAGS = new Set(["br", "hr"]);

/** Attribute values that may be kept, per attribute. Anything else is dropped. */
const ATTRIBUTE_VALUE_PATTERNS: Record<string, RegExp> = {
  align: /^(left|center|right)$/i,
  colspan: /^\d{1,2}$/,
  rowspan: /^\d{1,2}$/,
  start: /^\d{1,6}$/,
  scope: /^(row|col|rowgroup|colgroup)$/i,
};

const HTML_COMMENT_PATTERN = /<!--[\s\S]*?(?:-->|$)/g;
const TAG_PATTERN = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s"'>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g;
const ATTRIBUTE_PATTERN = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const escapeAttribute = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const buildAttributes = (tag_name: string, raw_attributes: string): string => {
  const allowed = ALLOWED_TAGS[tag_name];
  if (!allowed.length || !raw_attributes.trim()) return "";
  const parts: string[] = [];
  for (const match of raw_attributes.matchAll(ATTRIBUTE_PATTERN)) {
    const name = match[1].toLowerCase();
    if (!allowed.includes(name)) continue;
    const value = match[2] ?? match[3] ?? match[4];
    // A boolean attribute (`<details open>`).
    if (value === undefined) {
      parts.push(name);
      continue;
    }
    const value_pattern = ATTRIBUTE_VALUE_PATTERNS[name];
    if (value_pattern && !value_pattern.test(value)) continue;
    parts.push(`${name}="${escapeAttribute(value)}"`);
  }
  return parts.length ? ` ${parts.join(" ")}` : "";
};

export const sanitizeMarkdownHtml = (raw_html: string): string => {
  const without_comments = raw_html.replace(HTML_COMMENT_PATTERN, "");
  let output = "";
  let last_index = 0;
  for (const match of without_comments.matchAll(TAG_PATTERN)) {
    const index = match.index ?? 0;
    // Text between tags keeps its entities, only a `<` that didn't open a valid tag is escaped.
    output += without_comments.slice(last_index, index).replace(/</g, "&lt;");
    last_index = index + match[0].length;
    const [, closing_slash, raw_name, raw_attributes] = match;
    const tag_name = raw_name.toLowerCase();
    if (!(tag_name in ALLOWED_TAGS)) continue;
    // A raw `<table>` scrolls inside the same `.rt-table-wrap` box as a Markdown table.
    if (closing_slash) {
      if (tag_name === "table") output += "</table></div>";
      else if (!VOID_TAGS.has(tag_name)) output += `</${tag_name}>`;
      continue;
    }
    if (tag_name === "table") output += '<div class="rt-table-wrap">';
    output += `<${tag_name}${buildAttributes(tag_name, raw_attributes)}>`;
  }
  return output + without_comments.slice(last_index).replace(/</g, "&lt;");
};
