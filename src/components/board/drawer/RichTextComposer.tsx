"use client";
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { useSavedReplies } from "@/hooks/useSavedReplies";
import { inlineUploadService } from "@/services/inline-upload.service";
import { createSuggestionStore } from "../doc/editor/suggestion-store";
import InsertLinkModal from "./InsertLinkModal";
import { MentionHighlight } from "./mentionHighlight";
import { buildRichTextBlockExtensions } from "./richTextBlocks";
import { RichTextSlashCommand } from "./richTextSlashCommand";
import { buildRichTextSlashItems, type RichTextSlashContext, type RichTextSlashItem } from "./richTextSlashItems";
import RichTextSlashMenu from "./RichTextSlashMenu";
import RichTextToolbar from "./RichTextToolbar";
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
/** How far back from the caret the trigger regexes look. */
const TRIGGER_LOOKBEHIND = 60;

export type RichTextComposerRef = {
  /** Inserts raw text (an emoji) at the current cursor position. */
  insertText: (text: string) => void;
  /** Replaces an in-progress trailing `@partial` token with `@Full Name `, or appends it if there's none. */
  insertMentionText: (name: string) => void;
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
   * When set, plain Enter fires this instead of splitting a new paragraph.
   * Slack's own convention: Enter sends, Shift+Enter (or Alt+Enter) inserts
   * a line break instead. Suspended while the cursor sits inside a list
   * item, blockquote, or code block, where Enter keeps its native
   * block-continuation behavior so those stay usable.
   */
  onEnterSubmit?: () => void;
  /** When set, Escape fires this, `CommentEditForm`'s "Cancel". */
  onEscape?: () => void;
  /** Fired as the caret moves or the text changes, with the `/command` or `#item` being typed there, or null when there is none. */
  onTriggerChange?: (trigger: ComposerTrigger | null) => void;
  /**
   * Offered every key press first, so a suggestion menu can claim the arrows,
   * Enter, Tab and Escape while it is open. Return true when the key was
   * handled, and the editor then ignores it.
   */
  onSuggestionKeyDown?: (event: KeyboardEvent) => boolean;
  autoFocus?: boolean;
  /** True when rendered inside `CommentComposer`'s own unified Slack-style box, drops this component's own border/padding/rounding so it reads as one continuous container with that parent's action row, and hides the toolbar entirely (the parent renders it via `show_toolbar`). Defaults to false for standalone use (`CommentEditForm`), which keeps its own self-contained bordered box. */
  embedded?: boolean;
  /** Embedded mode only: whether the formatting toolbar row is shown, driven by `CommentComposer`'s "Aa" toggle. */
  show_toolbar?: boolean;
  /** The parent shows the `@mention` picker, so the "/" menu offers "Mention a person". */
  can_mention?: boolean;
  /** The parent shows the `#` item picker, so the "/" menu offers "Link an item". */
  can_link_items?: boolean;
  /** Opens the parent's emoji palette, the "/" menu's "Emoji" row. Omit to leave the row out. */
  onOpenEmojiPalette?: () => void;
  /** Opens the parent's file attach dialog, the "/" menu's "File" row. Omit to leave the row out. */
  onAttachFiles?: () => void;
};

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

/** Deletes the `#query` in front of the caret, leaving the caret where it started. */
const deleteTriggerText = (current_editor: Editor): void => {
  const match = findTriggerMatch(current_editor);
  if (!match) return;
  const { from } = current_editor.state.selection;
  current_editor.chain().focus().deleteRange({ from: from - match.text.length, to: from }).run();
};

/** Blocks where Enter keeps its editing meaning (a new item, line or cell) instead of sending the draft. */
const MULTILINE_BLOCKS = ["bulletList", "orderedList", "taskList", "blockquote", "codeBlock", "callout", "details", "table"];

/**
 * Tiptap-backed rich text editor used by `CommentComposer` in place of a
 * plain `<textarea>`, with Slack's formatting row (`RichTextToolbar`: undo
 * and redo, the doc's title dropdown, bold, italic, underline, strikethrough,
 * links, lists, quotes and code), plus uploading a pasted/dropped image
 * straight into the body via `inlineUploadService`.
 * Typing "/" opens the block menu the doc editor has (`RichTextSlashMenu`):
 * titles, lists, to-dos, toggles, callouts, quotes, tables, dividers, code,
 * images, links, mentions, emoji, the date and the user's saved replies.
 * `@mention` autocomplete and emoji insertion stay owned by the parent
 * drawer hook (`mention_target`/`emoji_palette_target`), which drives this
 * component purely through the imperative ref: picking a mention or emoji
 * calls {@link RichTextComposerRef.insertMentionText}/`insertText` here
 * rather than mutating the HTML string directly, since only the live editor
 * instance knows where the cursor actually is. The `MentionHighlight`
 * extension colors any `@Full Name` run blue as it's typed, independent of
 * that autocomplete flow, so a mention still highlights even when pasted or
 * typed out by hand instead of picked from `MentionPicker`.
 */
const RichTextComposer = forwardRef<RichTextComposerRef, RichTextComposerProps>(
  (
    {
      value,
      onChange,
      onPlainTextChange,
      placeholder,
      min_height_class = "min-h-16",
      onEnterSubmit,
      onEscape,
      onTriggerChange,
      onSuggestionKeyDown,
      autoFocus,
      embedded = false,
      show_toolbar = true,
      can_mention = false,
      can_link_items = false,
      onOpenEmojiPalette,
      onAttachFiles,
    },
    ref
  ) => {
    // Read through refs, so the editor (created once) always calls the parent's latest callbacks.
    const trigger_change_ref = useRef(onTriggerChange);
    const suggestion_key_down_ref = useRef(onSuggestionKeyDown);
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
      suggestion_key_down_ref.current = onSuggestionKeyDown;
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

    const editor = useEditor({
      extensions: [
        // StarterKit v3 already bundles `link`, so it's configured here instead of registering `Link` separately.
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4] },
          link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } },
        }),
        ...buildRichTextBlockExtensions(),
        TiptapImage,
        Placeholder.configure({
          includeChildren: true,
          placeholder: ({ node }) => (node.type.name === "detailsSummary" ? "Toggle title" : placeholder),
        }),
        MentionHighlight,
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
        onChange(current_editor.getMarkdown());
        onPlainTextChange?.(current_editor.getText());
        trigger_change_ref.current?.(detectTrigger(current_editor));
      },
      onSelectionUpdate: ({ editor: current_editor }) => {
        trigger_change_ref.current?.(detectTrigger(current_editor));
      },
      onBlur: () => trigger_change_ref.current?.(null),
      editorProps: {
        attributes: {
          class: `shell-rich-text-editor ${min_height_class} w-full`,
        },
        handleKeyDown: (_view, event) => {
          if (suggestion_key_down_ref.current?.(event)) {
            event.preventDefault();
            return true;
          }
          // The "/" menu's own plugin handles the arrows, Enter, Tab and Escape
          // while it is open. Enter with no matching row still sends.
          const slash_state = slash_store.getState();
          if (slash_state.is_open && (event.key !== "Enter" || slash_state.items.length > 0)) return false;
          // Ctrl/Cmd+K opens the link dialog, the shortcut every other editor uses for it.
          if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "k") {
            event.preventDefault();
            open_link_modal_ref.current();
            return true;
          }
          if (event.key !== "Enter") {
            if (event.key === "Escape" && onEscape) {
              event.preventDefault();
              onEscape();
              return true;
            }
            return false;
          }
          // Slack's own line-break chord, honored on both Windows and macOS
          // (Alt on Windows, Option on Mac, both surface as `event.altKey`).
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
          if (!onEnterSubmit) return false;
          if (MULTILINE_BLOCKS.some((block) => editor?.isActive(block))) return false;
          event.preventDefault();
          onEnterSubmit();
          // Blurs so the post-submit external reset (parent clearing `value`
          // back to "") is picked up by the sync effect below, which only
          // applies while unfocused, the same way a mouse click on the send
          // button already blurs before that reset arrives.
          editor?.commands.blur();
          return true;
        },
        handlePaste: (_view, event) => {
          const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith("image/"));
          if (files.length === 0) return false;
          event.preventDefault();
          files.forEach((file) => void uploadAndInsert(file));
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
    // a live keystroke can never be clobbered by a stale `value` prop.
    useEffect(() => {
      if (!editor || editor.isFocused) return;
      if (value === editor.getMarkdown()) return;
      editor.commands.setContent(value || "", { contentType: "markdown", emitUpdate: false });
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
          const { from } = editor.state.selection;
          const text_before = editor.state.doc.textBetween(Math.max(0, from - 60), from, "\n", "\n");
          const match = /@(\w*)$/.exec(text_before);
          if (match) {
            const start = from - match[0].length;
            editor.chain().focus().insertContentAt({ from: start, to: from }, `@${name} `).run();
          } else {
            editor.chain().focus().insertContent(`@${name} `).run();
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

    const overlays = (
      <>
        {link_modal}
        {image_input}
        <RichTextSlashMenu editor={editor} store={slash_store} />
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
