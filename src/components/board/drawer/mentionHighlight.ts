import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

/** Matches an `@Full Name` mention run — shared by every place a mention gets colored, live or read-only. */
export const MENTION_PATTERN = /(@[A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?)/g;

/** The Slack-style mention color/weight, as Tailwind utility classes so every consumer renders identically. */
export const MENTION_HIGHLIGHT_CLASS = "font-semibold text-[#7fb2ff]";

const buildMentionDecorations = (doc: ProseMirrorNode): DecorationSet => {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    for (const match of node.text.matchAll(MENTION_PATTERN)) {
      const start = pos + (match.index ?? 0);
      const end = start + match[0].length;
      decorations.push(Decoration.inline(start, end, { class: MENTION_HIGHLIGHT_CLASS }));
    }
  });
  return DecorationSet.create(doc, decorations);
};

/**
 * Tiptap extension that colors `@Full Name` mentions blue as they're typed,
 * matching the highlight `RichTextContent`/`renderMentionText` apply once a
 * comment is posted. Implemented as ProseMirror view decorations rather than
 * real document marks, so it never touches the HTML the composer submits,
 * only how it's painted while editing.
 */
export const MentionHighlight = Extension.create({
  name: "mentionHighlight",
  addProseMirrorPlugins() {
    const plugin_key = new PluginKey("mentionHighlight");
    return [
      new Plugin({
        key: plugin_key,
        state: {
          init: (_, { doc }) => buildMentionDecorations(doc),
          apply: (transaction, old_set, _old_state, new_state) =>
            transaction.docChanged ? buildMentionDecorations(new_state.doc) : old_set,
        },
        props: {
          decorations: (state) => plugin_key.getState(state),
        },
      }),
    ];
  },
});

export default MentionHighlight;
