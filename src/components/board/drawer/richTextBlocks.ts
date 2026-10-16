import { mergeAttributes, Node, type AnyExtension, type MarkdownToken } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import { ALERT_KINDS, ALERT_PATTERN } from "./markdown/markdownExtensions";

/*
 * The blocks the Rich Text composer gets from the "/" menu on top of
 * StarterKit: to-do lists, toggle lists, callouts and tables. A comment is
 * stored as Markdown, so every node here writes the syntax the posted body
 * (`renderRichTextMarkdown`) already renders, and reads it back when a
 * comment is edited:
 *
 * - to-do list: `- [ ] task` (GitHub task list)
 * - toggle list: `<details><summary>Title</summary> body </details>`
 * - callout: `> [!NOTE]` (GitHub alert)
 * - table: a GitHub table with a header row
 */

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const DEFAULT_CALLOUT_KIND = "note";

/** Where a GitHub alert may begin in a run of Markdown, mirrors the posted body's alert extension. */
const ALERT_START = /(?:^|\n) {0,3}>[ \t]?\\?\[!/;

const calloutKindOf = (kind: unknown): string =>
  typeof kind === "string" && kind in ALERT_KINDS ? kind : DEFAULT_CALLOUT_KIND;

/**
 * A GitHub style alert box ("Note", "Tip", "Warning"...) holding any blocks.
 * Drawn with the posted body's own `.rt-alert` classes and octicon, so the
 * draft looks the same as the published update. The title row is not
 * editable, only the body is. The command (`setCallout`) shares its name and
 * typing with the doc editor's callout.
 */
export const RichTextCallout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      kind: {
        default: DEFAULT_CALLOUT_KIND,
        parseHTML: (element) => calloutKindOf(element.getAttribute("data-kind")),
        renderHTML: (attributes) => ({ "data-kind": calloutKindOf(attributes.kind) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]', contentElement: "[data-callout-body]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const kind = calloutKindOf(node.attrs.kind);
    const { title, icon } = ALERT_KINDS[kind];
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "callout", class: `rt-alert rt-alert--${kind}`, role: "note" }),
      [
        "p",
        { class: "rt-alert__title", contenteditable: "false" },
        [
          `${SVG_NAMESPACE} svg`,
          { class: "rt-alert__icon", viewBox: "0 0 16 16", width: "16", height: "16", "aria-hidden": "true" },
          [`${SVG_NAMESPACE} path`, { d: icon }],
        ],
        title,
      ],
      ["div", { "data-callout-body": "" }, 0],
    ];
  },

  markdownTokenName: "callout",
  markdownTokenizer: {
    name: "callout",
    level: "block",
    start: (src) => src.match(ALERT_START)?.index ?? -1,
    tokenize: (src, _tokens, lexer) => {
      const match = ALERT_PATTERN.exec(src);
      if (!match) return undefined;
      const body = match[2].replace(/^ {0,3}>[ \t]?/gm, "");
      return { type: "callout", raw: match[0], kind: match[1].toLowerCase(), tokens: lexer.blockTokens(body) };
    },
  },
  parseMarkdown: (token: MarkdownToken, helpers) => ({
    type: "callout",
    attrs: { kind: calloutKindOf(token.kind) },
    content: token.tokens?.length ? helpers.parseChildren(token.tokens) : [{ type: "paragraph" }],
  }),
  renderMarkdown: (node, helpers) => {
    const kind = calloutKindOf(node.attrs?.kind);
    const body = helpers.renderChildren(node.content ?? [], "\n\n");
    const lines = body.split("\n").map((line) => (line.trim() === "" ? ">" : `> ${line}`));
    return [`> [!${kind.toUpperCase()}]`, ...lines].join("\n");
  },

  addCommands() {
    return {
      setCallout:
        () =>
        ({ commands }) =>
          commands.wrapIn(this.name),
    };
  },
});

const DETAILS_OPEN_TAG = /^ {0,3}<details(\s+open(?:="[^"]*")?)?\s*>/i;
const DETAILS_TAG = /<\/?details\b[^>]*>/gi;
const SUMMARY = /^\s*<summary>([\s\S]*?)<\/summary>/i;

/** The index just past the `</details>` that closes the toggle opening `src`, skipping nested toggles, or -1. */
const findDetailsEnd = (src: string): number => {
  let depth = 0;
  for (const match of src.matchAll(DETAILS_TAG)) {
    depth += match[0][1] === "/" ? -1 : 1;
    if (depth === 0) return (match.index ?? 0) + match[0].length;
  }
  return -1;
};

/**
 * Tiptap's toggle list, written as GitHub's `<details>` block (the library's
 * own `:::details` syntax is not something the posted body understands). The
 * open state is kept, so a toggle posted open shows open. Enter in the title
 * of an open toggle whose body is still empty moves into that body instead of
 * adding a second blank line above it.
 */
const RichTextDetails = Details.extend({
  addKeyboardShortcuts() {
    const parent_shortcuts = this.parent?.() ?? {};
    return {
      ...parent_shortcuts,
      Enter: (props) => {
        const { state, view } = this.editor;
        const { $head, empty } = state.selection;
        if (empty && $head.parent.type.name === "detailsSummary") {
          const details = $head.node(-1);
          const body = details.child(1);
          const first_block = body.firstChild;
          if (details.attrs.open && body.childCount === 1 && first_block?.isTextblock && first_block.content.size === 0) {
            // Past the summary, into the body, into its paragraph.
            const target = $head.after() + 2;
            view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, target)).scrollIntoView());
            return true;
          }
        }
        return parent_shortcuts.Enter?.(props) ?? false;
      },
    };
  },
  markdownTokenName: "details",
  markdownTokenizer: {
    name: "details",
    level: "block",
    start: (src: string) => src.search(/<details\b/i),
    tokenize: (src: string, _tokens: MarkdownToken[], lexer) => {
      const open_tag = DETAILS_OPEN_TAG.exec(src);
      if (!open_tag) return undefined;
      const end = findDetailsEnd(src);
      if (end === -1) return undefined;

      const inner = src.slice(open_tag[0].length, src.lastIndexOf("</", end));
      const summary = SUMMARY.exec(inner);
      const body = (summary ? inner.slice(summary[0].length) : inner).trim();
      const raw_end = src[end] === "\n" ? end + 1 : end;
      return {
        type: "details",
        raw: src.slice(0, raw_end),
        is_open: Boolean(open_tag[1]),
        summary_tokens: lexer.inlineTokens(summary?.[1].trim() ?? ""),
        tokens: body ? lexer.blockTokens(body) : [],
      };
    },
  },
  parseMarkdown: (token: MarkdownToken, helpers) => ({
    type: "details",
    attrs: { open: Boolean(token.is_open) },
    content: [
      { type: "detailsSummary", content: helpers.parseInline(token.summary_tokens ?? []) },
      { type: "detailsContent", content: token.tokens?.length ? helpers.parseChildren(token.tokens) : [{ type: "paragraph" }] },
    ],
  }),
  renderMarkdown: (node, helpers) => {
    const [summary, content] = node.content ?? [];
    const title = summary?.content ? helpers.renderChildren(summary.content) : "";
    const body = content?.content ? helpers.renderChildren(content.content, "\n\n") : "";
    const open_attribute = node.attrs?.open ? " open" : "";
    const body_block = body.trim() ? `\n\n${body}` : "";
    return `<details${open_attribute}>\n<summary>${title}</summary>${body_block}\n\n</details>`;
  },
});

/** Every "/" block node the composer needs beyond StarterKit, see the file comment for their Markdown. */
export const buildRichTextBlockExtensions = (): AnyExtension[] => [
  TaskList.configure({ HTMLAttributes: { class: "rt-task-list" } }),
  TaskItem.configure({ nested: true, HTMLAttributes: { class: "rt-task" } }),
  RichTextDetails.configure({ persist: true, HTMLAttributes: { class: "rt-toggle" } }),
  DetailsSummary,
  DetailsContent,
  RichTextCallout,
  TableKit.configure({ table: { resizable: false } }),
];
