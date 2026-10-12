"use client";
import React, { useEffect, useState } from "react";
import { CalendarPlus, Clock } from "lucide-react";
import UserAvatar from "@/components/common/UserAvatar";
import type { BoardViewDto } from "@/types/board-content";
import { DocEditorProvider, DocEditorSurface, DocToolbar, type DocMember, type DocUploadHandler } from "./editor";
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

const formatDateTime = (value: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
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
          <DocToolbar trailing={<DocSaveIndicator status={status} onRetry={flushSave} />} />
        </div>
        <div className="mx-auto w-full max-w-[860px] px-6 pt-6 sm:px-16">
          <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13.5px] text-[var(--doc-text-secondary)]">
            <span className="flex items-center gap-2">
              <UserAvatar user={view.creator} size={20} font_size={9} />
              Creator <span className="font-semibold text-[var(--doc-text)]">{view.creator?.full_name ?? "Unknown"}</span>
            </span>
            <span className="flex items-center gap-2">
              <CalendarPlus size={15} aria-hidden="true" />
              Created <span className="font-semibold text-[var(--doc-text)]">{formatDateTime(view.created_at)}</span>
            </span>
            <span className="flex items-center gap-2">
              <Clock size={15} aria-hidden="true" />
              Last updated <span className="font-semibold text-[var(--doc-text)]">{formatDateTime(updated_at)}</span>
            </span>
          </div>
          <DocEditorSurface />
        </div>
      </DocEditorProvider>
    </div>
  );
};

export default BoardDocView;
