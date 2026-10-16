import { common, createLowlight } from "lowlight";

/**
 * Syntax highlighting for fenced code blocks in a posted body. Uses the same
 * lowlight grammars as the Doc editor, so both color code with the same
 * highlight.js classes (`.hljs-keyword`, `.hljs-string`...).
 */
const lowlight = createLowlight(common);

type HighlightNode = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: { className?: string[] | string };
  children?: HighlightNode[];
};

/** The name shown in a code block header, per fence language (and its usual aliases). */
const LANGUAGE_LABELS: Record<string, string> = {
  bash: "Bash",
  sh: "Shell",
  shell: "Shell",
  zsh: "Shell",
  css: "CSS",
  scss: "SCSS",
  diff: "Diff",
  patch: "Diff",
  html: "HTML",
  xml: "XML",
  svg: "SVG",
  javascript: "JavaScript",
  js: "JavaScript",
  jsx: "JSX",
  typescript: "TypeScript",
  ts: "TypeScript",
  tsx: "TSX",
  json: "JSON",
  jsonc: "JSON",
  python: "Python",
  py: "Python",
  yaml: "YAML",
  yml: "YAML",
  sql: "SQL",
  php: "PHP",
  mermaid: "Mermaid",
  text: "Text",
  txt: "Text",
  plaintext: "Text",
  markdown: "Markdown",
  md: "Markdown",
};

/** Fence languages lowlight doesn't know by that name. */
const LANGUAGE_ALIASES: Record<string, string> = {
  html: "xml",
  svg: "xml",
  jsx: "javascript",
  tsx: "typescript",
  zsh: "bash",
  jsonc: "json",
  patch: "diff",
};

const PLAIN_LANGUAGES = new Set(["", "text", "txt", "plaintext", "plain"]);

export const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Serializes lowlight's tree, which only ever holds text and `<span class>` elements. */
const nodesToHtml = (nodes: HighlightNode[] = []): string =>
  nodes
    .map((node) => {
      if (node.type === "text") return escapeHtml(node.value ?? "");
      if (node.type !== "element") return nodesToHtml(node.children);
      const class_name = node.properties?.className;
      const classes = Array.isArray(class_name) ? class_name.join(" ") : (class_name ?? "");
      return `<span class="${escapeHtml(classes)}">${nodesToHtml(node.children)}</span>`;
    })
    .join("");

/** The fence language in lower case, without extra info (` ```js title="x" ` gives `js`). */
export const normalizeLanguage = (lang: string | undefined): string => (lang ?? "").trim().split(/\s+/)[0].toLowerCase();

export const getLanguageLabel = (language: string): string =>
  LANGUAGE_LABELS[language] ?? (language ? language.toUpperCase() : "Code");

/**
 * Diff blocks color whole lines (added, removed, hunk header) instead of
 * single tokens, the way a code review shows them.
 */
const highlightDiff = (code: string): string =>
  code
    .split("\n")
    .map((line) => {
      let kind = "context";
      if (line.startsWith("+++") || line.startsWith("---")) kind = "file";
      else if (line.startsWith("+")) kind = "add";
      else if (line.startsWith("-")) kind = "remove";
      else if (line.startsWith("@@")) kind = "hunk";
      return `<span class="rt-diff-line rt-diff-line--${kind}">${escapeHtml(line) || " "}</span>`;
    })
    .join("");

/** Highlighted HTML for a code block's text, escaped plain text when the language is unknown. */
export const highlightCode = (code: string, language: string): string => {
  if (language === "diff" || language === "patch") return highlightDiff(code);
  if (PLAIN_LANGUAGES.has(language)) return escapeHtml(code);
  const grammar = LANGUAGE_ALIASES[language] ?? language;
  if (!lowlight.registered(grammar)) return escapeHtml(code);
  try {
    return nodesToHtml(lowlight.highlight(grammar, code).children as HighlightNode[]);
  } catch {
    return escapeHtml(code);
  }
};
