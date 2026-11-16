import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";
import type { BoardPersonOption } from "../toolbar/types";

/**
 * Slack style tagging for pasted text: every `@Name` in text pasted into a
 * composer that names someone on the board becomes a real mention, written
 * out as `@Full Name` (the form the picker inserts and the highlighter
 * colors) and reported so the composer adds that person to the draft's
 * `mentioned_user_ids`. Text pasted from Slack usually carries the mention
 * as a link, bold or code run, so the rewritten mention also drops that
 * formatting, which would otherwise hide it from the highlighter.
 */

/** One `@Name` found in a run of text, with the person it names. */
export type TextMention = {
  person: BoardPersonOption;
  /** Index of the `@` in the text. */
  start: number;
  /** Index right after the last character of the matched name. */
  end: number;
};

/** Characters a mention may follow: start of text, whitespace, zero width spaces Slack leaves behind, or an opening bracket or quote. */
const MENTION_BOUNDARY_BEFORE = /[\s​⁠﻿([{"'“‘]/;
/** A letter or digit, so `@Ana` never matches the start of `@Anabel`. */
const WORD_CHARACTER = /[\p{L}\p{M}\p{N}_]/u;
/** The single word right after an `@`, used to match a first name. */
const LEADING_WORD = /^[\p{L}\p{M}\p{N}_'-]+/u;

/** Non breaking spaces (Slack and web pages paste them) compare as plain spaces, keeping every index in place. */
const normalizeSpaces = (text: string): string => text.replace(/[  ]/g, " ");

const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? "";

/**
 * Every `@Name` in `text` that names one of `people`. The longest full name
 * wins (`@Abby Allan` over a teammate called `Abby`), then a first name that
 * only one person on the board has (`@Kevin`), case insensitive both ways.
 * An `@` inside an email address or a word is never read as a mention.
 */
export const findTextMentions = (text: string, people: BoardPersonOption[]): TextMention[] => {
  const searchable = people.filter((person) => !person.is_deactivated && person.name.trim() !== "");
  if (searchable.length === 0 || !text.includes("@")) return [];

  const by_length = [...searchable].sort((first, second) => second.name.length - first.name.length);
  const first_name_counts = new Map<string, number>();
  for (const person of searchable) {
    const key = firstName(person.name).toLowerCase();
    first_name_counts.set(key, (first_name_counts.get(key) ?? 0) + 1);
  }

  const normalized = normalizeSpaces(text);
  const lowered = normalized.toLowerCase();
  // A few letters change length when lowercased, which would shift every index, so those texts compare as typed.
  const haystack = lowered.length === normalized.length ? lowered : normalized;
  const mentions: TextMention[] = [];
  let index = haystack.indexOf("@");

  while (index !== -1) {
    const char_before = index > 0 ? haystack[index - 1] : "";
    if (index === 0 || MENTION_BOUNDARY_BEFORE.test(char_before)) {
      const rest = haystack.slice(index + 1);
      const isWholeWord = (length: number) => !WORD_CHARACTER.test(rest.charAt(length));

      let match: TextMention | null = null;
      const full_name_person = by_length.find((person) => {
        const name = normalizeSpaces(person.name).toLowerCase();
        return rest.startsWith(name) && isWholeWord(name.length);
      });
      if (full_name_person) {
        match = { person: full_name_person, start: index, end: index + 1 + full_name_person.name.length };
      } else {
        const word = LEADING_WORD.exec(rest)?.[0].replace(/['-]+$/, "") ?? "";
        if (word && first_name_counts.get(word) === 1) {
          const person = searchable.find((candidate) => firstName(candidate.name).toLowerCase() === word);
          if (person) match = { person, start: index, end: index + 1 + word.length };
        }
      }

      if (match) {
        mentions.push(match);
        index = haystack.indexOf("@", match.end);
        continue;
      }
    }
    index = haystack.indexOf("@", index + 1);
  }

  return mentions;
};

/** Meta set on a transaction whose inserted text should be scanned for mentions, for pastes made through `insertContent`. */
export const PASTED_MENTIONS_META = "pastedMentions";

/** The range a transaction inserted, in the new document, or null when it inserted nothing. */
const insertedRange = (transaction: Transaction): { from: number; to: number } | null => {
  let from = Number.POSITIVE_INFINITY;
  let to = Number.NEGATIVE_INFINITY;
  transaction.mapping.maps.forEach((step_map, step_index) => {
    step_map.forEach((_old_start, _old_end, new_start, new_end) => {
      // Later steps can move what this step inserted, so the range is carried to the final document.
      const remaining = transaction.mapping.slice(step_index + 1);
      from = Math.min(from, remaining.map(new_start, -1));
      to = Math.max(to, remaining.map(new_end, 1));
    });
  });
  return from < to ? { from, to } : null;
};

type MentionRewrite = { from: number; to: number; person: BoardPersonOption };

/**
 * The mentions inside `from`..`to`, one text block at a time, so a name split
 * across formatting runs (`@Abby` bold, ` Allan` plain) still matches. Code
 * blocks are skipped, their text is meant literally.
 */
const collectRewrites = (doc: ProseMirrorNode, from: number, to: number, people: BoardPersonOption[]): MentionRewrite[] => {
  const rewrites: MentionRewrite[] = [];
  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return true;
    if (node.type.spec.code) return false;

    // The block's text with the document position of every character, inline atoms as one placeholder.
    let text = "";
    const positions: number[] = [];
    node.forEach((child, offset) => {
      const child_pos = pos + 1 + offset;
      if (child.isText && child.text) {
        for (let char_index = 0; char_index < child.text.length; char_index += 1) {
          text += child.text[char_index];
          positions.push(child_pos + char_index);
        }
      } else {
        text += "￼";
        positions.push(child_pos);
      }
    });

    for (const mention of findTextMentions(text, people)) {
      const mention_from = positions[mention.start];
      const mention_to = positions[mention.end - 1] + 1;
      // Only what the paste brought in, so names typed earlier in the draft are left alone.
      if (mention_to <= from || mention_from >= to) continue;
      rewrites.push({ from: mention_from, to: mention_to, person: mention.person });
    }
    return false;
  });
  return rewrites;
};

export type PastedMentionsOptions = {
  /** The people a pasted `@Name` can tag, read on every paste so it always has the latest roster. */
  getPeople: () => BoardPersonOption[];
  /** Called once per paste with everyone it tagged, in order, without repeats. */
  onMentions: (people: BoardPersonOption[]) => void;
};

/**
 * Tiptap extension behind pasted mentions: after a paste (ProseMirror's own,
 * or a Markdown paste tagged with {@link PASTED_MENTIONS_META}), rewrites every
 * `@Name` the paste brought in to a plain `@Full Name` run and reports who it
 * tagged through `onMentions`.
 */
export const PastedMentions = Extension.create<PastedMentionsOptions>({
  name: "pastedMentions",

  addOptions() {
    return {
      getPeople: () => [],
      onMentions: () => {},
    };
  },

  addProseMirrorPlugins() {
    const { getPeople, onMentions } = this.options;
    return [
      new Plugin({
        key: new PluginKey("pastedMentions"),
        appendTransaction: (transactions, _old_state, new_state) => {
          const paste = transactions.find(
            (transaction) =>
              transaction.docChanged &&
              (transaction.getMeta("uiEvent") === "paste" || transaction.getMeta(PASTED_MENTIONS_META) === true)
          );
          if (!paste) return null;
          const people = getPeople();
          if (people.length === 0) return null;

          // Mapped through any transaction that came after the paste in this same batch.
          const range = insertedRange(paste);
          if (!range) return null;
          const paste_index = transactions.indexOf(paste);
          let from = range.from;
          let to = range.to;
          for (const later of transactions.slice(paste_index + 1)) {
            from = later.mapping.map(from, -1);
            to = later.mapping.map(to, 1);
          }
          // One character back, so an `@` typed right before the pasted name still counts.
          from = Math.max(0, from - 1);
          to = Math.min(new_state.doc.content.size, to);

          const rewrites = collectRewrites(new_state.doc, from, to, people);
          if (rewrites.length === 0) return null;

          const transaction = new_state.tr;
          // Last first, so earlier positions stay valid while later ones change length.
          for (const rewrite of [...rewrites].reverse()) {
            transaction.replaceWith(rewrite.from, rewrite.to, new_state.schema.text(`@${rewrite.person.name}`));
          }
          // Typing right after the paste starts plain, not inside the link or code the mention came in.
          transaction.setStoredMarks([]);

          const tagged: BoardPersonOption[] = [];
          for (const rewrite of rewrites) {
            if (!tagged.some((person) => person.id === rewrite.person.id)) tagged.push(rewrite.person);
          }
          // Reported after this update settles, so the parent's state change never lands mid transaction.
          queueMicrotask(() => onMentions(tagged));
          return transaction;
        },
      }),
    ];
  },
});

/** Escapes `text` for use inside a `RegExp`. */
const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Document positions of the `@` in every `@name` mention, whole names only,
 * for turning a tag back into plain text.
 */
export const findMentionAtPositions = (doc: ProseMirrorNode, name: string): number[] => {
  const pattern = new RegExp(`@${escapeRegExp(name)}(?![\\p{L}\\p{M}\\p{N}_])`, "gu");
  const positions: number[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    for (const match of node.text.matchAll(pattern)) positions.push(pos + (match.index ?? 0));
  });
  return positions;
};

/** True while `markdown` still holds `@name` as a whole name, so a tag only counts while its text is in the draft. */
export const hasMentionText = (markdown: string, name: string): boolean =>
  new RegExp(`@${escapeRegExp(name)}(?![\\p{L}\\p{M}\\p{N}_])`, "u").test(markdown);
