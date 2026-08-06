"use client";
import React from "react";
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  codeBlockPlugin,
  codeMirrorPlugin,
  CreateLink,
  diffSourcePlugin,
  DiffSourceToggleWrapper,
  headingsPlugin,
  imagePlugin,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  linkDialogPlugin,
  linkPlugin,
  ListsToggle,
  listsPlugin,
  markdownShortcutPlugin,
  MDXEditor,
  quotePlugin,
  Separator,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
  type MDXEditorMethods,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import "./board-doc-editor.css";
import { markdownFidelityPlugin } from "./markdown-fidelity-plugin";

export type BoardDocEditorProps = {
  /** The document's markdown. Only read on mount/remount — pass a `key` at the call site (e.g. the view id) to load a different document. */
  markdown: string;
  /**
   * Fired on every content change with the editor's current markdown. Not
   * throttled — the caller owns debouncing (e.g. autosave). `is_initial_normalize`
   * is true for the one-off change MDXEditor fires right after mount while
   * normalizing the initial markdown (whitespace, bullet symbols, …) — not a
   * real edit, so callers driving a "dirty"/autosave flag should ignore it.
   */
  onChange: (markdown: string, is_initial_normalize: boolean) => void;
  onBlur?: () => void;
  placeholder?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  /** Imperative access (e.g. `.focus()`) for the rare caller that needs it. */
  editor_ref?: React.Ref<MDXEditorMethods>;
};

/**
 * Notion-style freeform markdown editor built on `@mdxeditor/editor` —
 * WYSIWYG editing backed by plain markdown source, so content stays portable
 * (readable/writable by future AI-generated content, exports, etc.) instead
 * of a proprietary rich-text format. Generic over any markdown string, so any
 * future board view kind that needs long-form text editing (not just `doc`)
 * can reuse this directly instead of the Doc-specific chrome in `BoardDocView`.
 *
 * Theming is handled globally in `board-doc-editor.css`, which repoints the
 * editor's own CSS variables at the workspace shell's design tokens — it
 * needs no dark-mode prop here because those tokens already flip under the
 * shell's `.dark` class.
 */
const BoardDocEditor: React.FC<BoardDocEditorProps> = ({
  markdown,
  onChange,
  onBlur,
  placeholder = "Start writing…",
  readOnly = false,
  autoFocus = false,
  editor_ref,
}) => {
  return (
    <MDXEditor
      ref={editor_ref}
      markdown={markdown}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      readOnly={readOnly}
      autoFocus={autoFocus}
      className="board-doc-editor"
      contentEditableClassName="board-doc-editor-content"
      plugins={[
        markdownFidelityPlugin(),
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        imagePlugin(),
        tablePlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: "text" }),
        codeMirrorPlugin({
          codeBlockLanguages: {
            text: "Plain text",
            js: "JavaScript",
            ts: "TypeScript",
            tsx: "TSX",
            css: "CSS",
            html: "HTML",
            php: "PHP",
            json: "JSON",
            bash: "Bash",
            sql: "SQL",
          },
        }),
        diffSourcePlugin({ viewMode: "rich-text" }),
        markdownShortcutPlugin(),
        toolbarPlugin({
          toolbarContents: () => (
            <DiffSourceToggleWrapper>
              <UndoRedo />
              <Separator />
              <BlockTypeSelect />
              <Separator />
              <BoldItalicUnderlineToggles />
              <CodeToggle />
              <Separator />
              <ListsToggle />
              <Separator />
              <CreateLink />
              <InsertImage />
              <InsertTable />
              <InsertThematicBreak />
              <InsertCodeBlock />
            </DiffSourceToggleWrapper>
          ),
        }),
      ]}
    />
  );
};

export default BoardDocEditor;
