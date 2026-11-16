import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { BoardPersonOption } from "../toolbar/types";
import { allowedEdits, editDistance } from "./fuzzyNames";

export { editDistance };

/**
 * Slack style tagging for pasted text. Every `@Name` that text pasted into a
 * composer brings in is read against the board's people:
 *
 * - a name that matches someone becomes a real mention, written out as
 *   `@Full Name` (the form the picker inserts and the highlighter colors) and
 *   reported so the composer adds that person to the draft's
 *   `mentioned_user_ids`. Text pasted from Slack usually carries the mention
 *   as a link, bold or code run, so the rewritten mention drops that
 *   formatting, which would otherwise hide it from the highlighter;
 * - a name that matches nobody, several people, or someone in the workspace
 *   who was not added to the board stays as typed, gets a dashed underline in
 *   the editor and is reported as an {@link UnresolvedMention}, so the
 *   composer can show Slack's "only visible to you" style notice with a
 *   "Did you mean" fix, the way Slack warns about mentioning someone who is
 *   not in the channel.
 */

/** One `@Name` found in a run of text, with the person it names. */
export type TextMention = {
  person: BoardPersonOption;
  /** Index of the `@` in the text. */
  start: number;
  /** Index right after the last character of the matched name. */
  end: number;
};

/** Why a pasted `@Name` could not become a mention. */
export type UnresolvedMentionIssue =
  /** Nobody on the board has this name, `suggestions` are the closest names (typos, a missing letter). */
  | { kind: "unknown"; suggestions: BoardPersonOption[] }
  /** More than one person on the board has this first name, `suggestions` are all of them. */
  | { kind: "ambiguous"; suggestions: BoardPersonOption[] }
  /** Someone in the workspace who was not added to this private board, so they cannot be tagged or notified. */
  | { kind: "outside"; person: BoardPersonOption };

/** A pasted `@Name` in a run of text that did not become a mention. */
export type UnresolvedTextMention = {
  /** The text as pasted, `@` included. */
  text: string;
  start: number;
  end: number;
  issue: UnresolvedMentionIssue;
};

/** A pasted `@Name` still waiting in the editor, as the composer's notice shows it. */
export type UnresolvedMention = {
  id: string;
  text: string;
  issue: UnresolvedMentionIssue;
};

/** Characters a mention may follow: start of text, whitespace, zero width spaces Slack leaves behind, or an opening bracket or quote. */
const MENTION_BOUNDARY_BEFORE = /[\s​⁠﻿([{"'“‘]/;
/** A letter or digit, so `@Ana` never matches the start of `@Anabel`. */
const WORD_CHARACTER = /[\p{L}\p{M}\p{N}_]/u;
/** The single word right after an `@`, used to match a first name. */
const LEADING_WORD = /^[\p{L}\p{M}\p{N}_'-]+/u;
/** The word after the first one, separated by a single space, for two word names. */
const SECOND_WORD = /^ ([\p{L}\p{M}'-]+)/u;
/** Slack's own group mentions, never flagged: they have no person behind them. */
const SPECIAL_HANDLES = new Set(["channel", "here", "everyone"]);
/** How many "Did you mean" names a flagged mention offers. */
const MAX_SUGGESTIONS = 3;

/** Non breaking spaces (Slack and web pages paste them) compare as plain spaces, keeping every index in place. */
const normalizeSpaces = (text: string): string => text.replace(/[  ]/g, " ");

const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? "";

/**
 * The closest names to a word that matched nobody: a name it starts
 * (`@Kev` for Kevin), or a first or full name a few edits away (`@Kevn`,
 * `@Jhon Smith`). Best first, at most {@link MAX_SUGGESTIONS}.
 */
export const suggestPeople = (typed: string, people: BoardPersonOption[]): BoardPersonOption[] => {
  const needle = normalizeSpaces(typed).toLowerCase().trim();
  if (needle.length < 2) return [];
  const scored = people
    .map((person) => {
      const full = normalizeSpaces(person.name).toLowerCase();
      const first = firstName(full);
      const is_prefix = first.startsWith(needle) || full.startsWith(needle);
      const distance = Math.min(editDistance(needle, first), editDistance(needle, full));
      const score = is_prefix ? 0.5 : distance;
      return { person, score, fits: is_prefix || distance <= allowedEdits(needle.length) };
    })
    .filter((entry) => entry.fits)
    .sort((first, second) => first.score - second.score || first.person.name.localeCompare(second.person.name));
  return scored.slice(0, MAX_SUGGESTIONS).map((entry) => entry.person);
};

type ScanResult = { mentions: TextMention[]; unresolved: UnresolvedTextMention[] };

/**
 * Reads every `@Name` in `text`. Against `people` (the board), the longest
 * full name wins (`@Abby Allan` over a teammate called `Abby`), then a first
 * name only one person has (`@Kevin`), case insensitive both ways. What is
 * left is flagged: a two word name a typo away from someone (`@Kevin Smth`),
 * a first name several people share, someone from `outside_people` (the
 * workspace members a private board leaves out), or a name nobody has, with
 * the closest names as suggestions. An `@` inside an email address or a word
 * is never read as a mention, and Slack's `@channel`, `@here` and
 * `@everyone` are left alone.
 */
export const scanTextMentions = (
  text: string,
  people: BoardPersonOption[],
  outside_people: BoardPersonOption[] = []
): ScanResult => {
  const result: ScanResult = { mentions: [], unresolved: [] };
  const searchable = people.filter((person) => !person.is_deactivated && person.name.trim() !== "");
  const board_ids = new Set(searchable.map((person) => person.id));
  const outsiders = outside_people.filter(
    (person) => !person.is_deactivated && person.name.trim() !== "" && !board_ids.has(person.id)
  );
  if ((searchable.length === 0 && outsiders.length === 0) || !text.includes("@")) return result;

  const longestFirst = (list: BoardPersonOption[]) => [...list].sort((first, second) => second.name.length - first.name.length);
  const board_by_length = longestFirst(searchable);
  const outside_by_length = longestFirst(outsiders);
  const withFirstName = (list: BoardPersonOption[], word: string) =>
    list.filter((person) => firstName(person.name).toLowerCase() === word);

  const normalized = normalizeSpaces(text);
  const lowered = normalized.toLowerCase();
  // A few letters change length when lowercased, which would shift every index, so those texts compare as typed.
  const haystack = lowered.length === normalized.length ? lowered : normalized;
  let index = haystack.indexOf("@");

  while (index !== -1) {
    const char_before = index > 0 ? haystack[index - 1] : "";
    if (index !== 0 && !MENTION_BOUNDARY_BEFORE.test(char_before)) {
      index = haystack.indexOf("@", index + 1);
      continue;
    }

    const rest = haystack.slice(index + 1);
    const isWholeWord = (length: number) => !WORD_CHARACTER.test(rest.charAt(length));
    const fullNameIn = (list: BoardPersonOption[]) =>
      list.find((person) => {
        const name = normalizeSpaces(person.name).toLowerCase();
        return rest.startsWith(name) && isWholeWord(name.length);
      });
    const span = (length: number) => ({ start: index, end: index + 1 + length, text: text.slice(index, index + 1 + length) });

    const word = LEADING_WORD.exec(rest)?.[0].replace(/['-]+$/, "") ?? "";
    const second_word = SECOND_WORD.exec(rest.slice(word.length))?.[1] ?? "";
    const two_words = second_word ? `${word} ${second_word}` : "";

    let end: number | null = null;
    const board_full = fullNameIn(board_by_length);
    const outside_full = board_full ? undefined : fullNameIn(outside_by_length);
    const board_first = word ? withFirstName(searchable, word) : [];

    const is_flaggable = word !== "" && /^\p{L}/u.test(word) && !SPECIAL_HANDLES.has(word.toLowerCase());
    // A capitalized word right after (`@Kevin Brown`) reads as a surname, so a first name alone must not tag a different Kevin.
    const second_word_start = index + 1 + word.length + 1;
    const has_surname = second_word !== "" && /^\p{Lu}/u.test(normalized.slice(second_word_start, second_word_start + 1));
    // A two word name a typo or two from someone's full name (`@Abby Alan`, `@Kevin Smth`).
    const close_full_names =
      is_flaggable && second_word
        ? searchable.filter((person) => {
            // First name and surname each a typo or two away, judged on their own length, so `@Ernesto take` is no `Ernesto Afane`.
            const [person_first = "", person_second = ""] = normalizeSpaces(person.name).toLowerCase().split(/\s+/);
            if (!person_second || person_first.charAt(0) !== word.charAt(0)) return false;
            const second = second_word.toLowerCase();
            const first_distance = editDistance(word, person_first);
            const second_distance = editDistance(second, person_second);
            return (
              first_distance + second_distance > 0 &&
              first_distance <= allowedEdits(person_first.length) &&
              second_distance <= Math.max(1, allowedEdits(person_second.length) - 1) &&
              person_second.charAt(0) === second.charAt(0)
            );
          })
        : [];
    const outside_first = word ? withFirstName(outsiders, word) : [];
    const flag = (length: number, issue: UnresolvedMentionIssue) => {
      const flagged = span(length);
      result.unresolved.push({ ...flagged, issue });
      end = flagged.end;
    };

    if (board_full) {
      result.mentions.push({ person: board_full, ...span(board_full.name.length) });
      end = index + 1 + board_full.name.length;
    } else if (outside_full) {
      flag(outside_full.name.length, { kind: "outside", person: outside_full });
    } else if (close_full_names.length > 0) {
      const ranked = suggestPeople(two_words, close_full_names);
      flag(two_words.length, { kind: "unknown", suggestions: ranked.length > 0 ? ranked : close_full_names.slice(0, MAX_SUGGESTIONS) });
    } else if (is_flaggable && has_surname) {
      // A full name nobody on the board has: the people sharing its first name are the best guesses.
      const same_first = board_first.length > 0 ? board_first.slice(0, MAX_SUGGESTIONS) : suggestPeople(word, searchable);
      flag(two_words.length, { kind: "unknown", suggestions: same_first });
    } else if (board_first.length === 1) {
      result.mentions.push({ person: board_first[0], ...span(word.length) });
      end = index + 1 + word.length;
    } else if (board_first.length > 1) {
      flag(word.length, { kind: "ambiguous", suggestions: board_first });
    } else if (outside_first.length === 1) {
      flag(word.length, { kind: "outside", person: outside_first[0] });
    } else if (is_flaggable && word.length >= 2) {
      flag(word.length, { kind: "unknown", suggestions: suggestPeople(word, searchable) });
    }

    index = haystack.indexOf("@", end ?? index + 1);
  }

  return result;
};

/** Every `@Name` in `text` that names one of `people`, see {@link scanTextMentions}. */
export const findTextMentions = (text: string, people: BoardPersonOption[]): TextMention[] =>
  scanTextMentions(text, people).mentions;

// ── Editor extension ──────────────────────────────────────────────────────

/** Meta set on a transaction whose inserted text should be scanned for mentions, for pastes made through `insertContent`. */
export const PASTED_MENTIONS_META = "pastedMentions";

/** A flagged mention while it sits in the document. */
type TrackedMention = UnresolvedMention & { from: number; to: number };

type PluginMeta = { add?: TrackedMention[]; remove?: string[] };

const plugin_key = new PluginKey<TrackedMention[]>("pastedMentions");

/** The flagged pasted mentions in `state`, in document order. */
export const getUnresolvedMentions = (state: EditorState): TrackedMention[] => plugin_key.getState(state) ?? [];

/** True when `transaction` changed which pasted names are flagged, so other decorations can follow. */
export const changesPastedFlags = (transaction: Transaction): boolean => transaction.getMeta(plugin_key) !== undefined;

/** Marks the flagged mentions `ids` as handled, so they lose their underline and leave the notice. */
export const removeUnresolvedMentions = (transaction: Transaction, ids: string[]): Transaction =>
  transaction.setMeta(plugin_key, { remove: ids } satisfies PluginMeta);

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
type FlaggedRange = { from: number; to: number; text: string; issue: UnresolvedMentionIssue };

/**
 * The mentions inside `from`..`to`, one text block at a time, so a name split
 * across formatting runs (`@Abby` bold, ` Allan` plain) still matches. Code
 * blocks are skipped, their text is meant literally.
 */
const scanRange = (
  doc: ProseMirrorNode,
  from: number,
  to: number,
  people: BoardPersonOption[],
  outside_people: BoardPersonOption[]
): { rewrites: MentionRewrite[]; flagged: FlaggedRange[] } => {
  const rewrites: MentionRewrite[] = [];
  const flagged: FlaggedRange[] = [];
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

    // Only what the paste brought in, so names typed earlier in the draft are left alone.
    const toRange = (start: number, end: number) => ({ from: positions[start], to: positions[end - 1] + 1 });
    const isInside = (range: { from: number; to: number }) => range.to > from && range.from < to;

    const scan = scanTextMentions(text, people, outside_people);
    for (const mention of scan.mentions) {
      const range = toRange(mention.start, mention.end);
      if (isInside(range)) rewrites.push({ ...range, person: mention.person });
    }
    for (const unresolved of scan.unresolved) {
      const range = toRange(unresolved.start, unresolved.end);
      if (isInside(range)) flagged.push({ ...range, text: unresolved.text, issue: unresolved.issue });
    }
    return false;
  });
  return { rewrites, flagged };
};

const createMentionId = () => `pasted-${Math.random().toString(36).slice(2, 10)}`;

/** True while the flagged text is still exactly what was pasted, any edit to it means the writer took over. */
const isStillIntact = (doc: ProseMirrorNode, mention: TrackedMention): boolean =>
  mention.from < mention.to && mention.to <= doc.content.size && doc.textBetween(mention.from, mention.to, "\n", "￼") === mention.text;

export type PastedMentionsOptions = {
  /** The people a pasted `@Name` can tag, read on every paste so it always has the latest roster. */
  getPeople: () => BoardPersonOption[];
  /** Workspace members who are not on the board (a private board), flagged as "not on this board" instead of unknown. */
  getOutsidePeople: () => BoardPersonOption[];
  /** Called once per paste with everyone it tagged, in order, without repeats. */
  onMentions: (people: BoardPersonOption[]) => void;
  /** Called whenever the flagged mentions change: a paste adds some, fixing, keeping or editing one removes it. */
  onUnresolvedChange: (mentions: UnresolvedMention[]) => void;
};

/** Hover hint on a flagged pasted mention, the click opens the fix popover. */
const UNRESOLVED_TITLES: Record<UnresolvedMentionIssue["kind"], string> = {
  unknown: "Not found on this board. Click to fix",
  ambiguous: "More than one person has this name. Click to choose",
  outside: "Not on this private board. Click for options",
};

/** The CSS class of a flagged pasted mention in the editor, see `rich-text.css`. */
export const UNRESOLVED_MENTION_CLASS = "rich-text-mention-unresolved";

/**
 * Tiptap extension behind pasted mentions: after a paste (ProseMirror's own,
 * or a Markdown paste tagged with {@link PASTED_MENTIONS_META}), rewrites every
 * `@Name` the paste brought in that names someone to a plain `@Full Name` run
 * and reports who it tagged through `onMentions`. The rest is tracked, mapped
 * through every later edit, underlined, and reported through
 * `onUnresolvedChange` until it is fixed, kept as text or edited by hand.
 */
export const PastedMentions = Extension.create<PastedMentionsOptions>({
  name: "pastedMentions",

  addOptions() {
    return {
      getPeople: () => [],
      getOutsidePeople: () => [],
      onMentions: () => {},
      onUnresolvedChange: () => {},
    };
  },

  addProseMirrorPlugins() {
    const { getPeople, getOutsidePeople, onMentions, onUnresolvedChange } = this.options;
    return [
      new Plugin<TrackedMention[]>({
        key: plugin_key,
        state: {
          init: () => [],
          apply: (transaction, tracked, _old_state, new_state) => {
            const meta = transaction.getMeta(plugin_key) as PluginMeta | undefined;
            let next = tracked;
            if (transaction.docChanged && next.length > 0) {
              next = next
                .map((mention) => ({ ...mention, from: transaction.mapping.map(mention.from, 1), to: transaction.mapping.map(mention.to, -1) }))
                .filter((mention) => isStillIntact(new_state.doc, mention));
              if (next.length === tracked.length && next.every((mention, index) => mention.from === tracked[index].from && mention.to === tracked[index].to)) {
                next = tracked;
              }
            }
            if (meta?.remove?.length) next = next.filter((mention) => !meta.remove?.includes(mention.id));
            if (meta?.add?.length) next = [...next, ...meta.add].sort((first, second) => first.from - second.from);
            return next;
          },
        },
        props: {
          decorations: (state) => {
            const tracked = plugin_key.getState(state) ?? [];
            if (tracked.length === 0) return null;
            return DecorationSet.create(
              state.doc,
              tracked.map((mention) =>
                Decoration.inline(mention.from, mention.to, {
                  class: UNRESOLVED_MENTION_CLASS,
                  "data-unresolved-kind": mention.issue.kind,
                  title: UNRESOLVED_TITLES[mention.issue.kind],
                })
              )
            );
          },
        },
        view: () => ({
          update: (view, previous_state) => {
            const current = plugin_key.getState(view.state);
            if (current === plugin_key.getState(previous_state)) return;
            const list = (current ?? []).map(({ id, text, issue }) => ({ id, text, issue }));
            onUnresolvedChange(list);
          },
        }),
        appendTransaction: (transactions, _old_state, new_state) => {
          const paste = transactions.find(
            (transaction) =>
              transaction.docChanged &&
              (transaction.getMeta("uiEvent") === "paste" || transaction.getMeta(PASTED_MENTIONS_META) === true)
          );
          if (!paste) return null;
          const people = getPeople();
          const outside_people = getOutsidePeople();
          if (people.length === 0 && outside_people.length === 0) return null;

          // Mapped through any transaction that came after the paste in this same batch.
          const range = insertedRange(paste);
          if (!range) return null;
          let from = range.from;
          let to = range.to;
          for (const later of transactions.slice(transactions.indexOf(paste) + 1)) {
            from = later.mapping.map(from, -1);
            to = later.mapping.map(to, 1);
          }
          // One character back, so an `@` typed right before the pasted name still counts.
          from = Math.max(0, from - 1);
          to = Math.min(new_state.doc.content.size, to);

          const { rewrites, flagged } = scanRange(new_state.doc, from, to, people, outside_people);
          if (rewrites.length === 0 && flagged.length === 0) return null;

          const transaction = new_state.tr;
          // Last first, so earlier positions stay valid while later ones change length.
          for (const rewrite of [...rewrites].reverse()) {
            transaction.replaceWith(rewrite.from, rewrite.to, new_state.schema.text(`@${rewrite.person.name}`));
          }
          // Typing right after the paste starts plain, not inside the link or code the mention came in.
          if (rewrites.length > 0) transaction.setStoredMarks([]);

          // The flagged names keep their text, only the rewrites around them moved them.
          const add: TrackedMention[] = flagged.map((entry) => ({
            id: createMentionId(),
            text: entry.text,
            issue: entry.issue,
            from: transaction.mapping.map(entry.from, 1),
            to: transaction.mapping.map(entry.to, -1),
          }));
          if (add.length > 0) transaction.setMeta(plugin_key, { add } satisfies PluginMeta);

          const tagged: BoardPersonOption[] = [];
          for (const rewrite of rewrites) {
            if (!tagged.some((person) => person.id === rewrite.person.id)) tagged.push(rewrite.person);
          }
          // Reported after this update settles, so the parent's state change never lands mid transaction.
          if (tagged.length > 0) queueMicrotask(() => onMentions(tagged));
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
