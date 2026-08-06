"use client";
import React, { useEffect, useRef, useState } from "react";
import UserAvatar from "@/components/common/UserAvatar";
import { ClockIcon, CheckIcon } from "@/icons/workspace-icons";
import type { BoardViewDto } from "@/types/board-content";
import InlineTitleEditor from "../InlineTitleEditor";
import BoardDocEditor from "./BoardDocEditor";

export type BoardDocViewProps = {
  view: BoardViewDto;
  onRenameView: (label: string) => void;
  /** Persists the doc's markdown — called by the debounced autosave below. */
  onSaveDocContent: (doc_content: string) => Promise<void>;
};

const AUTOSAVE_DELAY_MS = 800;

const formatDateTime = (value: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

type SaveStatus = "idle" | "saving" | "saved";

/**
 * The "Doc" board view — a Notion-style freeform document tab: a header with
 * the (renamable) title plus creator/created/updated metadata, and a
 * markdown editor (`BoardDocEditor`) below it. Owns the autosave debounce so
 * `TableBoardView` only has to supply persistence (`onSaveDocContent`) and a
 * rename callback; everything content-shaped lives here and in the reusable
 * `BoardDocEditor`, which any future long-form-text view can reuse on its own.
 */
const BoardDocView: React.FC<BoardDocViewProps> = ({ view, onRenameView, onSaveDocContent }) => {
  const [is_editing_title, setIsEditingTitle] = useState(false);
  const [save_status, setSaveStatus] = useState<SaveStatus>("idle");

  const save_timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest_content_ref = useRef(view.doc_content ?? "");
  const dirty_since_save_ref = useRef(false);

  const flushSave = () => {
    if (save_timeout_ref.current) clearTimeout(save_timeout_ref.current);
    if (!dirty_since_save_ref.current) return;
    dirty_since_save_ref.current = false;
    setSaveStatus("saving");
    void onSaveDocContent(latest_content_ref.current).then(() => setSaveStatus("saved"));
  };

  // A different tab (a different `view.id`) is a different document. Flushes
  // — rather than discards — any pending debounced autosave from the tab
  // just left (or on unmount), so a fast tab switch right after typing can't
  // silently drop the last edit; `flushSave` here is the closure captured
  // from the render this effect last ran in, so it still targets the
  // *previous* view's id and `onSaveDocContent`, not the newly active one.
  useEffect(() => {
    latest_content_ref.current = view.doc_content ?? "";
    dirty_since_save_ref.current = false;
    setSaveStatus("idle");
    return () => flushSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.id]);

  const handleChange = (markdown: string, is_initial_normalize: boolean) => {
    latest_content_ref.current = markdown;
    // MDXEditor fires one change on mount while normalizing the initial
    // markdown — not a real edit, so it shouldn't trigger a save or flip the
    // status indicator to "Saving…" on every tab open.
    if (is_initial_normalize) return;
    dirty_since_save_ref.current = true;
    setSaveStatus("saving");
    if (save_timeout_ref.current) clearTimeout(save_timeout_ref.current);
    save_timeout_ref.current = setTimeout(flushSave, AUTOSAVE_DELAY_MS);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-24">
      <div className="flex flex-col gap-2 px-1">
        {is_editing_title ? (
          <InlineTitleEditor
            value={view.label}
            onCommit={(label) => {
              onRenameView(label);
              setIsEditingTitle(false);
            }}
            onCancel={() => setIsEditingTitle(false)}
            className="w-full max-w-xl text-[28px] font-bold text-shell-text"
            aria_label="Document title"
          />
        ) : (
          <h1
            onClick={() => setIsEditingTitle(true)}
            className="w-fit cursor-text rounded-[6px] px-1 -mx-1 text-[28px] font-bold text-shell-text transition-colors hover:bg-shell-hover"
            title="Click to rename"
          >
            {view.label}
          </h1>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px] text-shell-text-muted">
          <span className="flex items-center gap-1.5">
            <UserAvatar user={view.creator} size={20} font_size={9} />
            Creator <span className="font-semibold text-shell-text-secondary">{view.creator?.full_name ?? "Unknown"}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <ClockIcon size={13} />
            Created <span className="font-semibold text-shell-text-secondary">{formatDateTime(view.created_at)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <ClockIcon size={13} />
            Last updated <span className="font-semibold text-shell-text-secondary">{formatDateTime(view.updated_at)}</span>
          </span>
          <span className="ml-auto flex items-center gap-1 text-[12px]">
            {save_status === "saving" && <span className="text-shell-text-faint">Saving…</span>}
            {save_status === "saved" && (
              <span className="flex items-center gap-1 text-shell-text-faint">
                <CheckIcon size={11} /> Saved
              </span>
            )}
          </span>
        </div>
      </div>

      <BoardDocEditor
        key={view.id}
        markdown={view.doc_content ?? ""}
        onChange={handleChange}
        onBlur={flushSave}
        placeholder="Start writing… type “/” for formatting, or just start typing Markdown like # or -."
      />
    </div>
  );
};

export default BoardDocView;
