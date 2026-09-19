"use client";
import React, { useEffect, useRef, useState } from "react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import { BookmarkIcon, CloseIcon } from "@/icons/workspace-icons";
import { useSavedReplies } from "@/hooks/useSavedReplies";
import { markdownToPlainText } from "./commentFilters";
import type { SavedReplyDto } from "@/services/saved-replies.service";

export type SavedRepliesMenuProps = {
  /** The composer's current draft (Markdown), offered as the body of a new saved reply. */
  draft: string;
  /** Puts a saved reply's body into the composer. */
  onInsert: (reply: SavedReplyDto) => void;
  /** Size of the trigger's icon, matching the composer's other toolbar buttons. */
  icon_size?: number;
};

const MAX_TITLE_LENGTH = 60;

/**
 * The composer toolbar's "Saved replies" button: a popover listing the user's
 * reusable templates (click one to insert it, "x" to delete it) with a small
 * form to save the current draft as a new one. Every composer shares one list,
 * see {@link useSavedReplies}.
 */
const SavedRepliesMenu: React.FC<SavedRepliesMenuProps> = ({ draft, onInsert, icon_size = 16 }) => {
  const trigger_ref = useRef<HTMLButtonElement>(null);
  const { saved_replies, ensureLoaded, saveReply, deleteReply } = useSavedReplies();
  const [is_open, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [is_saving, setIsSaving] = useState(false);
  const has_draft = markdownToPlainText(draft) !== "";

  useEffect(() => {
    if (is_open) ensureLoaded();
  }, [is_open, ensureLoaded]);

  const close = () => {
    setIsOpen(false);
    setError(null);
  };

  const insert = (reply: SavedReplyDto) => {
    onInsert(reply);
    close();
  };

  const saveDraft = async () => {
    const trimmed = title.trim();
    if (!trimmed || !has_draft || is_saving) return;
    setIsSaving(true);
    setError(null);
    try {
      await saveReply({ title: trimmed, body: draft.trim() });
      setTitle("");
    } catch {
      setError("Couldn't save this reply. You can keep up to 50 saved replies.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        ref={trigger_ref}
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label="Saved replies"
        aria-haspopup="dialog"
        aria-expanded={is_open}
        title="Saved replies"
        className={`flex h-[30px] w-[30px] items-center justify-center rounded-lg hover:bg-shell-hover hover:text-shell-text ${
          is_open ? "bg-shell-hover text-shell-text" : "text-shell-text-muted"
        }`}
      >
        <BookmarkIcon size={icon_size - 2} />
      </button>
      <BoardPopover anchor_el={trigger_ref.current} is_open={is_open} onClose={close} width={300} align="start">
        <div className="p-2">
          <div className="px-2 pb-1 pt-1 text-[10.5px] font-bold uppercase tracking-wide text-shell-text-faint">Saved replies</div>
          {saved_replies.length === 0 ? (
            <p className="px-2 py-2 text-[12.5px] text-shell-text-muted">
              Nothing saved yet. Write a reply you use often, name it below and it will be one click away.
            </p>
          ) : (
            <ul className="shell-scrollbar max-h-[220px] overflow-y-auto">
              {saved_replies.map((reply) => (
                <li key={reply.id} className="group flex items-center gap-1 rounded-lg hover:bg-shell-hover">
                  <button type="button" onClick={() => insert(reply)} className="min-w-0 flex-1 px-2.5 py-1.5 text-left">
                    <span className="block truncate text-[12.5px] font-semibold text-shell-text">{reply.title}</span>
                    <span className="block truncate text-[11.5px] text-shell-text-faint">{markdownToPlainText(reply.body)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteReply(reply.id)}
                    aria-label={`Delete the ${reply.title} saved reply`}
                    className="mr-1 flex h-6 w-6 flex-none items-center justify-center rounded-md text-shell-text-faint opacity-0 transition-opacity hover:text-shell-text focus:opacity-100 group-hover:opacity-100"
                  >
                    <CloseIcon size={11} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void saveDraft();
            }}
            className="mt-1 border-t border-shell-border px-1 pt-2"
          >
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={MAX_TITLE_LENGTH}
                disabled={!has_draft}
                placeholder={has_draft ? "Name this reply" : "Write a draft to save it"}
                aria-label="Saved reply name"
                className="min-w-0 flex-1 rounded-[8px] border border-shell-border bg-shell-panel-alt px-2.5 py-1.5 text-[12.5px] text-shell-text placeholder:text-shell-text-muted focus:border-[#00c875] focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!has_draft || title.trim() === "" || is_saving}
                className="flex-none rounded-[8px] bg-[#00c875] px-3 py-1.5 text-[12px] font-bold text-[#04241a] transition-colors hover:bg-[#00e084] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save
              </button>
            </div>
            {error && <p className="mt-1.5 text-[11.5px] font-semibold text-[#e2445c]">{error}</p>}
          </form>
        </div>
      </BoardPopover>
    </>
  );
};

export default SavedRepliesMenu;
