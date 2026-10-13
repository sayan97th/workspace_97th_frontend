"use client";
import React, { useEffect, useState } from "react";
import { Presentation } from "lucide-react";
import type { BoardViewDto } from "@/types/board-content";
import { DocEditorProvider, DocEditorSurface, DocToolbar, useDocEditor, type DocMember, type DocUploadHandler } from "./editor";
import { serializeDocContent } from "./editor/doc-content";
import { DocMetaRow, DocTypeIcon } from "./DocHeaderParts";
import DocPresentationMode from "./presentation/DocPresentationMode";
import DocSaveIndicator from "./DocSaveIndicator";
import { useDocAutosave } from "./useDocAutosave";

export type BoardDocViewProps = {
  view: BoardViewDto;
  /** Persists the doc body (editor JSON), called by the debounced autosave. */
  onSaveDocContent: (doc_content: string) => Promise<void>;
  /** Uploads images, videos and files embedded in the doc. Omit to only allow images, inlined as data URLs. */
  onUploadFile?: DocUploadHandler;
  /** People offered by "@" mentions. */
  members?: DocMember[];
  /** False renders the doc read only. */
  editable?: boolean;
};

type DocTabPresentButtonProps = {
  view: BoardViewDto;
  updated_at: string | null;
};

/** The tab's "Presentation" button, inside the editor provider so it can snapshot the current body. */
const DocTabPresentButton: React.FC<DocTabPresentButtonProps> = ({ view, updated_at }) => {
  const { editor } = useDocEditor();
  const [content, setContent] = useState<string | null>(null);
  const [is_presenting, setIsPresenting] = useState(false);

  return (
    <>
      <button
        type="button"
        className="doc-icon-button"
        aria-label="Presentation"
        title="Presentation"
        onClick={() => {
          setContent(editor ? serializeDocContent(editor.getJSON()) : view.doc_content);
          setIsPresenting(true);
        }}
      >
        <Presentation size={18} />
      </button>
      <DocPresentationMode
        is_open={is_presenting}
        onClose={() => setIsPresenting(false)}
        content={content}
        heading={
          <>
            <div className="doc-presentation-title-row">
              <DocTypeIcon size={26} />
              <h1 className="doc-presentation-title">{view.label}</h1>
            </div>
            <DocMetaRow creator={view.creator} created_at={view.created_at} updated_at={updated_at} className="mt-4 mb-10" />
          </>
        }
      />
    </>
  );
};

/**
 * The "Doc" board tab: the same Notion style editor as a standalone Doc
 * (`DocPageView`), under a slim creator/created/updated row (the tab's own
 * label is its title). Stored in the view's `doc_content`; tabs written by
 * the previous markdown editor still load and are saved as editor JSON
 * from their next edit on.
 */
const BoardDocView: React.FC<BoardDocViewProps> = ({ view, onSaveDocContent, onUploadFile, members = [], editable = true }) => {
  const [updated_at, setUpdatedAt] = useState(view.updated_at);
  const { status, queueSave, flushSave } = useDocAutosave((content) =>
    onSaveDocContent(content).then(() => setUpdatedAt(new Date().toISOString()))
  );

  useEffect(() => {
    setUpdatedAt(view.updated_at);
  }, [view.id, view.updated_at]);

  return (
    <div className="doc-theme flex w-full flex-col overflow-hidden rounded-lg border border-[var(--doc-border)] bg-[var(--doc-surface)]">
      <DocEditorProvider
        key={view.id}
        initial_content={view.doc_content}
        onChange={queueSave}
        onBlur={flushSave}
        editable={editable}
        members={members}
        onUploadFile={onUploadFile}
      >
        <div className="sticky top-0 z-10">
          <DocToolbar
            trailing={
              <>
                <DocSaveIndicator status={status} onRetry={flushSave} />
                <DocTabPresentButton view={view} updated_at={updated_at} />
              </>
            }
          />
        </div>
        <div className="mx-auto w-full max-w-[860px] px-6 pt-6 sm:px-16">
          <DocMetaRow creator={view.creator} created_at={view.created_at} updated_at={updated_at} className="mb-6" />
          <DocEditorSurface />
        </div>
      </DocEditorProvider>
    </div>
  );
};

export default BoardDocView;
