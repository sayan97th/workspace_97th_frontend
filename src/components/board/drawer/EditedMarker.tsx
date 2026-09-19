"use client";
import React, { useRef, useState } from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import { formatRelativeTime } from "./commentMapping";
import RichTextContent from "./RichTextContent";
import type { DrawerCommentRevision } from "./types";

export type EditedMarkerProps = {
  /** Loads the earlier versions when the marker is opened. Omit for a board with no history, and the marker stays a plain label. */
  onLoadRevisions?: () => Promise<DrawerCommentRevision[]>;
  /** ISO time of the last edit, shown in the marker's tooltip. */
  edited_at?: string;
};

type LoadState = { status: "idle" } | { status: "loading" } | { status: "error" } | { status: "ready"; revisions: DrawerCommentRevision[] };

const formatFullTime = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

/**
 * The "(edited)" label on a comment or reply. Given a way to load history it is
 * a button: opening it lists the earlier versions, newest edit first, each with
 * when it was written, when it was replaced and by whom. The list is fetched
 * each time the popover opens, so it never shows a stale history.
 */
const EditedMarker: React.FC<EditedMarkerProps> = ({ onLoadRevisions, edited_at }) => {
  const trigger_ref = useRef<HTMLButtonElement>(null);
  const [is_open, setIsOpen] = useState(false);
  const [state, setState] = useState<LoadState>({ status: "idle" });

  const label_class = "text-[11px] text-shell-text-faint";
  if (!onLoadRevisions) return <span className={label_class}>(edited)</span>;

  const open = () => {
    setIsOpen(true);
    setState({ status: "loading" });
    onLoadRevisions()
      .then((revisions) => setState({ status: "ready", revisions }))
      .catch(() => setState({ status: "error" }));
  };

  return (
    <>
      <button
        ref={trigger_ref}
        type="button"
        onClick={() => (is_open ? setIsOpen(false) : open())}
        aria-haspopup="dialog"
        aria-expanded={is_open}
        title={edited_at ? `Edited ${formatFullTime(edited_at)}. Show earlier versions` : "Show earlier versions"}
        className={`${label_class} underline decoration-dotted underline-offset-2 hover:text-shell-text-secondary`}
      >
        (edited)
      </button>
      <BoardPopover anchor_el={trigger_ref.current} is_open={is_open} onClose={() => setIsOpen(false)} width={360} align="start">
        <div className="p-3">
          <div className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-shell-text-faint">Earlier versions</div>
          {state.status === "loading" && <p className="text-[12.5px] text-shell-text-muted">Loading…</p>}
          {state.status === "error" && <p className="text-[12.5px] font-semibold text-[#e2445c]">Couldn&apos;t load the history. Please try again.</p>}
          {state.status === "ready" && state.revisions.length === 0 && (
            <p className="text-[12.5px] text-shell-text-muted">No earlier versions were saved for this edit.</p>
          )}
          {state.status === "ready" && state.revisions.length > 0 && (
            <ol className="shell-scrollbar flex max-h-[320px] flex-col gap-2.5 overflow-y-auto">
              {state.revisions.map((revision) => (
                <li key={revision.id} className="rounded-[10px] border border-shell-border bg-shell-panel-alt px-3 py-2.5">
                  <div className="mb-1.5 text-[11px] text-shell-text-faint">
                    {revision.written_at ? `Written ${formatFullTime(revision.written_at)}, ` : ""}
                    replaced {formatRelativeTime(revision.replaced_at)}
                    {revision.editor ? ` by ${revision.editor.name}` : ""}
                  </div>
                  <RichTextContent html={revision.body} className="text-[12.5px] leading-[1.5] text-shell-text-secondary" />
                </li>
              ))}
            </ol>
          )}
        </div>
      </BoardPopover>
    </>
  );
};

export default EditedMarker;
