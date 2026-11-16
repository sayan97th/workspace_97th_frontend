import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

/**
 * Matches any `@Full Name` looking run. Only a fallback now, for read-only
 * bodies rendered without the list of people who can be mentioned there:
 * the composer and the drawer threads color exact names only, see
 * {@link findNamedMentions}.
 */
export const MENTION_PATTERN = /(@[A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?)/g;

/** The mention chip look (`rich-text.css`), one class so the live editor and every posted body render identically. */
export const MENTION_HIGHLIGHT_CLASS = "rich-text-mention";

/** A letter or digit right after a name means the text goes on, `@Amanda Carters` is not `@Amanda Carter`. */
const WORD_CHARACTER = /[\p{L}\p{M}\p{N}_]/u;
/** What may come right before the `@` of a mention: start of text, whitespace or an opening bracket or quote. */
const BOUNDARY_BEFORE = /[\s​⁠﻿([{"'“‘>]/;

/** One exact `@Name` found in a text, as indexes into it. */
export type NamedMention = { name: string; start: number; end: number };

/**
 * Every `@Name` in `text` whose name is exactly one of `names` (same letters,
 * same case, nothing glued after it), longest name first so `@Abby Allan`
 * wins over a group called `Abby`. Anything else after an `@`, a typo or an
 * extra letter, is not a mention.
 */
export const findNamedMentions = (text: string, names: readonly string[]): NamedMention[] => {
  if (names.length === 0 || !text.includes("@")) return [];
  const by_length = [...new Set(names.filter((name) => name.trim() !== ""))].sort((first, second) => second.length - first.length);
  const found: NamedMention[] = [];
  let index = text.indexOf("@");
  while (index !== -1) {
    const is_boundary = index === 0 || BOUNDARY_BEFORE.test(text[index - 1]);
    const name = is_boundary
      ? by_length.find((candidate) => text.startsWith(candidate, index + 1) && !WORD_CHARACTER.test(text.charAt(index + 1 + candidate.length)))
      : undefined;
    if (name) {
      const end = index + 1 + name.length;
      found.push({ name, start: index, end });
      index = text.indexOf("@", end);
    } else {
      index = text.indexOf("@", index + 1);
    }
  }
  return found;
};

export type MentionHighlightOptions = {
  /**
   * The names a mention may use: everyone on the board and the groups picked
   * from the `@` list. Only an exact `@Name` of one of them is colored. Read
   * on every change, and again when the composer dispatches
   * {@link refreshMentionHighlight} after the roster changes.
   */
  getNames: () => readonly string[];
};

const plugin_key = new PluginKey<DecorationSet>("mentionHighlight");

/** Meta that makes the highlighter read `getNames` again, for a roster that changed without an edit. */
export const refreshMentionHighlight = <T extends { setMeta: (key: PluginKey, value: unknown) => T }>(transaction: T): T =>
  transaction.setMeta(plugin_key, true);

const buildMentionDecorations = (doc: ProseMirrorNode, names: readonly string[]): DecorationSet => {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    for (const mention of findNamedMentions(node.text, names)) {
      decorations.push(Decoration.inline(pos + mention.start, pos + mention.end, { class: MENTION_HIGHLIGHT_CLASS }));
    }
  });
  return DecorationSet.create(doc, decorations);
};

/**
 * Tiptap extension that colors a mention blue in the composer, only when it
 * names someone exactly, which is also when the draft tags them (see
 * `RichTextComposer`). A misspelled or edited `@Name` goes back to plain
 * text. Drawn as ProseMirror view decorations rather than document marks, so
 * it never touches the Markdown the composer submits.
 */
export const MentionHighlight = Extension.create<MentionHighlightOptions>({
  name: "mentionHighlight",

  addOptions() {
    return { getNames: () => [] };
  },

  addProseMirrorPlugins() {
    const { getNames } = this.options;
    return [
      new Plugin<DecorationSet>({
        key: plugin_key,
        state: {
          init: (_, { doc }) => buildMentionDecorations(doc, getNames()),
          apply: (transaction, old_set, _old_state, new_state) =>
            transaction.docChanged || transaction.getMeta(plugin_key) ? buildMentionDecorations(new_state.doc, getNames()) : old_set,
        },
        props: {
          decorations: (state) => plugin_key.getState(state),
        },
      }),
    ];
  },
});

export default MentionHighlight;
