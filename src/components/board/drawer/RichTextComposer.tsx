"use client";
import React, { forwardRef, useEffect, useImperativeHandle } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import TiptapImage from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { inlineUploadService } from "@/services/inline-upload.service";

export type RichTextComposerRef = {
  /** Inserts raw text (an emoji) at the current cursor position. */
  insertText: (text: string) => void;
  /** Replaces an in-progress trailing `@partial` token with `@Full Name `, or appends it if there's none. */
  insertMentionText: (name: string) => void;
  focus: () => void;
  isEmpty: () => boolean;
};

export type RichTextComposerProps = {
  /** The body as HTML — only pushed into the live editor when it differs and the editor isn't focused, so external resets (clearing after submit) never fight the user's own typing. */
  value: string;
  onChange: (html: string) => void;
  /** Plain-text mirror of every keystroke, for the parent's `@mention` trigger detection. */
  onPlainTextChange?: (text: string) => void;
  placeholder: string;
  min_height_class?: string;
  /** When set, plain Enter (no Shift) fires this instead of splitting a new paragraph — used by `CommentEditForm`'s quick "edit in place" box, not the main composer (which is button-submit only). */
  onEnterSubmit?: () => void;
  /** When set, Escape fires this — `CommentEditForm`'s "Cancel". */
  onEscape?: () => void;
  autoFocus?: boolean;
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
    className={`flex h-6 w-6 items-center justify-center rounded-md text-[12px] font-bold transition-colors ${
      active ? "bg-shell-hover-strong text-shell-text" : "text-shell-text-muted hover:bg-shell-hover hover:text-shell-text"
    }`}
  >
    {children}
  </button>
);

/**
 * Tiptap-backed rich text editor used by `CommentComposer` in place of a
 * plain `<textarea>` — bold/italic/lists/links, plus uploading a
 * pasted/dropped image straight into the body via `inlineUploadService`.
 * `@mention` autocomplete and emoji insertion stay owned by the parent
 * drawer hook (`mention_target`/`emoji_palette_target`), which drives this
 * component purely through the imperative ref: picking a mention or emoji
 * calls {@link RichTextComposerRef.insertMentionText}/`insertText` here
 * rather than mutating the HTML string directly, since only the live editor
 * instance knows where the cursor actually is.
 */
const RichTextComposer = forwardRef<RichTextComposerRef, RichTextComposerProps>(
  ({ value, onChange, onPlainTextChange, placeholder, min_height_class = "min-h-16", onEnterSubmit, onEscape, autoFocus }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({ heading: false }),
        Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } }),
        TiptapImage,
        Placeholder.configure({ placeholder }),
      ],
      content: value || "",
      immediatelyRender: false,
      autofocus: autoFocus ? "end" : false,
      onUpdate: ({ editor: current_editor }) => {
        onChange(current_editor.getHTML());
        onPlainTextChange?.(current_editor.getText());
      },
      editorProps: {
        attributes: {
          class: `shell-rich-text-editor ${min_height_class} w-full resize-none rounded-[11px] border border-shell-border-strong bg-shell-panel px-[13px] py-[9px] font-sans text-[13.5px] leading-relaxed text-shell-text outline-none transition-colors focus:border-[#00c875]`,
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

    // Mirrors an external reset (e.g. the composer clearing after a
    // successful submit) into the live document — skipped while focused so
    // a live keystroke can never be clobbered by a stale `value` prop.
    useEffect(() => {
      if (!editor || editor.isFocused) return;
      if (value === editor.getHTML()) return;
      editor.commands.setContent(value || "", { emitUpdate: false });
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
        bullet_list: context.editor?.isActive("bulletList") ?? false,
        ordered_list: context.editor?.isActive("orderedList") ?? false,
        link: context.editor?.isActive("link") ?? false,
      }),
    });

    if (!editor) return null;

    const active_state = editor_state ?? { bold: false, italic: false, bullet_list: false, ordered_list: false, link: false };

    const toggleLink = () => {
      if (active_state.link) {
        editor.chain().focus().unsetLink().run();
        return;
      }
      const url = window.prompt("Link URL");
      if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    };

    return (
      <div>
        <div className="mb-1.5 flex items-center gap-0.5">
          <ToolbarButton label="Bold" active={active_state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
            B
          </ToolbarButton>
          <ToolbarButton label="Italic" active={active_state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <span className="italic">I</span>
          </ToolbarButton>
          <ToolbarButton
            label="Bullet list"
            active={active_state.bullet_list}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            •
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={active_state.ordered_list}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1.
          </ToolbarButton>
          <ToolbarButton label="Link" active={active_state.link} onClick={toggleLink}>
            🔗
          </ToolbarButton>
        </div>
        <EditorContent editor={editor} />
      </div>
    );
  }
);

RichTextComposer.displayName = "RichTextComposer";

export default RichTextComposer;
