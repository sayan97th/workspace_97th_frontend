import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { changesPastedFlags, getUnresolvedMentions, UNRESOLVED_MENTION_CLASS } from "./pastedMentions";

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

/**
 * An `@name` that looks like a mention: a word right after the `@`, plus a
 * capitalized second word (`@Amanda McKay`). Read in plain text, so the
 * boundary before the `@` is checked separately.
 */
const MENTION_LIKE = /@([\p{L}\p{M}][\p{L}\p{M}\p{N}_'-]*)(?: (\p{Lu}[\p{L}\p{M}'-]*))?/gu;
/** Slack's group handles, never flagged: there is no person behind them. */
const SPECIAL_HANDLES = new Set(["channel", "here", "everyone"]);

/** Hover hint on a typed `@name` nobody has. */
const UNKNOWN_MENTION_TITLE = "No one on this board has this name, so nobody will be notified";

const buildMentionDecorations = (state: EditorState, names: readonly string[]): DecorationSet => {
  const { doc, selection } = state;
  const decorations: Decoration[] = [];
  // Pasted names are flagged (and fixed) by `PastedMentions`, they keep their own underline.
  // It is registered before this extension, so its state is already up to date here.
  const pasted_flags = getUnresolvedMentions(state);
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const named = findNamedMentions(node.text, names);
    for (const mention of named) {
      decorations.push(Decoration.inline(pos + mention.start, pos + mention.end, { class: MENTION_HIGHLIGHT_CLASS }));
    }
    // Before the roster loads every name would look unknown, so nothing is flagged yet.
    if (names.length === 0) return;
    for (const match of node.text.matchAll(MENTION_LIKE)) {
      const start = match.index ?? 0;
      if (start > 0 && !BOUNDARY_BEFORE.test(node.text[start - 1])) continue;
      if (SPECIAL_HANDLES.has(match[1].toLowerCase())) continue;
      if (named.some((mention) => mention.start === start)) continue;
      const from = pos + start;
      const to = from + match[0].length;
      // The name being typed at the caret is not judged yet, the `@` list is helping with it.
      if (selection.empty && selection.from >= from && selection.from <= to) continue;
      if (pasted_flags.some((flag) => flag.from < to && flag.to > from)) continue;
      decorations.push(
        Decoration.inline(from, to, {
          class: UNRESOLVED_MENTION_CLASS,
          "data-unresolved-kind": "unknown",
          title: UNKNOWN_MENTION_TITLE,
        })
      );
    }
  });
  return DecorationSet.create(doc, decorations);
};

/**
 * Tiptap extension that colors a mention blue in the composer, only when it
 * names someone exactly, which is also when the draft tags them (see
 * `RichTextComposer`). Any other `@name` (a typo, someone not on the board)
 * gets the dashed yellow underline once the caret leaves it, the same warning
 * pasted names get, so it is clear nobody will be notified. Drawn as ProseMirror view decorations rather than document marks, so
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
          init: (_, state) => buildMentionDecorations(state, getNames()),
          // The caret moving in or out of a name decides whether it is flagged, so selection changes count too.
          apply: (transaction, old_set, _old_state, new_state) =>
            transaction.docChanged || transaction.selectionSet || transaction.getMeta(plugin_key) || changesPastedFlags(transaction)
              ? buildMentionDecorations(new_state, getNames())
              : old_set,
        },
        props: {
          decorations: (state) => plugin_key.getState(state),
        },
      }),
    ];
  },
});

export default MentionHighlight;
