"use client";
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { useSavedReplies } from "@/hooks/useSavedReplies";
import { isSubmitShortcut } from "@/lib/keyboard";
import { inlineUploadService } from "@/services/inline-upload.service";
import { SafeHistory } from "../doc/editor/extensions/safe-history";
import { createSuggestionStore } from "../doc/editor/suggestion-store";
import InsertLinkModal from "./InsertLinkModal";
import { getPastedMarkdown } from "./markdown/markdownPaste";
import { findNamedMentions, MentionHighlight, refreshMentionHighlight } from "./mentionHighlight";
import { EVERYONE_MENTION_NAME } from "./mentionOptions";
import {
  getUnresolvedMentions,
  PASTED_MENTIONS_META,
  PastedMentions,
  removeUnresolvedMentions,
  type UnresolvedMention,
} from "./pastedMentions";
import UnresolvedMentionPopover from "./UnresolvedMentionPopover";
import { buildRichTextBlockExtensions } from "./richTextBlocks";
import { RichTextSlashCommand } from "./richTextSlashCommand";
import { buildRichTextSlashItems, type RichTextSlashContext, type RichTextSlashItem } from "./richTextSlashItems";
import RichTextSlashMenu from "./RichTextSlashMenu";
import RichTextToolbar from "./RichTextToolbar";
import type { BoardPersonOption } from "../toolbar/types";
import "./rich-text.css";
import "./markdown/rich-text-markdown.scss";

/**
 * A `#item` being typed right before the caret, reported so the parent can
 * show its "Link an item" menu. The "/" block menu is the composer's own
 * (`RichTextSlashMenu`), so it is never reported.
 */
export type ComposerTrigger = { kind: "reference"; query: string };

/** Matches a `#query` at the caret, only when it opens a word, so URL fragments never trigger it. */
const REFERENCE_TRIGGER = /(?:^|\s)#([^\s#]*)$/;
/**
 * The `@partial` mention being typed right before the caret, accented names
 * included (`@José`), with an optional second word so a surname being typed
 * (`@Amanda Car`, or a typo like `@Amanda Carterr`) keeps the picker open,
 * the way Slack's mention list does.
 */
const MENTION_AT_CARET = /@((?:[\p{L}\p{M}\p{N}_]+(?: [\p{L}\p{M}\p{N}_]*)?)?)$/u;
/**
 * Same, but only when the `@` opens a word, so typing an email address never
 * opens the people picker. Zero width spaces and opening brackets or quotes
 * count as a word start too, text pasted from Slack often ends in one.
 */
const MENTION_QUERY_AT_CARET = /(?:^|[\s\u200B\u2060\uFEFF([{"'\u201C\u2018])@((?:[\p{L}\p{M}\p{N}_]+(?: [\p{L}\p{M}\p{N}_]*)?)?)$/u;
/** How far back from the caret the trigger regexes look. */
const TRIGGER_LOOKBEHIND = 60;

export type RichTextComposerRef = {
  /** Inserts raw text (an emoji) at the current cursor position. */
  insertText: (text: string) => void;
  /** Replaces an in-progress trailing `@partial` token with `@Full Name `, or appends it if there's none. */
  insertMentionText: (name: string) => void;
  /**
   * Puts the caret at the end of the draft and adds `@Full Name ` there, for
   * replying to someone inside a thread. Only focuses when the draft already
   * mentions them.
   */
  mentionAtEnd: (name: string) => void;
  /**
   * Types an `@` at the caret, with a space in front when it would otherwise
   * stick to a word, so the people picker opens just as if it was typed. Does
   * nothing but focus when the caret already sits in an `@query`.
   */
  startMention: () => void;
  /**
   * Screen rectangle of the `@` (or `#`) that opens the word in front of the
   * caret, or of the caret itself when there is none, so the mention and item
   * pickers open right under what is being typed instead of over it.
   */
  getTriggerAnchorRect: (trigger_char: "@" | "#") => DOMRect | null;
  /** Inserts Markdown (a saved reply) at the cursor, as formatted content rather than literal text. */
  insertMarkdown: (markdown: string) => void;
  /** Adds Markdown as its own block after everything already typed, leaving the caret on a fresh line below it, for quoting a comment into a draft. */
  appendMarkdownBlock: (markdown: string) => void;
  /** Replaces the `#query` being typed with a link to another item, shown as `#Name`. */
  insertItemReference: (name: string, href: string) => void;
  focus: () => void;
  isEmpty: () => boolean;
};

export type RichTextComposerProps = {
  /** The body as Markdown, only pushed into the live editor when it differs and the editor isn't focused, so external resets (clearing after submit) never fight the user's own typing. */
  value: string;
  onChange: (markdown: string) => void;
  /** Plain-text mirror of every keystroke, for the parent's `@mention` trigger detection. */
  onPlainTextChange?: (text: string) => void;
  placeholder: string;
  min_height_class?: string;
  /**
   * When set, Command + Enter (macOS) or Control + Enter fires this, the only
   * keyboard way to send. Plain Enter never sends: it starts a new line (or a
   * new list item, quote line, table cell...) like any text editor, so a draft
   * can't be posted by accident. Shift + Enter and Option/Alt + Enter add a
   * line break inside the same paragraph.
   */
  onSubmitShortcut?: () => void;
  /** When set, Escape fires this, `CommentEditForm`'s "Cancel". */
  onEscape?: () => void;
  /** Fired as the caret moves or the text changes, with the `/command` or `#item` being typed there, or null when there is none. */
  onTriggerChange?: (trigger: ComposerTrigger | null) => void;
  /**
   * Fired as the caret moves or the text changes, with the `@query` typed right
   * before the caret ("" for a bare `@`), or null when the caret is not in one.
   * Unlike matching the end of the Markdown body, this also works in the middle
   * of the text, which is where the caret usually is while editing an update.
   */
  onMentionQueryChange?: (query: string | null) => void;
  /**
   * Offered every key press first, so a suggestion menu can claim the arrows,
   * Enter, Tab and Escape while it is open. Return true when the key was
   * handled, and the editor then ignores it.
   */
  onSuggestionKeyDown?: (event: KeyboardEvent) => boolean;
  autoFocus?: boolean;
  /** True when rendered inside `CommentComposer`'s own unified Slack-style box, drops this component's own border/padding/rounding so it reads as one continuous container with that parent's action row, and hides the toolbar entirely (the parent renders it via `show_toolbar`). Both `CommentComposer` and `CommentEditForm` use it. Defaults to false for standalone use, which keeps its own self-contained bordered box. */
  embedded?: boolean;
  /** Embedded mode only: whether the formatting toolbar row is shown, driven by the parent's "Aa" toggle. */
  show_toolbar?: boolean;
  /** The parent shows the `@mention` picker, so the "/" menu offers "Mention a person". */
  can_mention?: boolean;
  /** The parent shows the `#` item picker, so the "/" menu offers "Link an item". */
  can_link_items?: boolean;
  /** Opens the parent's emoji palette, the "/" menu's "Emoji" row. Omit to leave the row out. */
  onOpenEmojiPalette?: () => void;
  /** Opens the parent's file attach dialog, the "/" menu's "File" row. Omit to leave the row out. */
  onAttachFiles?: () => void;
  /**
   * Who can be mentioned, the same roster the `@` picker offers. An exact
   * `@Full Name` of one of them is a mention: it is colored blue and reported
   * through `onTagMentions`, whether it was picked, pasted (Slack style, see
   * `PastedMentions`) or typed out. Anything else after an `@` is plain text.
   */
  mention_people?: BoardPersonOption[];
  /** Called with people whose exact `@Full Name` just appeared in the text, so the parent adds them to the draft's mentions. */
  onTagMentions?: (people: BoardPersonOption[]) => void;
  /** Workspace members left out of a private board: a pasted `@Name` of theirs is flagged "not on this board". */
  outside_people?: BoardPersonOption[];
  /** Opens the board's invite dialog, offered for a pasted `@Name` of someone not on this private board. */
  onInviteToBoard?: () => void;
};

/** A flagged pasted `@name` the caret sits in, with its place in the document, for the fix popover. */
type ActiveFlag = UnresolvedMention & { from: number; to: number };

/** The flagged pasted `@name` holding the caret, while the editor has focus. */
const findActiveFlag = (current_editor: Editor): ActiveFlag | null => {
  if (!current_editor.isFocused) return null;
  const { from, to } = current_editor.state.selection;
  return getUnresolvedMentions(current_editor.state).find((flag) => from >= flag.from && to <= flag.to) ?? null;
};

const NO_PEOPLE: BoardPersonOption[] = [];

/** The text run from the caret back to the start of its `#` word, or null when the caret is not in one. */
const findTriggerMatch = (current_editor: Editor): { trigger: ComposerTrigger; text: string } | null => {
  const { from, empty } = current_editor.state.selection;
  if (!empty) return null;

  const text_before = current_editor.state.doc.textBetween(Math.max(0, from - TRIGGER_LOOKBEHIND), from, "\n", "\n");
  const reference = REFERENCE_TRIGGER.exec(text_before);
  if (reference) return { trigger: { kind: "reference", query: reference[1] }, text: reference[0].trimStart() };
  return null;
};

const detectTrigger = (current_editor: Editor): ComposerTrigger | null => findTriggerMatch(current_editor)?.trigger ?? null;

/**
 * The `@query` right before the caret, or null when the caret is not in one
 * (or a range is selected). Also null once the text is already the exact
 * name of someone in `names`, a finished mention needs no list.
 */
const detectMentionQuery = (current_editor: Editor, names: readonly string[] = []): string | null => {
  const { from, empty } = current_editor.state.selection;
  if (!empty) return null;
  // Inside a flagged pasted `@name` its own fix popover is the menu, the people picker would cover it.
  if (getUnresolvedMentions(current_editor.state).some((flag) => from >= flag.from && from <= flag.to)) return null;
  const text_before = current_editor.state.doc.textBetween(Math.max(0, from - TRIGGER_LOOKBEHIND), from, "\n", "\n");
  const match = MENTION_QUERY_AT_CARET.exec(text_before);
  if (!match) return null;
  const typed = `@${match[1]}`;
  if (findNamedMentions(typed, names).some((mention) => mention.start === 0 && mention.end === typed.length)) return null;
  return match[1];
};

/** Deletes the `#query` in front of the caret, leaving the caret where it started. */
const deleteTriggerText = (current_editor: Editor): void => {
  const match = findTriggerMatch(current_editor);
  if (!match) return;
  const { from } = current_editor.state.selection;
  current_editor.chain().focus().deleteRange({ from: from - match.text.length, to: from }).run();
};

/**
 * Tiptap-backed rich text editor used by `CommentComposer` in place of a
 * plain `<textarea>`, with Slack's formatting row (`RichTextToolbar`: undo
 * and redo, the doc's title dropdown, bold, italic, underline, strikethrough,
 * links, lists, quotes and code), plus uploading a pasted/dropped image
 * straight into the body via `inlineUploadService`. Pasted Markdown text is
 * converted into formatting (see `getPastedMarkdown`), Shift + paste keeps it literal.
 * Typing "/" opens the block menu the doc editor has (`RichTextSlashMenu`):
 * titles, lists, to-dos, toggles, callouts, quotes, tables, dividers, code,
 * images, links, mentions, emoji, the date and the user's saved replies.
 * `@mention` autocomplete and emoji insertion stay owned by the parent
 * drawer hook (`mention_target`/`emoji_palette_target`), which drives this
 * component purely through the imperative ref: picking a mention or emoji
 * calls {@link RichTextComposerRef.insertMentionText}/`insertText` here
 * rather than mutating the HTML string directly, since only the live editor
 * instance knows where the cursor actually is. The `MentionHighlight`
 * extension colors a mention blue only while it is the exact `@Full Name` of
 * someone on the board (or a group picked from the list), which is also
 * exactly when it tags them: picked, pasted or typed out by hand alike, it is
 * reported through `onTagMentions`, and editing the name back into anything
 * else (`@Amanda Carterss`) turns it into plain text that tags nobody.
 */
const RichTextComposer = forwardRef<RichTextComposerRef, RichTextComposerProps>(
  (
    {
      value,
      onChange,
      onPlainTextChange,
      placeholder,
      min_height_class = "min-h-16",
      onSubmitShortcut,
      onEscape,
      onTriggerChange,
      onMentionQueryChange,
      onSuggestionKeyDown,
      autoFocus,
      embedded = false,
      show_toolbar = true,
      can_mention = false,
      can_link_items = false,
      onOpenEmojiPalette,
      onAttachFiles,
      mention_people = NO_PEOPLE,
      onTagMentions,
      outside_people = NO_PEOPLE,
      onInviteToBoard,
    },
    ref
  ) => {
    // Read through refs, so the editor (created once) always calls the parent's latest callbacks.
    const trigger_change_ref = useRef(onTriggerChange);
    const mention_query_change_ref = useRef(onMentionQueryChange);
    const suggestion_key_down_ref = useRef(onSuggestionKeyDown);
    const submit_shortcut_ref = useRef(onSubmitShortcut);
    const escape_ref = useRef(onEscape);
    const mention_people_ref = useRef(mention_people);
    const tag_mentions_ref = useRef(onTagMentions);
    // Group names picked from the `@` list (Everyone, a team), colored like a person once inserted.
    const group_names_ref = useRef(new Set<string>([EVERYONE_MENTION_NAME]));
    // Names the highlighter colors: the roster plus the groups picked so far.
    const getMentionNames = () => [...mention_people_ref.current.map((person) => person.name), ...group_names_ref.current];
    // People whose exact `@Full Name` was in the text after the last edit, so only new ones are reported.
    const tagged_ids_ref = useRef(new Set<string>());
    const outside_people_ref = useRef(outside_people);
    // The flagged pasted `@name` under the caret, and the one Escape hid until the caret leaves it.
    const [active_flag, setActiveFlag] = useState<ActiveFlag | null>(null);
    const [hidden_flag_id, setHiddenFlagId] = useState<string | null>(null);
    const syncActiveFlag = (current_editor: Editor) => {
      const next = findActiveFlag(current_editor);
      setActiveFlag((current) =>
        current?.id === next?.id && current?.from === next?.from && current?.to === next?.to ? current : next
      );
      if (!next) setHiddenFlagId(null);
    };
    const sync_active_flag_ref = useRef(syncActiveFlag);
    sync_active_flag_ref.current = syncActiveFlag;
    const active_flag_ref = useRef<ActiveFlag | null>(null);
    active_flag_ref.current = active_flag && active_flag.id !== hidden_flag_id ? active_flag : null;
    // The latest `value` prop, read when the editor blurs, see `onBlur` below.
    const latest_value_ref = useRef(value);
    // Set once the editor exists, read by the Ctrl/Cmd+K handler the editor was created with.
    const open_link_modal_ref = useRef<() => void>(() => {});
    const image_input_ref = useRef<HTMLInputElement>(null);

    // The "/" menu: one store per editor bridges the Tiptap suggestion plugin to `RichTextSlashMenu`.
    const [slash_store] = useState(() => createSuggestionStore<RichTextSlashItem>());
    const { saved_replies, ensureLoaded: ensureSavedRepliesLoaded } = useSavedReplies();
    const slash_items_ref = useRef<(query: string) => RichTextSlashItem[]>(() => []);
    const slash_context_ref = useRef<Omit<RichTextSlashContext, "editor">>({
      openImagePicker: () => {},
      openLinkDialog: () => {},
    });

    useEffect(() => {
      trigger_change_ref.current = onTriggerChange;
      mention_query_change_ref.current = onMentionQueryChange;
      suggestion_key_down_ref.current = onSuggestionKeyDown;
      submit_shortcut_ref.current = onSubmitShortcut;
      escape_ref.current = onEscape;
      mention_people_ref.current = mention_people;
      tag_mentions_ref.current = onTagMentions;
      outside_people_ref.current = outside_people;
      slash_items_ref.current = (query: string) => {
        ensureSavedRepliesLoaded();
        const features = {
          mentions: can_mention,
          item_links: can_link_items,
          emoji: Boolean(onOpenEmojiPalette),
          files: Boolean(onAttachFiles),
        };
        return buildRichTextSlashItems(query, features, saved_replies);
      };
      slash_context_ref.current = {
        openImagePicker: () => image_input_ref.current?.click(),
        openLinkDialog: () => open_link_modal_ref.current(),
        openEmojiPalette: onOpenEmojiPalette,
        attachFiles: onAttachFiles,
      };
    });

    // Saved replies arrive after the menu first opens, so an open menu picks them up right away.
    useEffect(() => {
      const state = slash_store.getState();
      if (state.is_open) slash_store.setState({ items: slash_items_ref.current(state.query) });
    }, [saved_replies, slash_store]);

    /** Reports everyone whose exact `@Full Name` appeared in the text since the last edit, typed out by hand included. */
    const reportTypedMentions = (current_editor: Editor) => {
      const people = mention_people_ref.current;
      if (!tag_mentions_ref.current || people.length === 0) return;
      const text = current_editor.state.doc.textBetween(0, current_editor.state.doc.content.size, "\n", "\n");
      const present = new Map<string, BoardPersonOption>();
      for (const mention of findNamedMentions(text, getMentionNames())) {
        const person = people.find((candidate) => candidate.name === mention.name);
        if (person) present.set(person.id, person);
      }
      const added = [...present.values()].filter((person) => !tagged_ids_ref.current.has(person.id));
      tagged_ids_ref.current = new Set(present.keys());
      if (added.length > 0) tag_mentions_ref.current(added);
    };

    const editor = useEditor({
      extensions: [
        // StarterKit v3 already bundles `link`, so it's configured here instead of registering `Link` separately.
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4] },
          link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } },
        }),
        ...buildRichTextBlockExtensions(),
        TiptapImage,
        // Top level only: `includeChildren` maps old placeholder decorations
        // through every step, and undo can map them out of range ("Position -1
        // outside of fragment"). An empty toggle title gets its hint from CSS.
        Placeholder.configure({ placeholder }),
        SafeHistory,
        PastedMentions.configure({
          getPeople: () => (tag_mentions_ref.current ? mention_people_ref.current : NO_PEOPLE),
          getOutsidePeople: () => (tag_mentions_ref.current ? outside_people_ref.current : NO_PEOPLE),
          onMentions: (people) => tag_mentions_ref.current?.(people),
          // The editor's own transactions already keep the fix popover in step, see `onTransaction`.
          onUnresolvedChange: () => {},
        }),
        // After `PastedMentions`, whose flagged names it reads to leave them their own underline.
        MentionHighlight.configure({ getNames: () => getMentionNames() }),
        RichTextSlashCommand.configure({
          store: slash_store,
          getItems: (query) => slash_items_ref.current(query),
          onSelect: (item, range, current_editor) => {
            current_editor.chain().focus().deleteRange(range).run();
            item.run({ editor: current_editor, ...slash_context_ref.current });
          },
        }),
        Markdown,
      ],
      content: value || "",
      contentType: "markdown",
      immediatelyRender: false,
      autofocus: autoFocus ? "end" : false,
      onUpdate: ({ editor: current_editor }) => {
        reportTypedMentions(current_editor);
        onChange(current_editor.getMarkdown());
        onPlainTextChange?.(current_editor.getText());
        trigger_change_ref.current?.(detectTrigger(current_editor));
        mention_query_change_ref.current?.(detectMentionQuery(current_editor, getMentionNames()));
      },
      onTransaction: ({ editor: current_editor }) => sync_active_flag_ref.current(current_editor),
      onFocus: ({ editor: current_editor }) => sync_active_flag_ref.current(current_editor),
      onSelectionUpdate: ({ editor: current_editor }) => {
        trigger_change_ref.current?.(detectTrigger(current_editor));
        mention_query_change_ref.current?.(detectMentionQuery(current_editor, getMentionNames()));
      },
      onBlur: ({ editor: current_editor }) => {
        trigger_change_ref.current?.(null);
        setActiveFlag(null);
        // Sending with Cmd/Ctrl+Enter blurs through Tiptap's `blur()`, which only takes effect a frame later, so the
        // parent's reset to "" arrives while the editor still has focus and the sync effect skips it.
        // Applying a pending clear once the blur lands keeps the sent text from staying in the box.
        if (latest_value_ref.current === "" && !current_editor.isEmpty) {
          current_editor.commands.setContent("", { contentType: "markdown", emitUpdate: false });
        }
      },
      editorProps: {
        attributes: {
          class: `shell-rich-text-editor ${min_height_class} w-full`,
        },
        handleKeyDown: (_view, event) => {
          if (suggestion_key_down_ref.current?.(event)) {
            event.preventDefault();
            return true;
          }
          // The "/" menu's own plugin handles the arrows, Enter, Tab and Escape while it has rows to pick.
          const slash_state = slash_store.getState();
          if (slash_state.is_open && slash_state.items.length > 0) return false;
          // Ctrl/Cmd+K opens the link dialog, the shortcut every other editor uses for it.
          if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "k") {
            event.preventDefault();
            open_link_modal_ref.current();
            return true;
          }
          // Escape closes the fix popover of a flagged pasted name first, it comes back once the caret leaves and returns.
          if (event.key === "Escape" && active_flag_ref.current) {
            event.preventDefault();
            setHiddenFlagId(active_flag_ref.current.id);
            return true;
          }
          const handleEscape = escape_ref.current;
          if (event.key === "Escape" && handleEscape) {
            event.preventDefault();
            handleEscape();
            return true;
          }
          if (event.key !== "Enter") return false;
          // Command/Control + Enter sends from anywhere in the draft, lists, quotes and code included.
          // Handled here, ahead of the editor's own keymaps, where Mod-Enter would add a line break.
          if (isSubmitShortcut(event)) {
            event.preventDefault();
            const submitDraft = submit_shortcut_ref.current;
            if (!submitDraft) return true;
            submitDraft();
            // Blurs so the post-submit external reset (parent clearing `value`
            // back to "") is picked up by the sync effect below, which only
            // applies while unfocused, the same way a mouse click on the send
            // button already blurs before that reset arrives.
            editor?.commands.blur();
            return true;
          }
          if (event.metaKey || event.ctrlKey) return false;
          // Shift + Enter and Option/Alt + Enter (Alt on Windows, Option on Mac, both
          // surface as `event.altKey`) add a line break inside the same paragraph.
          if (event.altKey || event.shiftKey) {
            // A title holds one line, so a new line after it starts normal text below instead.
            if (editor?.isActive("heading")) {
              event.preventDefault();
              editor.chain().focus().splitBlock().run();
              return true;
            }
            if (event.altKey) {
              event.preventDefault();
              editor?.chain().focus().setHardBreak().run();
              return true;
            }
            return false; // Shift+Enter, let HardBreak's own "Shift-Enter" keymap handle it.
          }
          // Enter moves through a table like Tab, adding a row past the last
          // cell, since a Markdown table cell holds a single line.
          if (editor?.isActive("table")) {
            event.preventDefault();
            if (!editor.commands.goToNextCell()) editor.chain().addRowAfter().goToNextCell().run();
            return true;
          }
          // Plain Enter: the editor's own behavior, a new paragraph (or list item, quote line...). Never sends.
          return false;
        },
        handlePaste: (view, event) => {
          const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith("image/"));
          if (files.length > 0) {
            event.preventDefault();
            files.forEach((file) => void uploadAndInsert(file));
            return true;
          }
          // Pasted Markdown becomes formatting, except inside a code block (kept literal)
          // and on Shift + paste, the "paste as plain text" chord, which ProseMirror tracks.
          const is_plain_paste = (view as unknown as { input?: { shiftKey?: boolean } }).input?.shiftKey === true;
          if (!editor || is_plain_paste || editor.isActive("codeBlock")) return false;
          const markdown = getPastedMarkdown(event.clipboardData);
          if (markdown === null) return false;
          event.preventDefault();
          // Tagged, so `PastedMentions` reads `@Name` in it the same as in a regular paste.
          editor.chain().focus().insertContent(markdown, { contentType: "markdown" }).setMeta(PASTED_MENTIONS_META, true).run();
          return true;
        },
        handleDrop: (_view, event) => {
          const files = Array.from(event.dataTransfer?.files ?? []).filter((file) => file.type.startsWith("image/"));
          if (files.length === 0) return false;
          event.preventDefault();
          files.forEach((file) => void uploadAndInsert(file));
          return true;
        },
      },
    });

    // A roster that loads or changes after the text is in place (the feed loads it on focus) recolors the mentions.
    useEffect(() => {
      if (!editor || editor.isDestroyed) return;
      editor.view.dispatch(refreshMentionHighlight(editor.state.tr));
    }, [editor, mention_people]);

    const uploadAndInsert = async (file: File) => {
      try {
        const url = await inlineUploadService.uploadImage(file);
        editor?.chain().focus().setImage({ src: url }).run();
      } catch {
        // Upload failed silently, the draft stays usable, the image just doesn't appear.
      }
    };

    const [is_link_modal_open, setIsLinkModalOpen] = useState(false);
    const [link_initial_url, setLinkInitialUrl] = useState("");
    const [link_initial_text, setLinkInitialText] = useState("");
    const [is_editing_existing_link, setIsEditingExistingLink] = useState(false);

    // Mirrors an external reset (e.g. the composer clearing after a
    // successful submit) into the live document, skipped while focused so
    // a live keystroke can never be clobbered by a stale `value` prop. An
    // empty, focused box still takes a non empty value: that is a saved draft
    // restored after the box auto focused, with nothing typed to overwrite.
    useEffect(() => {
      latest_value_ref.current = value;
      if (!editor) return;
      const is_restoring_into_empty = editor.isEmpty && value.trim() !== "";
      if (editor.isFocused && !is_restoring_into_empty) return;
      if (value === editor.getMarkdown()) return;
      const was_focused = editor.isFocused;
      editor.commands.setContent(value || "", { contentType: "markdown", emitUpdate: false });
      // A draft restored into the box being typed in leaves the caret after it.
      if (was_focused) editor.commands.focus("end");
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, editor]);

    useImperativeHandle(
      ref,
      () => ({
        insertText: (text: string) => {
          editor?.chain().focus().insertContent(text).run();
        },
        insertMentionText: (name: string) => {
          if (!editor) return;
          if (!mention_people_ref.current.some((person) => person.name === name)) group_names_ref.current.add(name);
          const { from } = editor.state.selection;
          const text_before = editor.state.doc.textBetween(Math.max(0, from - TRIGGER_LOOKBEHIND), from, "\n", "\n");
          const match = MENTION_AT_CARET.exec(text_before);
          const start = match ? from - match[0].length : from;
          // A plain text node, so the mention never picks up the bold, link or code
          // run it was typed next to (pasted Slack text), which would hide it from the
          // highlighter and post it as a link. Typing after it starts plain too.
          editor
            .chain()
            .focus()
            .command(({ tr, state }) => {
              tr.replaceWith(start, from, state.schema.text(`@${name} `));
              tr.setStoredMarks([]);
              return true;
            })
            .run();
        },
        mentionAtEnd: (name: string) => {
          if (!editor) return;
          if (!mention_people_ref.current.some((person) => person.name === name)) group_names_ref.current.add(name);
          const text = editor.getText();
          if (text.includes(`@${name}`)) {
            editor.commands.focus("end");
            return;
          }
          const separator = text.length > 0 && !/\s$/.test(text) ? " " : "";
          editor.chain().focus("end").insertContent(`${separator}@${name} `).run();
        },
        startMention: () => {
          if (!editor) return;
          if (detectMentionQuery(editor) !== null) {
            editor.commands.focus();
            return;
          }
          const { from } = editor.state.selection;
          const char_before = editor.state.doc.textBetween(Math.max(0, from - 1), from, "\n", "\n");
          const needs_space = char_before !== "" && !/\s/.test(char_before);
          editor.chain().focus().insertContent(needs_space ? " @" : "@").run();
        },
        getTriggerAnchorRect: (trigger_char: "@" | "#") => {
          if (!editor || editor.isDestroyed) return null;
          const { from } = editor.state.selection;
          const text_before = editor.state.doc.textBetween(Math.max(0, from - TRIGGER_LOOKBEHIND), from, "\n", "\n");
          const match = (trigger_char === "@" ? MENTION_AT_CARET : REFERENCE_TRIGGER).exec(text_before);
          // Measured from the trigger character itself, so a leading space caught by the `#` pattern is skipped.
          const anchor_pos = match ? from - (match[0].length - match[0].indexOf(trigger_char)) : from;
          try {
            const coords = editor.view.coordsAtPos(anchor_pos);
            // The trigger character's own width, so the picker's arrow points at its middle.
            let width = 0;
            if (match && anchor_pos < from) {
              const after = editor.view.coordsAtPos(anchor_pos + 1);
              if (after.top === coords.top && after.left > coords.left) width = after.left - coords.left;
            }
            return new DOMRect(coords.left, coords.top, width, coords.bottom - coords.top);
          } catch {
            // The position fell outside the document mid update, the picker keeps its last spot.
            return null;
          }
        },
        insertMarkdown: (markdown: string) => {
          editor?.chain().focus().insertContent(markdown, { contentType: "markdown" }).run();
        },
        appendMarkdownBlock: (markdown: string) => {
          if (!editor) return;
          const blocks = editor.markdown?.parse(markdown).content ?? [];
          const content = [...blocks, { type: "paragraph" }];
          // An empty draft is replaced rather than left with a blank line above the quote.
          if (editor.isEmpty) editor.chain().setContent(content).focus("end").run();
          else editor.chain().focus("end").insertContent(content).run();
        },
        insertItemReference: (name: string, href: string) => {
          if (!editor) return;
          deleteTriggerText(editor);
          editor
            .chain()
            .focus()
            .insertContent([
              { type: "text", text: `#${name}`, marks: [{ type: "link", attrs: { href } }] },
              { type: "text", text: " " },
            ])
            .run();
        },
        focus: () => editor?.commands.focus("end"),
        isEmpty: () => !editor || editor.isEmpty,
      }),
      [editor]
    );

    if (!editor) return null;

    // Opens `InsertLinkModal` prefilled from whatever's under the cursor: the
    // selected text (as the label) and, when the cursor already sits inside
    // an existing link, that link's own href/label (re-selecting its full
    // range first, via `extendMarkRange`, so an empty-selection click inside
    // a link still edits the *whole* link instead of just where the caret
    // happened to land).
    const openLinkModal = () => {
      const is_in_link = editor.isActive("link");
      if (is_in_link) editor.chain().focus().extendMarkRange("link").run();
      const { from, to, empty } = editor.state.selection;
      const selected_text = empty ? "" : editor.state.doc.textBetween(from, to, " ");
      const href = editor.getAttributes("link").href;
      setLinkInitialText(selected_text);
      setLinkInitialUrl(typeof href === "string" ? href : "");
      setIsEditingExistingLink(is_in_link);
      setIsLinkModalOpen(true);
    };

    // Replaces whatever's currently selected (the same range `openLinkModal`
    // prefilled from) with a single text node carrying the link mark, so
    // editing an existing link's label/URL replaces it in place rather than
    // leaving the old text next to a second, newly-inserted link.
    const handleInsertLink = (url: string, text: string) => {
      const label = text || url;
      const { from, to, empty } = editor.state.selection;
      const chain = editor.chain().focus();
      if (!empty) chain.deleteRange({ from, to });
      chain.insertContent({ type: "text", text: label, marks: [{ type: "link", attrs: { href: url } }] }).run();
      setIsLinkModalOpen(false);
    };

    const handleRemoveLink = () => {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setIsLinkModalOpen(false);
    };

    open_link_modal_ref.current = openLinkModal;

    const toolbar = <RichTextToolbar editor={editor} onOpenLink={openLinkModal} />;

    const link_modal = (
      <InsertLinkModal
        is_open={is_link_modal_open}
        initial_url={link_initial_url}
        initial_text={link_initial_text}
        is_editing_existing={is_editing_existing_link}
        onInsert={handleInsertLink}
        onRemove={handleRemoveLink}
        onClose={() => setIsLinkModalOpen(false)}
      />
    );

    // The "/" menu's "Image" row: picks images from the computer and uploads them like a paste.
    const image_input = (
      <input
        ref={image_input_ref}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          Array.from(event.target.files ?? []).forEach((file) => void uploadAndInsert(file));
          event.target.value = "";
        }}
      />
    );

    // Fixes offered by the popover under a flagged pasted `@name`.
    const resolveFlag = (flag: ActiveFlag, person: BoardPersonOption) => {
      editor
        .chain()
        .focus()
        .command(({ tr, state }) => {
          tr.replaceWith(flag.from, flag.to, state.schema.text(`@${person.name}`));
          removeUnresolvedMentions(tr, [flag.id]);
          // The caret lands right after the fixed mention, so the popover closes.
          tr.setSelection(TextSelection.create(tr.doc, Math.min(tr.doc.content.size, flag.from + person.name.length + 1)));
          tr.setStoredMarks([]);
          return true;
        })
        .run();
      tag_mentions_ref.current?.([person]);
    };
    // "Send as plain text": the flag goes and so does the `@`, any other `@name` nobody has is flagged yellow anyway.
    const dismissFlag = (flag: ActiveFlag, remove_at: boolean) => {
      editor
        .chain()
        .focus()
        .command(({ tr }) => {
          removeUnresolvedMentions(tr, [flag.id]);
          if (remove_at && flag.text.startsWith("@")) tr.delete(flag.from, flag.from + 1);
          return true;
        })
        .run();
    };
    const shown_flag = active_flag && active_flag.id !== hidden_flag_id ? active_flag : null;

    const overlays = (
      <>
        {link_modal}
        {image_input}
        <RichTextSlashMenu editor={editor} store={slash_store} />
        {shown_flag && (
          <UnresolvedMentionPopover
            mention={shown_flag}
            board_people={mention_people}
            getAnchorRect={() => {
              if (editor.isDestroyed) return null;
              try {
                const start = editor.view.coordsAtPos(shown_flag.from);
                return new DOMRect(start.left, start.top, 0, start.bottom - start.top);
              } catch {
                return null;
              }
            }}
            onResolve={(person) => resolveFlag(shown_flag, person)}
            onSendAsText={() => dismissFlag(shown_flag, true)}
            onInviteClick={onInviteToBoard}
          />
        )}
      </>
    );

    if (embedded) {
      return (
        <div>
          {show_toolbar && toolbar}
          <EditorContent editor={editor} />
          {overlays}
        </div>
      );
    }

    return (
      <div className="rich-text-box">
        {toolbar}
        <EditorContent editor={editor} />
        {overlays}
      </div>
    );
  }
);

RichTextComposer.displayName = "RichTextComposer";

export default RichTextComposer;
