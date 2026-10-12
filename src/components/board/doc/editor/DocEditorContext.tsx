"use client";
import "./doc-editor.css";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Editor, Range } from "@tiptap/core";
import { useEditor } from "@tiptap/react";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { buildDocExtensions } from "./extensions/doc-extensions";
import type { DocMember } from "./extensions/doc-mention";
import { runDocBlock, type DocBlock } from "./doc-blocks";
import { parseDocContent, serializeDocContent } from "./doc-content";
import { createSuggestionStore, type SuggestionStore } from "./suggestion-store";
import { insertFiles, type DocMediaRequest, type DocUploadHandler } from "./upload-media";
import DocMediaDialog from "./menus/DocMediaDialog";

type DocEditorContextValue = {
  editor: Editor | null;
  editable: boolean;
  slash_store: SuggestionStore<DocBlock>;
  mention_store: SuggestionStore<DocMember>;
  /** Opens the Image/Video/Audio/File/Web bookmark dialog, it inserts at the caret. */
  openMedia: (kind: DocMediaRequest) => void;
  /** Runs a block from the catalog at the caret (the toolbar's "+ Add", the block handle). */
  runBlock: (block: DocBlock) => void;
  /** Uploads and inserts files at the caret, or at `position`. */
  addFiles: (files: File[], position?: number) => void;
  can_upload: boolean;
};

const DocEditorContext = createContext<DocEditorContextValue | null>(null);

export const useDocEditor = (): DocEditorContextValue => {
  const context = useContext(DocEditorContext);
  if (!context) throw new Error("useDocEditor must be used within a DocEditorProvider");
  return context;
};

export type DocEditorProviderProps = {
  /** The stored body (editor JSON, or markdown from older docs). Only read on mount, pass a `key` to load another doc. */
  initial_content: string | null;
  /** Fired on every edit with the serialized JSON document. The caller debounces. */
  onChange: (content: string) => void;
  onBlur?: () => void;
  editable?: boolean;
  /** People offered by "@". Read on every keystroke, so it may load after mount. */
  members?: DocMember[];
  /** Uploads embedded files. Without it only images can be added, inlined as data URLs. */
  onUploadFile?: DocUploadHandler;
  children: React.ReactNode;
};

/**
 * Owns one Notion style doc editor (Tiptap) and shares it with the pieces
 * around it: the toolbar (`DocToolbar`), the writing surface
 * (`DocEditorSurface`, with the "/" menu, "@" menu, block handle and
 * bubble menus) and the outline (`DocOutline`). Splitting them through
 * context lets each page place the toolbar where its layout needs it.
 */
export const DocEditorProvider: React.FC<DocEditorProviderProps> = ({
  initial_content,
  onChange,
  onBlur,
  editable = true,
  members = [],
  onUploadFile,
  children,
}) => {
  const toast = useToast();
  const [slash_store] = useState(() => createSuggestionStore<DocBlock>());
  const [mention_store] = useState(() => createSuggestionStore<DocMember>());
  const [media_request, setMediaRequest] = useState<DocMediaRequest | null>(null);

  // The editor is built once, so everything it calls back into is read through refs.
  const on_change_ref = useRef(onChange);
  const on_blur_ref = useRef(onBlur);
  const members_ref = useRef(members);
  const upload_ref = useRef(onUploadFile);
  const editor_ref = useRef<Editor | null>(null);
  useEffect(() => {
    on_change_ref.current = onChange;
    on_blur_ref.current = onBlur;
    members_ref.current = members;
    upload_ref.current = onUploadFile;
  });

  const showError = (message: string) => toast.error(message);

  const addFiles = (files: File[], position?: number) => {
    const editor = editor_ref.current;
    if (!editor || files.length === 0) return;
    insertFiles(editor, files, upload_ref.current, showError, position);
  };

  const [extensions] = useState(() =>
    buildDocExtensions({
      slash_store,
      mention_store,
      getMembers: () => members_ref.current,
      onSlashSelect: (block: DocBlock, range: Range) => {
        const editor = editor_ref.current;
        if (editor) runDocBlock(block, { editor, openMedia: setMediaRequest }, range);
      },
      onFiles: (files, position) => addFiles(files, position ?? undefined),
    })
  );

  const [parsed_content] = useState(() => parseDocContent(initial_content));

  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    editable,
    content: parsed_content.kind === "json" ? parsed_content.json : parsed_content.kind === "markdown" ? parsed_content.markdown : "",
    contentType: parsed_content.kind === "markdown" ? "markdown" : "json",
    editorProps: {
      attributes: { class: "doc-editor-content", spellcheck: "true" },
    },
    onUpdate: ({ editor: current_editor }) => on_change_ref.current(serializeDocContent(current_editor.getJSON())),
    onBlur: () => on_blur_ref.current?.(),
  });

  useEffect(() => {
    editor_ref.current = editor;
  }, [editor]);

  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable);
  }, [editor, editable]);

  const value: DocEditorContextValue = {
    editor,
    editable,
    slash_store,
    mention_store,
    openMedia: setMediaRequest,
    runBlock: (block) => {
      if (editor) runDocBlock(block, { editor, openMedia: setMediaRequest });
    },
    addFiles,
    can_upload: Boolean(onUploadFile),
  };

  return (
    <DocEditorContext.Provider value={value}>
      {children}
      <DocMediaDialog
        editor={editor}
        kind={media_request}
        can_upload={Boolean(onUploadFile)}
        onClose={() => setMediaRequest(null)}
        onFiles={(files) => addFiles(files)}
      />
    </DocEditorContext.Provider>
  );
};
