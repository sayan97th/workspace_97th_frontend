"use client";
import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
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

export type RichTextComposerRef = {
  /** Inserts raw text (an emoji) at the current cursor position. */
  insertText: (text: string) => void;
  /** Replaces an in-progress trailing `@partial` token with `@Full Name `, or appends it if there's none. */
  insertMentionText: (name: string) => void;
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
  /** When set, plain Enter (no Shift) fires this instead of splitting a new paragraph — used by `CommentEditForm`'s quick "edit in place" box, not the main composer (which is button-submit only). */
  onEnterSubmit?: () => void;
  /** When set, Escape fires this — `CommentEditForm`'s "Cancel". */
  onEscape?: () => void;
  autoFocus?: boolean;
  /** True when rendered inside `CommentComposer`'s own unified Slack-style box — drops this component's own border/padding/rounding so it reads as one continuous container with that parent's action row, and hides the toolbar entirely (the parent renders it via `show_toolbar`). Defaults to false for standalone use (`CommentEditForm`), which keeps its own self-contained bordered box. */
  embedded?: boolean;
  /** Embedded mode only: whether the formatting toolbar row is shown — driven by `CommentComposer`'s "Aa" toggle. */
  show_toolbar?: boolean;
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
      autoFocus,
      embedded = false,
      show_toolbar = true,
    },
    ref
  ) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({ heading: false }),
        Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } }),
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
      },
      editorProps: {
        attributes: {
          class: embedded
            ? `shell-rich-text-editor ${min_height_class} w-full resize-none bg-transparent px-[13px] py-[9px] font-sans text-[13.5px] leading-relaxed text-shell-text outline-none`
            : `shell-rich-text-editor ${min_height_class} w-full resize-none rounded-[11px] border border-shell-border-strong bg-shell-panel px-[13px] py-[9px] font-sans text-[13.5px] leading-relaxed text-shell-text outline-none transition-colors focus:border-[#00c875]`,
        },
        handleKeyDown: (_view, event) => {
          if (event.key === "Enter" && !event.shiftKey && onEnterSubmit) {
            event.preventDefault();
            onEnterSubmit();
            return true;
          }
          if (event.key === "Escape" && onEscape) {
            event.preventDefault();
            onEscape();
            return true;
          }
          return false;
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
