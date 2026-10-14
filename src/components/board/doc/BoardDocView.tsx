"use client";
import React, { useEffect, useState } from "react";
import { ChevronsDown, ChevronsUp, ListTree, Presentation } from "lucide-react";
import PresenceAvatarStack from "@/components/board/PresenceAvatarStack";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import type { BoardViewDto } from "@/types/board-content";
import { DocEditorProvider, DocEditorSurface, DocOutline, DocToolbar, useDocEditor, type DocMember, type DocUploadHandler } from "./editor";
import { serializeDocContent } from "./editor/doc-content";
import { DocMetaRow, DocTitle } from "./DocHeaderParts";
import DocPresentationMode from "./presentation/DocPresentationMode";
import DocSaveIndicator from "./DocSaveIndicator";
import { DOC_OUTLINE_STORAGE_KEY, readDocFlag, writeDocFlag } from "./doc-view-flags";
import { useDocAutosave } from "./useDocAutosave";

export type BoardDocViewProps = {
  view: BoardViewDto;
  /** The board, for the live presence avatars in the toolbar. */
  board_id?: number;
  /** Persists the doc body (editor JSON), called by the debounced autosave. */
  onSaveDocContent: (doc_content: string) => Promise<void>;
  /** Renames the tab from the doc's big title. Omit to show the title read only. */
  onRenameView?: (label: string) => Promise<void>;
  /** Uploads images, videos and files embedded in the doc. Omit to only allow images, inlined as data URLs. */
  onUploadFile?: DocUploadHandler;
  /** People offered by "@" mentions. */
  members?: DocMember[];
  /** False renders the doc read only. */
  editable?: boolean;
  /** Whether the board title row above the tabs is hidden. */
  is_header_collapsed?: boolean;
  /** Shows the "Collapse header" toggle at the end of the toolbar. */
  onToggleHeaderCollapsed?: () => void;
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
              <h1 className="doc-presentation-title">{view.label}</h1>
            </div>
            <DocMetaRow creator={view.creator} created_at={view.created_at} updated_at={updated_at} className="mt-4 mb-10" />
          </>
        }
      />
    </>
  );
};

type DocTabTitleProps = {
  label: string;
  onRename?: (label: string) => Promise<void>;
};

/** The tab's name as the doc's big title. Enter jumps into the body. */
const DocTabTitle: React.FC<DocTabTitleProps> = ({ label, onRename }) => {
  const { editor } = useDocEditor();
  return (
    <DocTitle
      label={label}
      editable={!!onRename}
      onRename={onRename ?? (() => Promise.resolve())}
      onEnter={() => editor?.commands.focus("start")}
      aria_label="Doc tab title"
    />
  );
};

/**
 * The "Doc" board tab, laid out like monday's: the doc toolbar runs edge to
 * edge under the view tabs, the outline toggle sits on the left and the page
 * column holds the tab's name as a big title (renamed in place), the
 * creator/created/updated row and the same Notion style editor as a
 * standalone Doc (`DocPageView`). The toolbar ends with presence, the
 * Presentation mode and a "Collapse header" toggle. The body is stored in
 * the view's `doc_content`; tabs written by the previous markdown editor
 * still load and are saved as editor JSON from their next edit on.
 */
const BoardDocView: React.FC<BoardDocViewProps> = ({
  view,
  board_id,
  onSaveDocContent,
  onRenameView,
  onUploadFile,
  members = [],
  editable = true,
  is_header_collapsed = false,
  onToggleHeaderCollapsed,
}) => {
  const [updated_at, setUpdatedAt] = useState(view.updated_at);
  const [is_outline_open, setIsOutlineOpen] = useState(false);
  const { status, queueSave, flushSave } = useDocAutosave((content) =>
    onSaveDocContent(content).then(() => setUpdatedAt(new Date().toISOString()))
  );

  useEffect(() => {
    setUpdatedAt(view.updated_at);
  }, [view.id, view.updated_at]);

  useEffect(() => {
    setIsOutlineOpen(readDocFlag(DOC_OUTLINE_STORAGE_KEY));
  }, []);

  const toggleOutline = () => {
    setIsOutlineOpen((current) => {
      writeDocFlag(DOC_OUTLINE_STORAGE_KEY, !current);
      return !current;
    });
  };

  const outline_label = is_outline_open ? "Hide outline" : "Show outline";
  const header_label = is_header_collapsed ? "Expand header" : "Collapse header";

  return (
    <div className="doc-theme flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-[var(--doc-page)]">
      <DocEditorProvider
        key={view.id}
        initial_content={view.doc_content}
        onChange={queueSave}
        onBlur={flushSave}
        editable={editable}
        members={members}
        onUploadFile={onUploadFile}
      >
        <DocToolbar
          trailing={
            <>
              <DocSaveIndicator status={status} onRetry={flushSave} />
              <DocTabPresentButton view={view} updated_at={updated_at} />
              {board_id != null && <PresenceAvatarStack board_id={board_id} />}
              {onToggleHeaderCollapsed && (
                <button
                  type="button"
                  className={`doc-icon-button${is_header_collapsed ? " is-active" : ""}`}
                  aria-label={header_label}
                  title={header_label}
                  aria-pressed={is_header_collapsed}
                  onClick={onToggleHeaderCollapsed}
                >
                  {is_header_collapsed ? <ChevronsDown size={18} /> : <ChevronsUp size={18} />}
                </button>
              )}
            </>
          }
        />

        <div className="relative flex min-h-0 flex-1">
          <aside className={`doc-print-hidden flex flex-none flex-col items-start pt-6 pl-4 ${is_outline_open ? "border-r border-[var(--doc-border)]" : ""}`}>
            <Tooltip content={outline_label} placement="right" className="flex">
              <button
                type="button"
                className={`doc-icon-button${is_outline_open ? " is-active" : ""}`}
                aria-label={outline_label}
                aria-pressed={is_outline_open}
                onClick={toggleOutline}
              >
                <ListTree size={18} />
              </button>
            </Tooltip>
            {is_outline_open && <DocOutline />}
          </aside>

          <div className="shell-scrollbar min-w-0 flex-1 overflow-y-auto pb-24">
            <div className="mx-auto w-full max-w-[860px] px-6 pt-10 sm:px-16">
              <DocTabTitle label={view.label} onRename={onRenameView} />
              <DocMetaRow creator={view.creator} created_at={view.created_at} updated_at={updated_at} className="mt-4 mb-8" />
              <DocEditorSurface />
            </div>
          </div>
        </div>
      </DocEditorProvider>
    </div>
  );
};

export default BoardDocView;
