"use client";
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import {
  BoldIcon,
  BulletListIcon,
  InlineCodeIcon,
  ItalicIcon,
  LinkFormatIcon,
  NumberedListIcon,
  QuoteIcon,
  StrikethroughIcon,
} from "@/icons/drawer-icons";
import { inlineUploadService } from "@/services/inline-upload.service";
import InsertLinkModal from "./InsertLinkModal";
import { MentionHighlight } from "./mentionHighlight";
import type { SlashCommandAction } from "./slashCommands";

/** A `/command` or `#item` being typed right before the caret, reported so the parent can show its suggestion menu. */
export type ComposerTrigger = { kind: "slash" | "reference"; query: string };

/** Matches a `/query` at the caret, only when it opens a word, so `https://` and file paths never trigger it. */
const SLASH_TRIGGER = /(?:^|\s)\/([\w-]*)$/;
/** Matches a `#query` at the caret, likewise only at the start of a word. */
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
  /** Replaces the `/query` being typed with the result of a slash command. The `emoji` command only clears the query, the parent opens its palette. */
  applySlashCommand: (action: SlashCommandAction) => void;
  /** Replaces the `#query` being typed with a link to another item, shown as `#Name`. */
  insertItemReference: (name: string, href: string) => void;
  focus: () => void;
  isEmpty: () => boolean;
};

export type RichTextComposerProps = {
  /** The body as Markdown — only pushed into the live editor when it differs and the editor isn't focused, so external resets (clearing after submit) never fight the user's own typing. */
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
  /** When set, Escape fires this — `CommentEditForm`'s "Cancel". */
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
  /** True when rendered inside `CommentComposer`'s own unified Slack-style box — drops this component's own border/padding/rounding so it reads as one continuous container with that parent's action row, and hides the toolbar entirely (the parent renders it via `show_toolbar`). Defaults to false for standalone use (`CommentEditForm`), which keeps its own self-contained bordered box. */
  embedded?: boolean;
  /** Embedded mode only: whether the formatting toolbar row is shown — driven by `CommentComposer`'s "Aa" toggle. */
  show_toolbar?: boolean;
};

/** The text run from the caret back to the start of its `/` or `#` word, or null when the caret is not in one. */
const findTriggerMatch = (current_editor: Editor): { trigger: ComposerTrigger; text: string } | null => {
  const { from, empty } = current_editor.state.selection;
  if (!empty) return null;

  const text_before = current_editor.state.doc.textBetween(Math.max(0, from - TRIGGER_LOOKBEHIND), from, "\n", "\n");
  const slash = SLASH_TRIGGER.exec(text_before);
  if (slash) return { trigger: { kind: "slash", query: slash[1] }, text: slash[0].trimStart() };
  const reference = REFERENCE_TRIGGER.exec(text_before);
  if (reference) return { trigger: { kind: "reference", query: reference[1] }, text: reference[0].trimStart() };
  return null;
};

const detectTrigger = (current_editor: Editor): ComposerTrigger | null => findTriggerMatch(current_editor)?.trigger ?? null;

/** Deletes the trigger text (`/query` or `#query`) in front of the caret, leaving the caret where it started. */
const deleteTriggerText = (current_editor: Editor): void => {
  const match = findTriggerMatch(current_editor);
  if (!match) return;
  const { from } = current_editor.state.selection;
  current_editor.chain().focus().deleteRange({ from: from - match.text.length, to: from }).run();
};

const ToolbarButton: React.FC<{ label: string; active?: boolean; onClick: () => void; children: React.ReactNode }> = ({
  label,
  active,
  onClick,
  children,
}) => (
  <button
    type="button"
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
      active ? "bg-shell-hover-strong text-shell-text" : "text-shell-text-muted hover:bg-shell-hover hover:text-shell-text"
    }`}
  >
    {children}
  </button>
);

const ToolbarDivider: React.FC = () => <span className="mx-1 h-4 w-px flex-none bg-shell-border-strong" />;

/**
 * Tiptap-backed rich text editor used by `CommentComposer` in place of a
 * plain `<textarea>` — bold/italic/lists/links, plus uploading a
 * pasted/dropped image straight into the body via `inlineUploadService`.
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
    },
    ref
  ) => {
    // Read through refs, so the editor (created once) always calls the parent's latest callbacks.
    const trigger_change_ref = useRef(onTriggerChange);
    const suggestion_key_down_ref = useRef(onSuggestionKeyDown);
    useEffect(() => {
      trigger_change_ref.current = onTriggerChange;
      suggestion_key_down_ref.current = onSuggestionKeyDown;
    });

    const editor = useEditor({
      extensions: [
        // StarterKit v3 already bundles `link`, so it's configured here instead of registering `Link` separately.
        StarterKit.configure({
          heading: false,
          link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } },
        }),
        TiptapImage,
        Placeholder.configure({ placeholder }),
        MentionHighlight,
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
          class: embedded
            ? `shell-rich-text-editor ${min_height_class} w-full resize-none bg-transparent px-[13px] py-[9px] font-sans text-[13.5px] leading-relaxed text-shell-text outline-none`
            : `shell-rich-text-editor ${min_height_class} w-full resize-none rounded-[11px] border border-shell-border-strong bg-shell-panel px-[13px] py-[9px] font-sans text-[13.5px] leading-relaxed text-shell-text outline-none transition-colors focus:border-[#00c875]`,
        },
        handleKeyDown: (_view, event) => {
          if (suggestion_key_down_ref.current?.(event)) {
            event.preventDefault();
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
            if (event.altKey) {
              event.preventDefault();
              editor?.chain().focus().setHardBreak().run();
              return true;
            }
            return false; // Shift+Enter, let HardBreak's own "Shift-Enter" keymap handle it.
          }
          if (!onEnterSubmit) return false;
          const in_multiline_block =
            editor?.isActive("bulletList") ||
            editor?.isActive("orderedList") ||
            editor?.isActive("blockquote") ||
            editor?.isActive("codeBlock");
          if (in_multiline_block) return false;
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
        // Upload failed silently — the draft stays usable, the image just doesn't appear.
      }
    };

    const [is_link_modal_open, setIsLinkModalOpen] = useState(false);
    const [link_initial_url, setLinkInitialUrl] = useState("");
    const [link_initial_text, setLinkInitialText] = useState("");
    const [is_editing_existing_link, setIsEditingExistingLink] = useState(false);

    // Mirrors an external reset (e.g. the composer clearing after a
    // successful submit) into the live document — skipped while focused so
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
        applySlashCommand: (action: SlashCommandAction) => {
          if (!editor) return;
          deleteTriggerText(editor);
          const chain = editor.chain().focus();
          if (action.type === "text") chain.insertContent(action.text).run();
          else if (action.type === "mention") chain.insertContent("@").run();
          else if (action.type === "markdown") chain.insertContent(action.markdown, { contentType: "markdown" }).run();
          else if (action.type === "block") {
            if (action.block === "bullet_list") chain.toggleBulletList().run();
            else if (action.block === "ordered_list") chain.toggleOrderedList().run();
            else if (action.block === "quote") chain.toggleBlockquote().run();
            else if (action.block === "code_block") chain.toggleCodeBlock().run();
            else chain.setHorizontalRule().run();
          }
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

    const editor_state = useEditorState({
      editor,
      selector: (context) => ({
        bold: context.editor?.isActive("bold") ?? false,
        italic: context.editor?.isActive("italic") ?? false,
        strike: context.editor?.isActive("strike") ?? false,
        code: context.editor?.isActive("code") ?? false,
        blockquote: context.editor?.isActive("blockquote") ?? false,
        bullet_list: context.editor?.isActive("bulletList") ?? false,
        ordered_list: context.editor?.isActive("orderedList") ?? false,
        link: context.editor?.isActive("link") ?? false,
      }),
    });

    if (!editor) return null;

    const active_state =
      editor_state ??
      { bold: false, italic: false, strike: false, code: false, blockquote: false, bullet_list: false, ordered_list: false, link: false };

    // Opens `InsertLinkModal` prefilled from whatever's under the cursor: the
    // selected text (as the label) and, when the cursor already sits inside
    // an existing link, that link's own href/label (re-selecting its full
    // range first, via `extendMarkRange`, so an empty-selection click inside
    // a link still edits the *whole* link instead of just where the caret
    // happened to land).
    const openLinkModal = () => {
      if (active_state.link) editor.chain().focus().extendMarkRange("link").run();
      const { from, to, empty } = editor.state.selection;
      const selected_text = empty ? "" : editor.state.doc.textBetween(from, to, " ");
      const href = editor.getAttributes("link").href;
      setLinkInitialText(selected_text);
      setLinkInitialUrl(typeof href === "string" ? href : "");
      setIsEditingExistingLink(active_state.link);
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

    const toolbar = (
      <div className="flex items-center gap-0.5 px-[7px] py-[6px]">
        <ToolbarButton label="Bold (Ctrl+B)" active={active_state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
          <BoldIcon size={15} />
        </ToolbarButton>
        <ToolbarButton label="Italic (Ctrl+I)" active={active_state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <ItalicIcon size={15} />
        </ToolbarButton>
        <ToolbarButton label="Strikethrough" active={active_state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <StrikethroughIcon size={15} />
        </ToolbarButton>
        <ToolbarButton label="Link" active={active_state.link} onClick={openLinkModal}>
          <LinkFormatIcon size={15} />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label="Bulleted list"
          active={active_state.bullet_list}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <BulletListIcon size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={active_state.ordered_list}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <NumberedListIcon size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={active_state.blockquote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <QuoteIcon size={15} />
        </ToolbarButton>
        <ToolbarButton label="Code" active={active_state.code} onClick={() => editor.chain().focus().toggleCode().run()}>
          <InlineCodeIcon size={15} />
        </ToolbarButton>
      </div>
    );

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

    if (embedded) {
      return (
        <div>
          {show_toolbar && <div className="border-b border-shell-border">{toolbar}</div>}
          <EditorContent editor={editor} />
          {link_modal}
        </div>
      );
    }

    return (
      <div>
        <div className="mb-1.5">{toolbar}</div>
        <EditorContent editor={editor} />
        {link_modal}
      </div>
    );
  }
);

RichTextComposer.displayName = "RichTextComposer";

export default RichTextComposer;
