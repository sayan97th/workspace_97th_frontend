import { $isLineBreakNode, $isParagraphNode, type LexicalNode } from "lexical";
import {
  addExportVisitor$,
  addImportVisitor$,
  realmPlugin,
  type LexicalExportVisitor,
  type MdastImportVisitor,
} from "@mdxeditor/editor";
import type { Break, Paragraph, Parent, Text as MdastText } from "mdast";

/**
 * Zero-width space used as a placeholder child for a lexical paragraph that
 * has no children (a blank line the user left for vertical spacing, e.g. by
 * pressing Enter twice). CommonMark has no syntax for a truly empty
 * paragraph — a run of blank lines is just inter-block whitespace to a
 * markdown parser, not a node — so without a placeholder, `doc_content`
 * round-trips through save/reload with those blank paragraphs silently
 * dropped. The marker is invisible when rendered and is stripped back out on
 * import (see `emptyParagraphImportVisitor` below), so it never becomes
 * visible or editable content.
 */
const EMPTY_PARAGRAPH_MARKER = "​";

/**
 * Overrides MDXEditor's built-in paragraph export visitor to give every
 * empty paragraph a placeholder text child, so blank-line spacing survives
 * the markdown round-trip. Runs before the built-in visitor (`priority: 1`
 * vs. the default `0`), and replicates its behavior (`addAndStepInto`
 * "paragraph" + visit children) exactly for non-empty paragraphs.
 */
const emptyParagraphExportVisitor: LexicalExportVisitor<LexicalNode, Paragraph> = {
  testLexicalNode: $isParagraphNode,
  priority: 1,
  visitLexicalNode: ({ lexicalNode, mdastParent, actions }) => {
    const paragraph: Paragraph = { type: "paragraph", children: [] };
    const appended = actions.appendToParent(mdastParent, paragraph) as Parent;
    actions.visitChildren(lexicalNode, appended);
    if (appended.children.length === 0) {
      const marker: MdastText = { type: "text", value: EMPTY_PARAGRAPH_MARKER };
      appended.children.push(marker);
    }
  },
};

/**
 * Strips the placeholder inserted by `emptyParagraphExportVisitor` back out
 * on import, so a round-tripped blank paragraph loads as genuinely empty
 * (not a paragraph containing an invisible character). Runs before the
 * built-in text visitor.
 */
const emptyParagraphImportVisitor: MdastImportVisitor<MdastText> = {
  testNode: (mdastNode) => mdastNode.type === "text" && (mdastNode as MdastText).value === EMPTY_PARAGRAPH_MARKER,
  priority: 1,
  visitNode: () => {
    // Intentionally a no-op: skip creating a lexical node for the marker,
    // leaving the paragraph it lived in empty.
  },
};

/**
 * Overrides MDXEditor's built-in line-break export visitor, which emits a
 * soft break (a raw `"\n"` inside the paragraph's text) — valid CommonMark,
 * but on reparse a soft break collapses into the surrounding text with no
 * structural break, so a Shift+Enter line break silently disappears after
 * save/reload. Emitting a proper mdast `break` node instead serializes as a
 * markdown hard break (backslash + newline), which round-trips losslessly.
 */
const hardLineBreakExportVisitor: LexicalExportVisitor<LexicalNode, Break> = {
  testLexicalNode: $isLineBreakNode,
  priority: 1,
  visitLexicalNode: ({ mdastParent, actions }) => {
    const lineBreak: Break = { type: "break" };
    actions.appendToParent(mdastParent, lineBreak);
  },
};

/**
 * Fixes two lossy spots in `@mdxeditor/editor`'s default markdown
 * round-trip (see visitors above) so `BoardDocEditor` content survives
 * save/reload with its blank-line spacing and Shift+Enter line breaks
 * intact. Any future markdown-editing view built on `BoardDocEditor` picks
 * this up for free since it's registered inside that component's own
 * plugin list.
 */
export const markdownFidelityPlugin = realmPlugin({
  init(realm) {
    realm.pubIn({
      [addExportVisitor$]: [emptyParagraphExportVisitor, hardLineBreakExportVisitor],
      [addImportVisitor$]: emptyParagraphImportVisitor,
    });
  },
});
